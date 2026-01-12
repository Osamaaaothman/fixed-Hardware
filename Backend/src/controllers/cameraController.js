import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Paths
const capturesDir = path.join(__dirname, "../../uploads/captures");
const capturesDataFile = path.join(__dirname, "../../data/captures.json");

// Ensure directories and data file exist
if (!fs.existsSync(capturesDir)) {
  fs.mkdirSync(capturesDir, { recursive: true });
}

if (!fs.existsSync(capturesDataFile)) {
  fs.writeFileSync(capturesDataFile, JSON.stringify({ captures: [] }, null, 2));
}

// ESP32 Camera URLs
const ESP32_STREAM_URL = "http://192.168.1.11:81/stream";
const ESP32_CAPTURE_URL = "http://192.168.1.11/capture";

/**
 * Helper: Read captures data
 */
function readCapturesData() {
  try {
    const data = fs.readFileSync(capturesDataFile, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading captures data:", error);
    return { captures: [] };
  }
}

/**
 * Helper: Write captures data
 */
function writeCapturesData(data) {
  try {
    fs.writeFileSync(capturesDataFile, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error writing captures data:", error);
  }
}

/**
 * GET /api/camera/stream
 * Return stream URL (frontend can use this directly)
 */
router.get("/stream", (req, res) => {
  res.json({ url: ESP32_STREAM_URL });
});

/**
 * POST /api/camera/capture
 * Capture image from ESP32 camera and save
 */
router.post("/capture", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Image name is required",
      });
    }

    // Fetch image from ESP32 camera
    console.log(`[CAMERA] Attempting to capture from ${ESP32_CAPTURE_URL}`);
    const response = await fetch(ESP32_CAPTURE_URL, {
      timeout: 10000, // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`ESP32 camera returned status ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`[CAMERA] Captured ${buffer.length} bytes from camera`);

    // Generate unique filename
    const id = uuidv4();
    const timestamp = Date.now();
    const filename = `capture-${timestamp}.jpg`;
    const filepath = path.join(capturesDir, filename);

    // Save image file
    fs.writeFileSync(filepath, buffer);

    // Create capture metadata
    const capture = {
      id,
      name: name.trim(),
      filename,
      timestamp,
      date: new Date().toISOString(),
      size: buffer.length,
    };

    // Update captures data
    const data = readCapturesData();
    data.captures.unshift(capture); // Add to beginning
    writeCapturesData(data);

    console.log(`[CAMERA] Image saved as ${filename}`);

    res.json({
      success: true,
      capture,
      message: "Image captured successfully",
    });
  } catch (error) {
    console.error("[CAMERA] Capture error:", error);
    
    // Provide more detailed error messages
    let errorMessage = "Failed to capture image from camera";
    if (error.code === 'ECONNREFUSED') {
      errorMessage = `Camera not reachable at ${ESP32_CAPTURE_URL}. Please check camera connection.`;
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = `Camera timeout at ${ESP32_CAPTURE_URL}. Camera may be busy or offline.`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
});

/**
 * GET /api/camera/captures
 * Get list of all captured images
 */
router.get("/captures", (req, res) => {
  try {
    const data = readCapturesData();
    res.json({ captures: data.captures || [] });
  } catch (error) {
    console.error("Get captures error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch captures",
    });
  }
});

/**
 * DELETE /api/camera/captures/:id
 * Delete a captured image
 */
router.delete("/captures/:id", (req, res) => {
  try {
    const { id } = req.params;
    const data = readCapturesData();

    const captureIndex = data.captures.findIndex((c) => c.id === id);

    if (captureIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Capture not found",
      });
    }

    const capture = data.captures[captureIndex];
    const filepath = path.join(capturesDir, capture.filename);

    // Delete file if it exists
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

    // Remove from data
    data.captures.splice(captureIndex, 1);
    writeCapturesData(data);

    res.json({
      success: true,
      message: "Capture deleted successfully",
    });
  } catch (error) {
    console.error("Delete capture error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete capture",
    });
  }
});

/**
 * GET /api/camera/health
 * Health check endpoint
 */
router.get("/health", (req, res) => {
  res.json({ status: "Camera controller operational" });
});

export default router;
