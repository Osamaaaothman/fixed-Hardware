/**
 * Hardware Connection Manager
 * 
 * Manages automatic connection and reconnection to hardware devices:
 * - CNC Machine (GRBL via Serial)
 * - Box Controller (Arduino via Serial)
 * - Remote Controller (ESP32 via WiFi - future)
 * 
 * Features:
 * - Auto-connect on startup
 * - Auto-reconnect on disconnection
 * - Exponential backoff retry logic
 * - Unified connection state management
 * - Extensible for future hardware types
 */

import HardwareConfig from "../config/hardware.config.js";

class ConnectionManager {
  constructor() {
    // Connection state for each device type
    this.connections = {
      cnc: {
        enabled: false,
        connected: false,
        connecting: false,
        retryCount: 0,
        lastAttempt: null,
        error: null,
        controller: null,
      },
      box: {
        enabled: false,
        connected: false,
        connecting: false,
        retryCount: 0,
        lastAttempt: null,
        error: null,
        controller: null,
      },
      remote: {
        enabled: false,
        connected: false,
        connecting: false,
        retryCount: 0,
        lastAttempt: null,
        error: null,
        controller: null,
      },
    };

    // Retry timers
    this.retryTimers = {
      cnc: null,
      box: null,
      remote: null,
    };

    // Startup timer
    this.startupTimer = null;

    // Event listeners
    this.eventHandlers = {
      onConnect: {},
      onDisconnect: {},
      onError: {},
    };

    console.log("[ConnectionManager] Initialized");
  }

  /**
   * Register controller for a device type
   * @param {'cnc' | 'box' | 'remote'} deviceType
   * @param {Object} controller - Controller instance with connect/disconnect methods
   */
  registerController(deviceType, controller) {
    if (!this.connections[deviceType]) {
      throw new Error(`Unknown device type: ${deviceType}`);
    }

    if (!controller.connect || typeof controller.connect !== "function") {
      throw new Error(`Controller must have a 'connect' method`);
    }

    if (!controller.disconnect || typeof controller.disconnect !== "function") {
      throw new Error(`Controller must have a 'disconnect' method`);
    }

    this.connections[deviceType].controller = controller;
    this.connections[deviceType].enabled = HardwareConfig.shouldAutoConnect(deviceType);

    console.log(
      `[ConnectionManager] Registered ${deviceType} controller (auto-connect: ${this.connections[deviceType].enabled})`
    );
  }

  /**
   * Start auto-connect process for all enabled devices
   */
  async startAutoConnect() {
    const { ENABLED, STARTUP_DELAY } = HardwareConfig.SYSTEM.AUTO_CONNECT;

    if (!ENABLED) {
      console.log("[ConnectionManager] Auto-connect is disabled in configuration");
      return;
    }

    console.log(`[ConnectionManager] Starting auto-connect in ${STARTUP_DELAY}ms...`);

    // Wait for system startup delay
    this.startupTimer = setTimeout(() => {
      this.attemptConnectAll();
    }, STARTUP_DELAY);
  }

  /**
   * Attempt to connect all enabled devices
   */
  async attemptConnectAll() {
    console.log("[ConnectionManager] Attempting to connect all enabled devices...");

    const promises = [];

    for (const [deviceType, state] of Object.entries(this.connections)) {
      if (state.enabled && !state.connected && !state.connecting) {
        promises.push(this.attemptConnect(deviceType));
      }
    }

    await Promise.allSettled(promises);
  }

  /**
   * Attempt to connect a specific device
   * @param {'cnc' | 'box' | 'remote'} deviceType
   * @returns {Promise<boolean>} Success status
   */
  async attemptConnect(deviceType) {
    const state = this.connections[deviceType];

    if (!state.enabled) {
      console.log(`[ConnectionManager] ${deviceType} auto-connect is disabled`);
      return false;
    }

    if (!state.controller) {
      console.log(`[ConnectionManager] ${deviceType} controller not registered yet`);
      return false;
    }

    if (state.connected) {
      console.log(`[ConnectionManager] ${deviceType} already connected`);
      return true;
    }

    if (state.connecting) {
      console.log(`[ConnectionManager] ${deviceType} connection already in progress`);
      return false;
    }

    // Check max retries
    const { MAX_RETRIES } = HardwareConfig.SYSTEM.AUTO_CONNECT;
    if (MAX_RETRIES > 0 && state.retryCount >= MAX_RETRIES) {
      console.log(
        `[ConnectionManager] ${deviceType} max retry attempts (${MAX_RETRIES}) reached`
      );
      return false;
    }

    state.connecting = true;
    state.lastAttempt = Date.now();
    state.retryCount++;

    console.log(
      `[ConnectionManager] ${deviceType} connection attempt #${state.retryCount}...`
    );

    try {
      // Get default port for device type
      const serialConfig = HardwareConfig.getSerialConfig(deviceType);
      const port = serialConfig?.DEFAULT_PORT;

      // Attempt connection through controller
      const result = await state.controller.connect(port);

      if (result && result.success) {
        state.connected = true;
        state.connecting = false;
        state.retryCount = 0;
        state.error = null;

        console.log(`[ConnectionManager] ✅ ${deviceType} connected successfully`);
        this.emitEvent("onConnect", deviceType, { port });

        return true;
      } else {
        throw new Error(result?.error || "Connection failed");
      }
    } catch (error) {
      state.connected = false;
      state.connecting = false;
      state.error = error.message;

      console.error(
        `[ConnectionManager] ❌ ${deviceType} connection failed:`,
        error.message
      );
      this.emitEvent("onError", deviceType, { error: error.message });

      // Schedule retry
      this.scheduleRetry(deviceType);

      return false;
    }
  }

  /**
   * Schedule a retry for a device
   * @param {'cnc' | 'box' | 'remote'} deviceType
   */
  scheduleRetry(deviceType) {
    const state = this.connections[deviceType];
    const { RETRY_INTERVAL } = HardwareConfig.SYSTEM.AUTO_CONNECT;

    // Clear existing timer
    if (this.retryTimers[deviceType]) {
      clearTimeout(this.retryTimers[deviceType]);
    }

    // Calculate retry delay with exponential backoff
    const baseDelay = RETRY_INTERVAL;
    const backoffMultiplier = 1.5;
    const maxDelay = 60000; // Max 1 minute
    const delay = Math.min(
      baseDelay * Math.pow(backoffMultiplier, state.retryCount - 1),
      maxDelay
    );

    console.log(
      `[ConnectionManager] ${deviceType} retry scheduled in ${Math.round(delay / 1000)}s (attempt ${state.retryCount + 1})`
    );

    this.retryTimers[deviceType] = setTimeout(() => {
      this.attemptConnect(deviceType);
    }, delay);
  }

  /**
   * Notify manager that a device has disconnected
   * @param {'cnc' | 'box' | 'remote'} deviceType
   * @param {string} reason - Disconnection reason
   */
  handleDisconnect(deviceType, reason = "Unknown") {
    const state = this.connections[deviceType];

    if (!state.connected) {
      return; // Already disconnected
    }

    state.connected = false;
    state.connecting = false;
    state.error = reason;

    console.log(`[ConnectionManager] ${deviceType} disconnected: ${reason}`);
    this.emitEvent("onDisconnect", deviceType, { reason });

    // Auto-reconnect if enabled
    if (state.enabled) {
      console.log(`[ConnectionManager] ${deviceType} auto-reconnect initiated`);
      this.scheduleRetry(deviceType);
    }
  }

  /**
   * Notify manager that a device has connected (externally)
   * @param {'cnc' | 'box' | 'remote'} deviceType
   */
  handleConnect(deviceType) {
    const state = this.connections[deviceType];

    state.connected = true;
    state.connecting = false;
    state.retryCount = 0;
    state.error = null;

    // Clear retry timer
    if (this.retryTimers[deviceType]) {
      clearTimeout(this.retryTimers[deviceType]);
      this.retryTimers[deviceType] = null;
    }

    console.log(`[ConnectionManager] ${deviceType} marked as connected`);
  }

  /**
   * Enable/disable auto-connect for a device
   * @param {'cnc' | 'box' | 'remote'} deviceType
   * @param {boolean} enabled
   */
  setAutoConnect(deviceType, enabled) {
    const state = this.connections[deviceType];
    state.enabled = enabled;

    console.log(`[ConnectionManager] ${deviceType} auto-connect ${enabled ? "enabled" : "disabled"}`);

    if (enabled && !state.connected && !state.connecting) {
      this.attemptConnect(deviceType);
    } else if (!enabled && this.retryTimers[deviceType]) {
      clearTimeout(this.retryTimers[deviceType]);
      this.retryTimers[deviceType] = null;
    }
  }

  /**
   * Get connection status for a device
   * @param {'cnc' | 'box' | 'remote'} deviceType
   * @returns {Object} Connection state
   */
  getStatus(deviceType) {
    const state = this.connections[deviceType];
    return {
      enabled: state.enabled,
      connected: state.connected,
      connecting: state.connecting,
      retryCount: state.retryCount,
      lastAttempt: state.lastAttempt,
      error: state.error,
      hasController: state.controller !== null,
    };
  }

  /**
   * Get status for all devices
   * @returns {Object} All connection states
   */
  getAllStatus() {
    return {
      cnc: this.getStatus("cnc"),
      box: this.getStatus("box"),
      remote: this.getStatus("remote"),
    };
  }

  /**
   * Register event handler
   * @param {'onConnect' | 'onDisconnect' | 'onError'} event
   * @param {string} handlerId - Unique handler ID
   * @param {Function} callback
   */
  on(event, handlerId, callback) {
    if (!this.eventHandlers[event]) {
      throw new Error(`Unknown event: ${event}`);
    }

    this.eventHandlers[event][handlerId] = callback;
  }

  /**
   * Unregister event handler
   * @param {'onConnect' | 'onDisconnect' | 'onError'} event
   * @param {string} handlerId
   */
  off(event, handlerId) {
    if (this.eventHandlers[event] && this.eventHandlers[event][handlerId]) {
      delete this.eventHandlers[event][handlerId];
    }
  }

  /**
   * Emit event to all registered handlers
   * @param {'onConnect' | 'onDisconnect' | 'onError'} event
   * @param {string} deviceType
   * @param {Object} data
   */
  emitEvent(event, deviceType, data) {
    const handlers = this.eventHandlers[event];
    if (!handlers) return;

    for (const [handlerId, callback] of Object.entries(handlers)) {
      try {
        callback(deviceType, data);
      } catch (error) {
        console.error(
          `[ConnectionManager] Error in ${event} handler ${handlerId}:`,
          error
        );
      }
    }
  }

  /**
   * Stop all auto-connect and retry timers
   */
  stop() {
    console.log("[ConnectionManager] Stopping all auto-connect timers...");

    // Clear startup timer
    if (this.startupTimer) {
      clearTimeout(this.startupTimer);
      this.startupTimer = null;
    }

    // Clear all retry timers
    for (const [deviceType, timer] of Object.entries(this.retryTimers)) {
      if (timer) {
        clearTimeout(timer);
        this.retryTimers[deviceType] = null;
      }
    }

    // Disable all auto-connect
    for (const deviceType of Object.keys(this.connections)) {
      this.connections[deviceType].enabled = false;
    }

    console.log("[ConnectionManager] Stopped");
  }

  /**
   * Manually retry connection for a device
   * @param {'cnc' | 'box' | 'remote'} deviceType
   */
  async retry(deviceType) {
    const state = this.connections[deviceType];

    // Clear retry timer
    if (this.retryTimers[deviceType]) {
      clearTimeout(this.retryTimers[deviceType]);
      this.retryTimers[deviceType] = null;
    }

    // Reset retry count for manual retry
    state.retryCount = 0;

    // Attempt connection
    return await this.attemptConnect(deviceType);
  }

  /**
   * Reset retry counter for a device
   * @param {'cnc' | 'box' | 'remote'} deviceType
   */
  resetRetryCount(deviceType) {
    this.connections[deviceType].retryCount = 0;
  }
}

// Export singleton instance
const connectionManager = new ConnectionManager();
export default connectionManager;
