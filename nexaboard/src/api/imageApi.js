import { API_CONFIG, SERIAL_CONFIG } from '../config/api.config.js';

const API_BASE_URL = API_CONFIG.ENDPOINTS.IMAGE;

/**
 * Convert image to G-code
 * @param {File} imageFile - Image file to convert
 * @param {Object} settings - Conversion settings
 * @returns {Promise<{gcode: string, stats: object, processedImage: string}>}
 */
export async function convertImageToGcode(imageFile, settings) {
  const formData = new FormData();
  formData.append("image", imageFile);

  // Append settings
  Object.entries(settings).forEach(([key, value]) => {
    formData.append(key, value.toString());
  });

  try {
    const response = await fetch(`${API_BASE_URL}/convert`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to convert image");
    }

    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

/**
 * Send G-code to serial port with real-time progress updates
 * @param {string} gcode - G-code to send
 * @param {string} port - Serial port (e.g., configured in SERIAL_CONFIG)
 * @param {number} baudRate - Baud rate (default: 115200)
 * @param {Function} onProgress - Progress callback
 * @param {Function} onStatus - Status callback
 * @param {Function} onComplete - Complete callback
 * @param {Function} onError - Error callback
 * @returns {EventSource}
 */
export function sendToSerial(
  gcode,
  port,
  baudRate = 115200,
  { onProgress, onStatus, onComplete, onError }
) {
  const eventSource = new EventSource(
    `${API_CONFIG.ENDPOINTS.SERIAL}/send?gcode=${encodeURIComponent(
      gcode
    )}&port=${encodeURIComponent(port)}&baudRate=${baudRate}`
  );

  eventSource.addEventListener("status", (event) => {
    const data = JSON.parse(event.data);
    if (onStatus) onStatus(data);
  });

  eventSource.addEventListener("progress", (event) => {
    const data = JSON.parse(event.data);
    if (onProgress) onProgress(data);
  });

  eventSource.addEventListener("complete", (event) => {
    const data = JSON.parse(event.data);
    if (onComplete) onComplete(data);
    eventSource.close();
  });

  eventSource.addEventListener("error", (event) => {
    const data = event.data
      ? JSON.parse(event.data)
      : { message: "Connection error" };
    if (onError) onError(data);
    eventSource.close();
  });

  return eventSource;
}

/**
 * Alternative method: Send G-code via POST with SSE
 * @param {string} gcode - G-code to send
 * @param {string} port - Serial port
 * @param {number} baudRate - Baud rate
 * @param {Object} callbacks - Event callbacks
 */
export async function sendGcodeToSerial(
  gcode,
  port = SERIAL_CONFIG.DEFAULT_PORT,
  baudRate = 115200,
  callbacks = {}
) {
  try {
    const response = await fetch(`${API_CONFIG.ENDPOINTS.SERIAL}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ gcode, port, baudRate }),
    });

    if (!response.ok) {
      throw new Error("Failed to send G-code");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n\n");

      for (const line of lines) {
        if (!line.trim()) continue;

        const [eventLine, dataLine] = line.split("\n");
        if (!eventLine || !dataLine) continue;

        const eventType = eventLine.replace("event: ", "").trim();
        const data = JSON.parse(dataLine.replace("data: ", "").trim());

        switch (eventType) {
          case "status":
            if (callbacks.onStatus) callbacks.onStatus(data);
            break;
          case "progress":
            if (callbacks.onProgress) callbacks.onProgress(data);
            break;
          case "complete":
            if (callbacks.onComplete) callbacks.onComplete(data);
            break;
          case "error":
            if (callbacks.onError) callbacks.onError(data);
            break;
        }
      }
    }
  } catch (error) {
    console.error("Serial send error:", error);
    if (callbacks.onError) callbacks.onError({ message: error.message });
    throw error;
  }
}

/**
 * Get list of available serial ports
 * @returns {Promise<Array>}
 */
export async function getSerialPorts() {
  try {
    const response = await fetch(`${API_BASE_URL}/serial/ports`);

    if (!response.ok) {
      throw new Error("Failed to get serial ports");
    }

    const data = await response.json();
    return data.ports || [];
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

/**
 * Get serial connection status
 * @returns {Promise<Object>}
 */
export async function getSerialStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/serial/status`);

    if (!response.ok) {
      throw new Error("Failed to get serial status");
    }

    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

/**
 * Health check for image API
 * @returns {Promise<Object>}
 */
export async function checkImageApiHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/image/health`);

    if (!response.ok) {
      throw new Error("Image API is not responding");
    }

    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}
