import { API_BASE_URL } from "../config/api.config";

/**
 * Serial API - CNC Connection Management
 * Provides functions for persistent CNC serial connection
 */

/**
 * Connect to CNC serial port (persistent connection)
 * @param {string} port - Serial port path (e.g., "COM3" or "/dev/ttyUSB0")
 * @returns {Promise<Object>} Connection result
 */
export const connectSerial = async (port) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/serial/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ port }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to connect to serial port");
    }

    return await response.json();
  } catch (error) {
    console.error("Error connecting to serial port:", error);
    throw error;
  }
};

/**
 * Disconnect from CNC serial port
 * @returns {Promise<Object>} Disconnection result
 */
export const disconnectSerial = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/serial/disconnect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to disconnect from serial port");
    }

    return await response.json();
  } catch (error) {
    console.error("Error disconnecting from serial port:", error);
    throw error;
  }
};

/**
 * Get current serial connection status
 * @returns {Promise<Object>} Status object with connected, port, isDrawing, position, lastCommand
 */
export const getSerialStatus = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/serial/status`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get serial status");
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting serial status:", error);
    throw error;
  }
};

/**
 * List available serial ports
 * @returns {Promise<Array>} Array of available port objects
 */
export const listSerialPorts = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/serial/ports`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to list serial ports");
    }

    return await response.json();
  } catch (error) {
    console.error("Error listing serial ports:", error);
    throw error;
  }
};

/**
 * Send a G-code command to CNC via persistent connection
 * @param {string} command - G-code command to send
 * @returns {Promise<Object>} Command response
 */
export const sendSerialCommand = async (command) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/serial/command`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ command }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to send command");
    }

    return await response.json();
  } catch (error) {
    console.error("Error sending serial command:", error);
    throw error;
  }
};

/**
 * Get last known position (for recovery after disconnect)
 * @returns {Promise<Object>} Last position object {x, y, z}
 */
export const getLastPosition = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/serial/last-position`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get last position");
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting last position:", error);
    throw error;
  }
};

/**
 * Recover CNC after disconnect (moves back to origin safely)
 * @returns {Promise<Object>} Recovery result
 */
export const recoverSerial = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/serial/recover`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to recover");
    }

    return await response.json();
  } catch (error) {
    console.error("Error recovering serial:", error);
    throw error;
  }
};
