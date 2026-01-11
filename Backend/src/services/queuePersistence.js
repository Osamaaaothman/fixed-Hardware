import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QUEUE_FILE_PATH = path.join(__dirname, "../../data/queue.json");

/**
 * Load queue from persistent storage
 * @returns {Promise<Array>} Queue items array
 */
export async function loadQueue() {
  try {
    const data = await fs.readFile(QUEUE_FILE_PATH, "utf-8");
    const parsed = JSON.parse(data);
    return parsed.items || [];
  } catch (error) {
    if (error.code === "ENOENT") {
      // File doesn't exist yet, return empty array
      console.log("Queue file not found, initializing empty queue");
      return [];
    }
    console.error("Error loading queue:", error);
    throw error;
  }
}

/**
 * Save queue to persistent storage
 * @param {Array} items - Queue items to save
 * @returns {Promise<void>}
 */
export async function saveQueue(items) {
  try {
    const data = {
      items,
      lastUpdated: new Date().toISOString(),
      version: "1.0",
    };

    await fs.writeFile(QUEUE_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");

    console.log(`Queue saved: ${items.length} items`);
  } catch (error) {
    console.error("Error saving queue:", error);
    throw error;
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
