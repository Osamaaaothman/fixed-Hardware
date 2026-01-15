/**
 * Connection Adapters
 * 
 * Adapters that wrap existing controllers to work with the Connection Manager.
 * This allows auto-connect functionality without heavily modifying controller code.
 */

import connectionManager from "./connectionManager.js";

/**
 * CNC Serial Connection Adapter
 * Wraps the serialController for connection manager compatibility
 */
export class CNCConnectionAdapter {
  constructor(serialController) {
    this.controller = serialController;
    this.port = null;
  }

  /**
   * Connect to CNC
   * @param {string} port - Serial port path
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async connect(port) {
    try {
      console.log(`[CNCAdapter] Attempting connection to ${port}...`);
      
      // Call the controller's connect endpoint logic
      // Note: We need to expose this in the controller or call via HTTP
      const response = await fetch(`http://localhost:5000/api/serial/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ port }),
      });

      const result = await response.json();
      
      if (result.success) {
        this.port = port;
        connectionManager.handleConnect("cnc");
        console.log(`[CNCAdapter] ✅ Connected to CNC on ${port}`);
        return { success: true };
      } else {
        console.log(`[CNCAdapter] ❌ Connection failed:`, result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error(`[CNCAdapter] Connection error:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Disconnect from CNC
   * @returns {Promise<{success: boolean}>}
   */
  async disconnect() {
    try {
      const response = await fetch(`http://localhost:5000/api/serial/disconnect`, {
        method: "POST",
      });

      const result = await response.json();
      this.port = null;
      return { success: true };
    } catch (error) {
      console.error(`[CNCAdapter] Disconnect error:`, error.message);
      return { success: false, error: error.message };
    }
  }
}

/**
 * Box Controller Connection Adapter
 * Wraps the boxController for connection manager compatibility
 */
export class BoxConnectionAdapter {
  constructor(boxController) {
    this.controller = boxController;
    this.port = null;
  }

  /**
   * Connect to Box
   * @param {string} port - Serial port path
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async connect(port) {
    try {
      console.log(`[BoxAdapter] Attempting connection to ${port}...`);
      
      const response = await fetch(`http://localhost:5000/api/box/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ port }),
      });

      const result = await response.json();
      
      if (result.success) {
        this.port = port;
        connectionManager.handleConnect("box");
        console.log(`[BoxAdapter] ✅ Connected to Box on ${port}`);
        return { success: true };
      } else {
        console.log(`[BoxAdapter] ❌ Connection failed:`, result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error(`[BoxAdapter] Connection error:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Disconnect from Box
   * @returns {Promise<{success: boolean}>}
   */
  async disconnect() {
    try {
      const response = await fetch(`http://localhost:5000/api/box/disconnect`, {
        method: "POST",
      });

      const result = await response.json();
      this.port = null;
      return { success: true };
    } catch (error) {
      console.error(`[BoxAdapter] Disconnect error:`, error.message);
      return { success: false, error: error.message };
    }
  }
}

/**
 * Remote Controller Connection Adapter (Future - ESP32)
 * Will be used for ESP32 remote controller
 */
export class RemoteConnectionAdapter {
  constructor(remoteConfig) {
    this.config = remoteConfig;
    this.connected = false;
  }

  /**
   * Connect to Remote
   * @param {string} ipAddress - Remote IP address
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async connect(ipAddress) {
    try {
      console.log(`[RemoteAdapter] Attempting connection to ${ipAddress}...`);
      
      // Future implementation: HTTP or WebSocket connection to ESP32
      // For now, return not implemented
      return { success: false, error: "Remote connection not yet implemented" };
    } catch (error) {
      console.error(`[RemoteAdapter] Connection error:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Disconnect from Remote
   * @returns {Promise<{success: boolean}>}
   */
  async disconnect() {
    this.connected = false;
    return { success: true };
  }
}
