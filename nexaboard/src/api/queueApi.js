import { API_CONFIG, SERIAL_CONFIG } from '../config/api.config.js';

const API_BASE_URL = API_CONFIG.ENDPOINTS.QUEUE;

/**
 * Get all queue items
 */
export async function getQueue() {
  const response = await fetch(API_BASE_URL);
  if (!response.ok) {
    throw new Error("Failed to fetch queue");
  }
  return response.json();
}

/**
 * Add item to queue
 * @param {Object} item - { image, gcode, stats, settings, processedImage, type }
 */
export async function addToQueue(item) {
  const response = await fetch(`${API_BASE_URL}/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(item),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to add to queue");
  }

  return response.json();
}

/**
 * Remove item from queue
 * @param {string} id - Item ID
 */
export async function removeFromQueue(id) {
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to remove from queue");
  }

  return response.json();
}

/**
 * Reorder queue items
 * @param {number} fromIndex - Source index
 * @param {number} toIndex - Destination index
 */
export async function reorderQueue(fromIndex, toIndex) {
  const response = await fetch(`${API_BASE_URL}/reorder`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fromIndex, toIndex }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to reorder queue");
  }

  return response.json();
}

/**
 * Clear entire queue
 */
export async function clearQueue() {
  const response = await fetch(API_BASE_URL, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to clear queue");
  }

  return response.json();
}

/**
 * Get queue status
 */
export async function getQueueStatus() {
  const response = await fetch(`${API_BASE_URL}/status`);

  if (!response.ok) {
    throw new Error("Failed to get queue status");
  }

  return response.json();
}

/**
 * Start processing queue
 * @param {string} port - Serial port (default: configured in SERIAL_CONFIG)
 * @param {number} baudRate - Baud rate (default: configured in SERIAL_CONFIG)
 */
export async function processQueue(port = SERIAL_CONFIG.DEFAULT_PORT, baudRate = SERIAL_CONFIG.DEFAULT_BAUD_RATE) {
  const response = await fetch(`${API_BASE_URL}/process`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ port, baudRate }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to start queue processing");
  }

  return response.json();
}

/**
 * Process only the next (first pending) item in queue
 * @param {string} port - Serial port (default: configured in SERIAL_CONFIG)
 * @param {number} baudRate - Baud rate (default: configured in SERIAL_CONFIG)
 */
export async function processNextInQueue(port = SERIAL_CONFIG.DEFAULT_PORT, baudRate = SERIAL_CONFIG.DEFAULT_BAUD_RATE) {
  const response = await fetch(`${API_BASE_URL}/process-next`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ port, baudRate }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to process next item");
  }

  return response.json();
}

/**
 * Send a single command to Arduino
 * @param {string} command - Command to send (e.g., "M3 S3000")
 * @param {string} port - Serial port (default: configured in SERIAL_CONFIG)
 * @param {number} baudRate - Baud rate (default: configured in SERIAL_CONFIG)
 */
export async function sendCommand(command, port = SERIAL_CONFIG.DEFAULT_PORT, baudRate = SERIAL_CONFIG.DEFAULT_BAUD_RATE) {
  const response = await fetch(`${API_CONFIG.ENDPOINTS.SERIAL}/command`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ command, port, baudRate }),
  });
  console.log(response.ok,"here");
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to send command");
  }

  return response.json();
}
