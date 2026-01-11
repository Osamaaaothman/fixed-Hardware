import { nexaboard } from "../../Data.js";
import { saveQueue } from "./queuePersistence.js";
import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";

let isProcessing = false;
let currentProcessingItem = null;

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
 */
async function processQueueItem(item, io, port = "COM4", baudRate = 115200) {
  let serialPort = null;
  let parser = null;

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

      // Emit progress update every 10 lines or on last line
      if (i % 10 === 0 || i === lines.length - 1) {
        if (io) {
          io.emit("queue:processing", {
            itemId: item.id,
            status: "progress",
            current: i + 1,
            total: lines.length,
            progress: Math.round(((i + 1) / lines.length) * 100),
            timestamp: Date.now(),
          });
        }
      }
    }

    // Mark as completed
    item.status = "completed";
    item.processingEndTime = Date.now();
    item.completedAt = new Date().toISOString();

    // Close serial port
    if (serialPort && serialPort.isOpen) {
      serialPort.close();
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

    console.log(`Queue item ${item.id} completed successfully`);
    return { success: true, item };
  } catch (error) {
    console.error(`Error processing queue item ${item.id}:`, error);

    // Mark as failed
    item.status = "failed";
    item.error = error.message;
    item.processingEndTime = Date.now();
    await saveQueue(nexaboard.queue.getAll());

    // Close serial port
    if (serialPort && serialPort.isOpen) {
      serialPort.close();
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
 */
export async function startQueueProcessing(
  io,
  port = "COM4",
  baudRate = 115200
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
        console.log("No more pending items in queue");
        break;
      }

      currentProcessingItem = nextItem;
      results.total++;

      const result = await processQueueItem(nextItem, io, port, baudRate);
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
      `Queue processing finished: ${results.completed} completed, ${results.failed} failed`
    );

    return {
      success: true,
      message: "Queue processing completed",
      results,
    };
  } catch (error) {
    isProcessing = false;
    currentProcessingItem = null;
    console.error("Queue processing error:", error);

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
