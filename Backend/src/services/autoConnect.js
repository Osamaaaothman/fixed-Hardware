/**
 * Auto-Connect Integration
 *
 * Integrates the Connection Manager with existing controllers by
 * creating direct connection methods that bypass HTTP endpoints.
 */

import connectionManager from "./connectionManager.js";
import HardwareConfig from "../config/hardware.config.js";

/**
 * Register auto-connect handlers for controllers
 * This should be called after controllers are initialized
 *
 * @param {Object} controllers - Object containing controller instances or connection functions
 */
export function setupAutoConnect(controllers) {
  console.log("[AutoConnect] Setting up auto-connect integration...");

  // Register CNC controller if available
  if (controllers.cnc) {
    const cncAdapter = {
      connect: async (port) => {
        try {
          return await controllers.cnc.connect(
            port || HardwareConfig.CNC.SERIAL.DEFAULT_PORT
          );
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      disconnect: async () => {
        try {
          return await controllers.cnc.disconnect();
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
    };

    connectionManager.registerController("cnc", cncAdapter);
    console.log("[AutoConnect] ✅ CNC controller registered");
  } else {
    console.log("[AutoConnect] ⚠️  CNC controller not available");
  }

  // Register Box controller if available
  if (controllers.box) {
    const boxAdapter = {
      connect: async (port) => {
        try {
          return await controllers.box.connect(
            port || HardwareConfig.BOX.SERIAL.DEFAULT_PORT
          );
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      disconnect: async () => {
        try {
          return await controllers.box.disconnect();
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
    };

    connectionManager.registerController("box", boxAdapter);
    console.log("[AutoConnect] ✅ Box controller registered");
  } else {
    console.log("[AutoConnect] ⚠️  Box controller not available");
  }

  // Register Remote controller if available (future)
  if (controllers.remote) {
    const remoteAdapter = {
      connect: async (address) => {
        try {
          return await controllers.remote.connect(
            address || HardwareConfig.REMOTE.CONNECTION.DEFAULT_IP
          );
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      disconnect: async () => {
        try {
          return await controllers.remote.disconnect();
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
    };

    connectionManager.registerController("remote", remoteAdapter);
    console.log("[AutoConnect] ✅ Remote controller registered");
  }

  console.log("[AutoConnect] Setup complete");
}

/**
 * Create a connection method wrapper for controllers
 * This helps controllers notify the connection manager about their state
 *
 * @param {string} deviceType - 'cnc' | 'box' | 'remote'
 * @returns {Object} Helper methods
 */
export function createConnectionHelpers(deviceType) {
  return {
    /**
     * Notify connection manager that device connected
     */
    notifyConnected: () => {
      connectionManager.handleConnect(deviceType);
    },

    /**
     * Notify connection manager that device disconnected
     * @param {string} reason - Disconnection reason
     */
    notifyDisconnected: (reason) => {
      connectionManager.handleDisconnect(deviceType, reason);
    },

    /**
     * Get current connection status from manager
     */
    getStatus: () => {
      return connectionManager.getStatus(deviceType);
    },
  };
}

export default {
  setupAutoConnect,
  createConnectionHelpers,
};
