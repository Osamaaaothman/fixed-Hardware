import { API_CONFIG } from "../config/api.config.js";

const ERASING_API_URL = API_CONFIG.ENDPOINTS.ERASING;
const SERIAL_API_URL = API_CONFIG.ENDPOINTS.SERIAL;

/**
 * Generate erasing G-code without executing
 * @returns {Promise<Object>} Generated G-code and stats
 */
export const generateEraseGcode = async () => {
  try {
    const response = await fetch(`${ERASING_API_URL}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to generate erasing G-code");
    }

    return data;
  } catch (error) {
    console.error("Error generating erasing G-code:", error);
    throw error;
  }
};

/**
 * Execute erasing mode: switch Box to ERASING mode and get G-code
 * @returns {Promise<Object>} G-code ready to send to CNC
 */
export const executeErasing = async () => {
  try {
    const response = await fetch(`${ERASING_API_URL}/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to execute erasing mode");
    }

    return data;
  } catch (error) {
    console.error("Error executing erasing mode:", error);
    throw error;
  }
};

/**
 * Send erasing G-code to CNC via SSE
 * @param {string} gcode - G-code to send
 * @param {Function} onProgress - Callback for progress events
 * @param {Function} onComplete - Callback when complete
 * @param {Function} onError - Callback on error
 */
export const sendEraseGcode = async (
  gcode,
  onProgress,
  onComplete,
  onError
) => {
  try {
    const response = await fetch(`${SERIAL_API_URL}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gcode,
        usePersistent: true,
        isErasingMode: true, // Signal that this is erasing mode
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to send erasing G-code");
    }

    // Read SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n\n");

      for (const line of lines) {
        if (!line.trim()) continue;

        const eventMatch = line.match(/^event: (.+)$/m);
        const dataMatch = line.match(/^data: (.+)$/m);

        if (eventMatch && dataMatch) {
          const eventType = eventMatch[1];
          const eventData = JSON.parse(dataMatch[1]);

          if (eventType === "complete") {
            onComplete?.(eventData);
          } else if (eventType === "error") {
            onError?.(eventData);
          } else {
            onProgress?.(eventType, eventData);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error sending erasing G-code:", error);
    onError?.({ message: error.message });
    throw error;
  }
};
