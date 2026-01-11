import { API_CONFIG } from "../config/api.config.js";

const BOX_API_URL = API_CONFIG.ENDPOINTS.BOX;

/**
 * Connect to Box serial port
 * @param {string} port - Serial port path (default: /dev/ttyUSB1)
 * @returns {Promise<Object>} Connection result
 */
export const connectBox = async (port = "/dev/ttyUSB1") => {
  try {
    const response = await fetch(`${BOX_API_URL}/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ port }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to connect to Box");
    }

    return data;
  } catch (error) {
    console.error("Error connecting to Box:", error);
    throw error;
  }
};

/**
 * Disconnect from Box serial port
 * @returns {Promise<Object>} Disconnection result
 */
export const disconnectBox = async () => {
  try {
    const response = await fetch(`${BOX_API_URL}/disconnect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to disconnect from Box");
    }

    return data;
  } catch (error) {
    console.error("Error disconnecting from Box:", error);
    throw error;
  }
};

/**
 * Get current Box status
 * @returns {Promise<Object>} Box status and activity log
 */
export const getBoxStatus = async () => {
  try {
    const response = await fetch(`${BOX_API_URL}/status`);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to get Box status");
    }

    return data;
  } catch (error) {
    console.error("Error getting Box status:", error);
    throw error;
  }
};

/**
 * Send command to Box
 * @param {string} command - Command to send (writing, erasing, exiting, ready, locked)
 * @returns {Promise<Object>} Command result
 */
export const sendBoxCommand = async (command) => {
  try {
    const response = await fetch(`${BOX_API_URL}/command`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ command }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Failed to send command: ${command}`);
    }

    return data;
  } catch (error) {
    console.error(`Error sending Box command "${command}":`, error);
    throw error;
  }
};

/**
 * Get Box activity log
 * @param {number} limit - Maximum number of activities to fetch (default: 50)
 * @returns {Promise<Object>} Activity log
 */
export const getBoxActivity = async (limit = 50) => {
  try {
    const response = await fetch(`${BOX_API_URL}/activity?limit=${limit}`);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to get Box activity log");
    }

    return data;
  } catch (error) {
    console.error("Error getting Box activity:", error);
    throw error;
  }
};

/**
 * List available serial ports
 * @returns {Promise<Object>} Available ports
 */
export const listBoxPorts = async () => {
  try {
    const response = await fetch(`${BOX_API_URL}/ports`);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to list serial ports");
    }

    return data;
  } catch (error) {
    console.error("Error listing Box ports:", error);
    throw error;
  }
};
