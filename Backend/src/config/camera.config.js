/**
 * ESP32 Camera Configuration
 *
 * ⚠️ IMPORTANT: Change the ESP32_CAM_BASE_URL here to update across entire backend
 */

// ESP32 Camera Base URL - CHANGE THIS WHEN YOUR ESP CAM IP CHANGES
const ESP32_CAM_BASE_URL = "http://192.168.1.12";

// ESP32 Camera endpoints
export const CAMERA_CONFIG = {
  // Base URL for ESP32 camera
  BASE_URL: ESP32_CAM_BASE_URL,

  // Stream endpoint (typically on port 81)
  STREAM_URL: `${ESP32_CAM_BASE_URL}:81/stream`,

  // Capture endpoint
  CAPTURE_URL: `${ESP32_CAM_BASE_URL}/capture`,
};

// Export individual URLs for convenience
export const ESP32_STREAM_URL = CAMERA_CONFIG.STREAM_URL;
export const ESP32_CAPTURE_URL = CAMERA_CONFIG.CAPTURE_URL;
