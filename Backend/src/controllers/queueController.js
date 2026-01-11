import { Router } from "express";
import { nexaboard } from "../../Data.js";
import {
  loadQueue,
  saveQueue,
  clearQueue,
} from "../services/queuePersistence.js";
import {
  startQueueProcessing,
  getProcessingStatus,
} from "../services/queueProcessor.js";
import { v4 as uuidv4 } from "uuid";

const router = Router();

/**
 * GET /api/queue
 * Get all queue items
 */
router.get("/", async (req, res) => {
  try {
    const items = nexaboard.queue.getAll();
    res.json({ success: true, items, count: items.length });
  } catch (error) {
    console.error("Error fetching queue:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/queue/add
 * Add item to queue
 * Body: { image, gcode, stats, settings, processedImage, type }
 */
router.post("/add", async (req, res) => {
  try {
    const {
      image,
      gcode,
      stats,
      settings,
      processedImage,
      type = "image",
    } = req.body;

    if (!gcode) {
      return res
        .status(400)
        .json({ success: false, error: "G-code is required" });
    }

    const queueItem = {
      id: uuidv4(),
      type,
      status: "pending",
      image: image || null,
      settings: settings || {},
      gcode,
      stats: stats || {},
      processedImage: processedImage || null,
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
      completedAt: null,
      error: null,
      processingStartTime: null,
      processingEndTime: null,
      currentLine: 0,
    };

    nexaboard.queue.enqueue(queueItem);

    // Persist to file
    const allItems = nexaboard.queue.getAll();
    await saveQueue(allItems);

    // Emit socket event if io is available
    if (req.app.get("io")) {
      req.app.get("io").emit("queue:updated", {
        action: "add",
        item: queueItem,
        count: allItems.length,
      });
    }

    res.json({
      success: true,
      message: "Item added to queue",
      item: queueItem,
      queueLength: allItems.length,
    });
  } catch (error) {
    console.error("Error adding to queue:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/queue/:id
 * Remove specific item from queue
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const items = nexaboard.queue.getAll();
    const index = items.findIndex((item) => item.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }

    nexaboard.queue.removeAt(index);

    // Persist to file
    const updatedItems = nexaboard.queue.getAll();
    await saveQueue(updatedItems);

    // Emit socket event
    if (req.app.get("io")) {
      req.app.get("io").emit("queue:updated", {
        action: "remove",
        itemId: id,
        count: updatedItems.length,
      });
    }

    res.json({
      success: true,
      message: "Item removed from queue",
      queueLength: updatedItems.length,
    });
  } catch (error) {
    console.error("Error removing from queue:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/queue/reorder
 * Reorder queue items
 * Body: { fromIndex, toIndex }
 */
router.put("/reorder", async (req, res) => {
  try {
    const { fromIndex, toIndex } = req.body;

    if (typeof fromIndex !== "number" || typeof toIndex !== "number") {
      return res.status(400).json({
        success: false,
        error: "fromIndex and toIndex must be numbers",
      });
    }

    nexaboard.queue.move(fromIndex, toIndex);

    // Persist to file
    const updatedItems = nexaboard.queue.getAll();
    await saveQueue(updatedItems);

    // Emit socket event
    if (req.app.get("io")) {
      req.app.get("io").emit("queue:updated", {
        action: "reorder",
        fromIndex,
        toIndex,
        items: updatedItems,
      });
    }

    res.json({
      success: true,
      message: "Queue reordered",
      items: updatedItems,
    });
  } catch (error) {
    console.error("Error reordering queue:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/queue
 * Clear entire queue
 */
router.delete("/", async (req, res) => {
  try {
    nexaboard.queue.clear();
    await clearQueue();

    // Emit socket event
    if (req.app.get("io")) {
      req.app.get("io").emit("queue:updated", {
        action: "clear",
        count: 0,
      });
    }

    res.json({ success: true, message: "Queue cleared" });
  } catch (error) {
    console.error("Error clearing queue:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/queue/status
 * Get queue processing status
 */
router.get("/status", async (req, res) => {
  try {
    const items = nexaboard.queue.getAll();
    const pending = items.filter((i) => i.status === "pending").length;
    const processing = items.filter((i) => i.status === "processing").length;
    const completed = items.filter((i) => i.status === "completed").length;
    const failed = items.filter((i) => i.status === "failed").length;

    const processingStatus = getProcessingStatus();

    res.json({
      success: true,
      total: items.length,
      pending,
      processing,
      completed,
      failed,
      isEmpty: items.length === 0,
      isProcessing: processingStatus.isProcessing,
      currentItem: processingStatus.currentItem,
    });
  } catch (error) {
    console.error("Error getting queue status:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/queue/process
 * Start processing the queue
 * Body: { port?, baudRate? }
 */
router.post("/process", async (req, res) => {
  try {
    const { port = "COM4", baudRate = 115200 } = req.body;
    const io = req.app.get("io");

    if (!io) {
      return res.status(500).json({
        success: false,
        error: "Socket.IO not initialized",
      });
    }

    // Start processing asynchronously
    startQueueProcessing(io, port, baudRate)
      .then((result) => {
        console.log("Queue processing completed:", result);
      })
      .catch((error) => {
        console.error("Queue processing error:", error);
      });

    res.json({
      success: true,
      message: "Queue processing started",
      queueLength: nexaboard.queue.getAll().length,
    });
  } catch (error) {
    console.error("Error starting queue processing:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/queue/process-next
 * Process only the first pending item in queue
 * Body: { port?, baudRate? }
 */
router.post("/process-next", async (req, res) => {
  try {
    const { port = "COM4", baudRate = 115200 } = req.body;
    const io = req.app.get("io");

    if (!io) {
      return res.status(500).json({
        success: false,
        error: "Socket.IO not initialized",
      });
    }

    // Get first pending item
    const items = nexaboard.queue.getAll();
    const firstPendingItem = items.find((item) => item.status === "pending");

    if (!firstPendingItem) {
      return res.status(404).json({
        success: false,
        error: "No pending items in queue",
      });
    }

    res.json({
      success: true,
      message: "Processing next item",
      item: {
        id: firstPendingItem.id,
        gcode: firstPendingItem.gcode,
      },
    });
  } catch (error) {
    console.error("Error processing next item:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
