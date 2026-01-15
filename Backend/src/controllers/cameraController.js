import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import { v4 as uuidv4 } from "uuid";
import HardwareConfig from "../config/hardware.config.js";
import {
  ESP32_STREAM_URL,
  ESP32_CAPTURE_URL,
} from "../config/camera.config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Circuit breaker state for camera
let cameraCircuitBreakerState = {
  failures: 0,
  lastFailureTime: null,
  isOpen: false,
};

const CIRCUIT_BREAKER_THRESHOLD = 5; // Open after 5 failures
const CIRCUIT_BREAKER_TIMEOUT = 60000; // Try again after 1 minute

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

// ESP32 Camera URLs are imported from config/camera.config.js
// To change the ESP cam IP, edit: Backend/src/config/camera.config.js

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
 * Helper: Check and update circuit breaker
 */
function checkCircuitBreaker() {
  if (!cameraCircuitBreakerState.isOpen) {
    return { open: false };
  }

  const now = Date.now();
  const timeSinceFailure = now - cameraCircuitBreakerState.lastFailureTime;

  if (timeSinceFailure >= CIRCUIT_BREAKER_TIMEOUT) {
    // Reset circuit breaker
    console.log("[CAMERA] Circuit breaker reset - attempting reconnection");
    cameraCircuitBreakerState.isOpen = false;
    cameraCircuitBreakerState.failures = 0;
    return { open: false };
  }

  const remainingTime = Math.ceil(
    (CIRCUIT_BREAKER_TIMEOUT - timeSinceFailure) / 1000
  );
  return {
    open: true,
    message: `Camera circuit breaker open. Too many failures. Retry in ${remainingTime}s`,
  };
}

/**
 * Helper: Record camera failure
 */
function recordCameraFailure() {
  cameraCircuitBreakerState.failures++;
  cameraCircuitBreakerState.lastFailureTime = Date.now();

  if (cameraCircuitBreakerState.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    cameraCircuitBreakerState.isOpen = true;
    console.error(
      `[CAMERA] ⚠️ Circuit breaker OPEN after ${cameraCircuitBreakerState.failures} failures`
    );
  }
}

/**
 * Helper: Record camera success
 */
function recordCameraSuccess() {
  cameraCircuitBreakerState.failures = 0;
  cameraCircuitBreakerState.isOpen = false;
}

/**
 * Helper: Capture with retry logic
 */
async function captureWithRetry() {
  const { RETRY_ATTEMPTS, RETRY_DELAY } = HardwareConfig.CAMERA.CAPTURE;

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      console.log(
        `[CAMERA] Capture attempt ${attempt}/${RETRY_ATTEMPTS} from ${ESP32_CAPTURE_URL}`
      );

      const response = await fetch(ESP32_CAPTURE_URL, {
        timeout: HardwareConfig.CAMERA.CONNECTION.TIMEOUT,
      });

      if (!response.ok) {
        throw new Error(`ESP32 camera returned status ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Validate image size
      if (buffer.length > HardwareConfig.CAMERA.CAPTURE.MAX_SIZE) {
        throw new Error(`Image too large: ${buffer.length} bytes`);
      }

      console.log(`[CAMERA] ✅ Capture successful (${buffer.length} bytes)`);
      recordCameraSuccess();

      return { success: true, buffer };
    } catch (error) {
      console.error(`[CAMERA] Attempt ${attempt} failed:`, error.message);

      if (attempt < RETRY_ATTEMPTS) {
        const delay = RETRY_DELAY * attempt; // Progressive delay
        console.log(`[CAMERA] Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        recordCameraFailure();
        return { success: false, error: error.message };
      }
    }
  }

  recordCameraFailure();
  return { success: false, error: "All retry attempts failed" };
}

/**
 * POST /api/camera/capture
 * Capture image from ESP32 camera with retry logic and circuit breaker
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

    // Check circuit breaker
    const circuitStatus = checkCircuitBreaker();
    if (circuitStatus.open) {
      return res.status(503).json({
        success: false,
        message: circuitStatus.message,
        circuitBreakerOpen: true,
      });
    }

    // Attempt capture with retries
    const captureResult = await captureWithRetry();

    if (!captureResult.success) {
      return res.status(500).json({
        success: false,
        message: `Failed to capture image: ${captureResult.error}`,
        error: captureResult.error,
      });
    }

    const buffer = captureResult.buffer;

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
    if (error.code === "ECONNREFUSED") {
      errorMessage = `Camera not reachable at ${ESP32_CAPTURE_URL}. Please check camera connection.`;
    } else if (error.code === "ETIMEDOUT") {
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
    console.log("osama152");

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
