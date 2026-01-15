/**
 * Enhanced Queue Persistence with Atomic Writes and Backups
 * 
 * Features:
 * - Atomic file writes (temp file + rename)
 * - Automatic backups
 * - Retry logic
 * - Corruption recovery
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import HardwareConfig from "../config/hardware.config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "../../data");
const QUEUE_FILE_PATH = path.join(DATA_DIR, "queue.json");
const BACKUP_DIR = path.join(DATA_DIR, "backups");

// Ensure directories exist
const ensureDirectories = async () => {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    if (HardwareConfig.QUEUE.PERSISTENCE.BACKUP_ENABLED) {
      await fs.mkdir(BACKUP_DIR, { recursive: true });
    }
  } catch (error) {
    console.error("[QueuePersistence] Error creating directories:", error);
  }
};

// Initialize directories
ensureDirectories();

/**
 * Load queue from persistent storage with corruption recovery
 * @returns {Promise<Array>} Queue items array
 */
export async function loadQueue() {
  const { RETRY_ATTEMPTS = 3 } = HardwareConfig.QUEUE.PROCESSING;

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      const data = await fs.readFile(QUEUE_FILE_PATH, "utf-8");
      const parsed = JSON.parse(data);
      
      // Validate structure
      if (!parsed.items || !Array.isArray(parsed.items)) {
        throw new Error("Invalid queue file structure");
      }
      
      console.log(`[QueuePersistence] Loaded ${parsed.items.length} items`);
      return parsed.items;
    } catch (error) {
      if (error.code === "ENOENT") {
        // File doesn't exist yet, return empty array
        console.log("[QueuePersistence] Queue file not found, initializing empty queue");
        return [];
      }

      console.error(`[QueuePersistence] Error loading queue (attempt ${attempt}/${RETRY_ATTEMPTS}):`, error.message);

      // Try to recover from backup
      if (attempt === RETRY_ATTEMPTS) {
        console.log("[QueuePersistence] Attempting to recover from backup...");
        const recovered = await recoverFromBackup();
        if (recovered) {
          return recovered;
        }
        
        console.error("[QueuePersistence] Failed to load queue, returning empty array");
        return [];
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }

  return [];
}

/**
 * Save queue to persistent storage with atomic write
 * @param {Array} items - Queue items to save
 * @returns {Promise<void>}
 */
export async function saveQueue(items) {
  const { RETRY_ATTEMPTS = 2, RETRY_DELAY = 1000 } = HardwareConfig.QUEUE.PROCESSING;
  const { BACKUP_ENABLED, MAX_BACKUPS } = HardwareConfig.QUEUE.PERSISTENCE;

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      const data = {
        items,
        lastUpdated: new Date().toISOString(),
        version: "1.0",
        itemCount: items.length,
      };

      // Create backup before overwriting (if enabled and file exists)
      if (BACKUP_ENABLED) {
        try {
          await fs.access(QUEUE_FILE_PATH);
          await createBackup();
        } catch (error) {
          // File doesn't exist yet, no backup needed
        }
      }

      // Atomic write: write to temp file, then rename
      const tempPath = `${QUEUE_FILE_PATH}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(data, null, 2), "utf-8");
      await fs.rename(tempPath, QUEUE_FILE_PATH);

      console.log(`[QueuePersistence] ✅ Saved ${items.length} items atomically`);

      // Cleanup old backups
      if (BACKUP_ENABLED) {
        await cleanupOldBackups(MAX_BACKUPS);
      }

      return;
    } catch (error) {
      console.error(
        `[QueuePersistence] Error saving queue (attempt ${attempt}/${RETRY_ATTEMPTS}):`,
        error.message
      );

      if (attempt < RETRY_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      } else {
        throw error;
      }
    }
  }
}

/**
 * Create a backup of the current queue file
 * @returns {Promise<void>}
 */
async function createBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(BACKUP_DIR, `queue-${timestamp}.json`);
    
    await fs.copyFile(QUEUE_FILE_PATH, backupPath);
    console.log(`[QueuePersistence] Backup created: ${path.basename(backupPath)}`);
  } catch (error) {
    console.error("[QueuePersistence] Error creating backup:", error.message);
    // Don't throw - backup failure shouldn't stop save operation
  }
}

/**
 * Recover queue from most recent backup
 * @returns {Promise<Array|null>} Recovered items or null
 */
async function recoverFromBackup() {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = files
      .filter((f) => f.startsWith("queue-") && f.endsWith(".json"))
      .sort()
      .reverse(); // Most recent first

    if (backupFiles.length === 0) {
      console.log("[QueuePersistence] No backups available for recovery");
      return null;
    }

    // Try each backup until one works
    for (const backupFile of backupFiles) {
      try {
        const backupPath = path.join(BACKUP_DIR, backupFile);
        const data = await fs.readFile(backupPath, "utf-8");
        const parsed = JSON.parse(data);
        
        if (parsed.items && Array.isArray(parsed.items)) {
          console.log(`[QueuePersistence] ✅ Recovered ${parsed.items.length} items from ${backupFile}`);
          
          // Restore to main file
          await fs.copyFile(backupPath, QUEUE_FILE_PATH);
          
          return parsed.items;
        }
      } catch (error) {
        console.error(`[QueuePersistence] Backup ${backupFile} is corrupted, trying next...`);
      }
    }

    console.log("[QueuePersistence] All backups are corrupted");
    return null;
  } catch (error) {
    console.error("[QueuePersistence] Error recovering from backup:", error.message);
    return null;
  }
}

/**
 * Cleanup old backup files
 * @param {number} maxBackups - Maximum number of backups to keep
 * @returns {Promise<void>}
 */
async function cleanupOldBackups(maxBackups) {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = files
      .filter((f) => f.startsWith("queue-") && f.endsWith(".json"))
      .sort()
      .reverse(); // Most recent first

    if (backupFiles.length <= maxBackups) {
      return; // Nothing to cleanup
    }

    // Delete oldest backups
    const toDelete = backupFiles.slice(maxBackups);
    for (const file of toDelete) {
      await fs.unlink(path.join(BACKUP_DIR, file));
      console.log(`[QueuePersistence] Deleted old backup: ${file}`);
    }
  } catch (error) {
    console.error("[QueuePersistence] Error cleaning up backups:", error.message);
    // Don't throw - cleanup failure is not critical
  }
}

/**
 * Get backup history
 * @returns {Promise<Array>} List of backups with metadata
 */
export async function getBackupHistory() {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backups = [];

    for (const file of files) {
      if (file.startsWith("queue-") && file.endsWith(".json")) {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = await fs.stat(filePath);
        backups.push({
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
        });
      }
    }

    return backups.sort((a, b) => b.created - a.created);
  } catch (error) {
    console.error("[QueuePersistence] Error getting backup history:", error.message);
    return [];
  }
}

/**
 * Clear all queue data
 * @returns {Promise<void>}
 */
export async function clearQueue() {
  try {
    await saveQueue([]);
    console.log("Queue cleared");
  } catch (error) {
    console.error("Error clearing queue:", error);
    throw error;
  }
}
