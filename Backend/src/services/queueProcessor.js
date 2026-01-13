import { nexaboard } from "../../Data.js";
import { saveQueue } from "./queuePersistence.js";
import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";

let isProcessing = false;
let currentProcessingItem = null;

/**
 * Send command to Box via serial port
 * @param {Object} boxPort - Box serial port instance
 * @param {string} command - Command to send
 * @returns {Promise<boolean>} Success status
 */
function sendBoxCommand(boxPort, command) {
  return new Promise((resolve, reject) => {
    if (!boxPort || !boxPort.isOpen) {
      reject(new Error("Box port not connected"));
      return;
    }

    boxPort.write(`${command}\n`, (err) => {
      if (err) {
        console.error(`[QUEUE] Error sending box command "${command}":`, err);
        reject(err);
      } else {
        console.log(`[QUEUE] Box command sent: ${command}`);
        resolve(true);
      }
    });
  });
}

/**
 * Send a single line of G-code and wait for "ok" response
 */
function sendLine(line, parser, serialPort) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Timeout waiting for Arduino response"));
    }, 5000);

    parser.once("data", (data) => {
      clearTimeout(timeout);
      if (data.trim().toLowerCase() === "ok") {
        resolve();
      } else {
        resolve(); // Continue even if response isn't "ok"
      }
    });

    serialPort.write(line + "\n", (err) => {
      if (err) {
        clearTimeout(timeout);
        reject(err);
      }
    });
  });
}

/**
 * Process a single queue item
 * @param {Object} item - Queue item to process
 * @param {Object} io - Socket.IO instance for real-time updates
 * @param {string} port - Serial port (default: COM4)
 * @param {number} baudRate - Baud rate (default: 115200)
 * @param {Object} persistentPort - Persistent CNC serial port (optional)
 * @param {Object} persistentParser - Persistent CNC parser (optional)
 * @param {Object} boxPort - Box serial port (optional)
 */
async function processQueueItem(
  item,
  io,
  port = "COM4",
  baudRate = 115200,
  persistentPort = null,
  persistentParser = null,
  boxPort = null
) {
  let serialPort = null;
  let parser = null;
  let usingPersistent = false;
  let boxModeChanged = false;

  try {
    // Update item status to processing
    item.status = "processing";
    item.processingStartTime = Date.now();
    item.currentLine = 0;
    await saveQueue(nexaboard.queue.getAll());

    // Emit processing start event
    if (io) {
      io.emit("queue:processing", {
        itemId: item.id,
        status: "started",
        timestamp: Date.now(),
      });
    }

    // Use persistent connection if available, otherwise create temporary
    if (persistentPort && persistentPort.isOpen && persistentParser) {
      console.log("[QUEUE] Using persistent CNC connection");
      serialPort = persistentPort;
      parser = persistentParser;
      usingPersistent = true;
    } else {
      console.log("[QUEUE] Creating temporary CNC connection");
      // Open serial port
      serialPort = new SerialPort({
        path: port,
        baudRate: baudRate,
        dataBits: 8,
        parity: "none",
        stopBits: 1,
      });

      parser = serialPort.pipe(new ReadlineParser({ delimiter: "\n" }));

      // Wait for Arduino to initialize
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Send Box to writing mode before starting G-code transmission
    if (boxPort && boxPort.isOpen) {
      try {
        await sendBoxCommand(boxPort, "writing");
        boxModeChanged = true;
        console.log("[QUEUE] Box entered writing mode");

        // Emit socket event
        if (io) {
          io.emit("box:mode-changed", {
            mode: "WRITING",
            reason: "queue-drawing",
            timestamp: Date.now(),
          });
        }

        // Wait for Box to switch modes
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (boxError) {
        console.error(
          "[QUEUE] Warning: Failed to set Box to writing mode:",
          boxError
        );
        // Continue anyway - Box mode is optional
      }
    }

    // Parse G-code lines
    const lines = item.gcode.split("\n").filter((line) => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith(";");
    });

    // Send G-code line by line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      await sendLine(line, parser, serialPort);
      item.currentLine = i + 1;

      // Emit progress update every 5 lines or on last line (more frequent updates)
      if (i % 5 === 0 || i === lines.length - 1) {
        if (io) {
          io.emit("queue:processing", {
            itemId: item.id,
            status: "progress",
            current: i + 1,
            total: lines.length,
            progress: Math.round(((i + 1) / lines.length) * 100),
            timestamp: Date.now(),
            currentLine: line.substring(0, 50), // First 50 chars of current line
          });
        }
      }
    }

    // Mark as completed
    item.status = "completed";
    item.processingEndTime = Date.now();
    item.completedAt = new Date().toISOString();

    // Return Box to ready/menu mode after drawing
    if (boxPort && boxPort.isOpen && boxModeChanged) {
      try {
        await sendBoxCommand(boxPort, "exit_writing");
        console.log("[QUEUE] Box exited writing mode, returned to menu");

        // Emit socket event
        if (io) {
          io.emit("box:mode-changed", {
            mode: "READY",
            reason: "queue-completed",
            timestamp: Date.now(),
          });
        }
      } catch (boxError) {
        console.error(
          "[QUEUE] Warning: Failed to exit Box writing mode:",
          boxError
        );
        // Continue anyway
      }
    }

    // Close serial port only if not using persistent connection
    if (serialPort && serialPort.isOpen && !usingPersistent) {
      serialPort.close();
      console.log("[QUEUE] Temporary CNC connection closed");
    }

    // Emit completion event
    if (io) {
      io.emit("queue:completed", {
        id: item.id,
        itemId: item.id,
        status: "completed",
        totalLines: lines.length,
        processingTime: item.processingEndTime - item.processingStartTime,
        timestamp: Date.now(),
      });
    }

    console.log(`[QUEUE] Item ${item.id} completed successfully`);
    return { success: true, item };
  } catch (error) {
    console.error(`[QUEUE] Error processing queue item ${item.id}:`, error);

    // Mark as failed
    item.status = "failed";
    item.error = error.message;
    item.processingEndTime = Date.now();
    await saveQueue(nexaboard.queue.getAll());

    // Return Box to ready mode on error
    if (boxPort && boxPort.isOpen && boxModeChanged) {
      try {
        await sendBoxCommand(boxPort, "exit_writing");
        console.log(
          "[QUEUE] Box exited writing mode after error, returned to menu"
        );
      } catch (boxError) {
        console.error("[QUEUE] Failed to exit Box writing mode:", boxError);
      }
    }

    // Close serial port only if not using persistent connection
    if (serialPort && serialPort.isOpen && !usingPersistent) {
      serialPort.close();
      console.log("[QUEUE] Temporary CNC connection closed after error");
    }

    // Emit error event
    if (io) {
      io.emit("queue:completed", {
        id: item.id,
        itemId: item.id,
        status: "failed",
        error: error.message,
        timestamp: Date.now(),
      });
    }

    return { success: false, error: error.message, item };
  }
}

/**
 * Start processing the queue
 * Processes items one by one from the front of the queue
 * Deletes completed items, keeps failed items for retry
 * @param {Object} io - Socket.IO instance
 * @param {string} port - Serial port for CNC
 * @param {number} baudRate - Baud rate for CNC
 * @param {Object} persistentPort - Persistent CNC connection (optional)
 * @param {Object} persistentParser - Persistent CNC parser (optional)
 * @param {Object} boxPort - Box serial port (optional)
 */
export async function startQueueProcessing(
  io,
  port = "COM4",
  baudRate = 115200,
  persistentPort = null,
  persistentParser = null,
  boxPort = null
) {
  if (isProcessing) {
    return { success: false, message: "Queue is already being processed" };
  }

  isProcessing = true;
  const results = {
    total: 0,
    completed: 0,
    failed: 0,
    items: [],
  };

  try {
    while (!nexaboard.queue.isEmpty()) {
      // Get the first pending item
      const items = nexaboard.queue.getAll();
      const nextItem = items.find((item) => item.status === "pending");

      if (!nextItem) {
        console.log("[QUEUE] No more pending items in queue");
        break;
      }

      currentProcessingItem = nextItem;
      results.total++;

      const result = await processQueueItem(
        nextItem,
        io,
        port,
        baudRate,
        persistentPort,
        persistentParser,
        boxPort
      );
      results.items.push(result);

      if (result.success) {
        results.completed++;

        // Remove completed item from queue
        const index = nexaboard.queue
          .getAll()
          .findIndex((i) => i.id === nextItem.id);
        if (index !== -1) {
          nexaboard.queue.removeAt(index);
          await saveQueue(nexaboard.queue.getAll());

          console.log(
            `[QUEUE] Removed completed item ${nextItem.id} from queue`
          );

          // Emit queue updated event
          if (io) {
            io.emit("queue:updated", {
              action: "remove",
              itemId: nextItem.id,
              count: nexaboard.queue.getAll().length,
            });
          }
        }
      } else {
        results.failed++;
        // Keep failed item in queue for manual review/retry
        await saveQueue(nexaboard.queue.getAll());
      }

      currentProcessingItem = null;
    }

    isProcessing = false;

    console.log(
      `[QUEUE] Processing finished: ${results.completed} completed, ${results.failed} failed`
    );

    return {
      success: true,
      message: "Queue processing completed",
      results,
    };
  } catch (error) {
    isProcessing = false;
    currentProcessingItem = null;
    console.error("[QUEUE] Processing error:", error);

    return {
      success: false,
      message: error.message,
      results,
    };
  }
}

/**
 * Stop queue processing (for future pause/cancel functionality)
 */
export function stopQueueProcessing() {
  if (!isProcessing) {
    return { success: false, message: "Queue is not being processed" };
  }

  isProcessing = false;

  return {
    success: true,
    message: "Queue processing will stop after current item",
    currentItem: currentProcessingItem,
  };
}

/**
 * Get current processing status
 */
export function getProcessingStatus() {
  return {
    isProcessing,
    currentItem: currentProcessingItem,
  };
}
