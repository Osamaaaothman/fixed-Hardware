import { API_CONFIG } from "../config/api.config.js";

const API_BASE_URL = API_CONFIG.BASE_URL;

/**
 * Get camera stream URL
 * @returns {string} ESP32 camera stream URL
 */
export function getStreamUrl() {
  return "http://192.168.1.11:81/stream";
}

/**
 * Capture image from ESP32 camera
 * @param {string} name - Name for the captured image
 * @param {number} retries - Number of retry attempts (default: 3)
 * @returns {Promise<{success: boolean, capture: object, message: string}>}
 */
export async function captureImage(name, retries = 3) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Add small delay between retries to let camera free up
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        console.log(`Camera capture retry attempt ${attempt}/${retries}`);
      }

      const response = await fetch(`${API_BASE_URL}/api/camera/capture`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to capture image");
      }

      return await response.json();
    } catch (error) {
      console.error(
        `Camera capture error (attempt ${attempt + 1}/${retries + 1}):`,
        error
      );
      lastError = error;

      // If it's the last attempt, throw the error
      if (attempt === retries) {
        throw error;
      }
    }
  }

  throw lastError;
}

/**
 * Get list of all captured images
 * @returns {Promise<{captures: Array}>}
 */
export async function getCapturesList() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/camera/captures`, {
      method: "GET",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch captures");
    }

    return await response.json();
  } catch (error) {
    console.error("Fetch captures error:", error);
    throw error;
  }
}

/**
 * Delete a captured image
 * @param {string} id - Capture ID to delete
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function deleteCapture(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/camera/captures/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete capture");
    }

    return await response.json();
  } catch (error) {
    console.error("Delete capture error:", error);
    throw error;
  }
}

/**
 * Get captured image file as blob for upload
 * @param {string} filename - Filename of the capture
 * @returns {Promise<Blob>}
 */
export async function getCaptureFile(filename) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/uploads/captures/${filename}`,
      {
        method: "GET",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch capture file");
    }

    return await response.blob();
  } catch (error) {
    console.error("Fetch capture file error:", error);
    throw error;
  }
}
