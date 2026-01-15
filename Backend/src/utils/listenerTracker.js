/**
 * Event Listener Tracker
 * 
 * Tracks and manages event listeners to prevent memory leaks.
 * Automatically cleans up listeners and warns about potential leaks.
 */

import HardwareConfig from "../config/hardware.config.js";

class ListenerTracker {
  constructor() {
    // Track all registered listeners
    // Structure: { emitterKey: { event: Set of { handler, metadata } } }
    this.listeners = new Map();
    
    // Track cleanup timers
    this.cleanupTimers = new Map();
    
    console.log("[ListenerTracker] Initialized");
  }

  /**
   * Generate unique key for an event emitter
   * @param {Object} emitter - Event emitter object
   * @param {string} identifier - Optional identifier
   * @returns {string}
   */
  getEmitterKey(emitter, identifier = "default") {
    return `${emitter.constructor.name}-${identifier}`;
  }

  /**
   * Register a listener
   * @param {Object} emitter - Event emitter (serialParser, socket, etc.)
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   * @param {Object} metadata - Optional metadata {id, timeout, once}
   * @returns {string} Listener ID for cleanup
   */
  register(emitter, event, handler, metadata = {}) {
    const {
      id = `listener-${Date.now()}-${Math.random()}`,
      timeout = HardwareConfig.SYSTEM.LISTENERS.CLEANUP_TIMEOUT,
      once = false,
    } = metadata;

    const emitterKey = this.getEmitterKey(emitter, metadata.emitterId);

    // Initialize structure if needed
    if (!this.listeners.has(emitterKey)) {
      this.listeners.set(emitterKey, new Map());
    }

    const emitterListeners = this.listeners.get(emitterKey);
    if (!emitterListeners.has(event)) {
      emitterListeners.set(event, new Set());
    }

    const eventListeners = emitterListeners.get(event);

    // Create wrapper handler for auto-cleanup
    const wrappedHandler = (...args) => {
      try {
        handler(...args);
        
        // Auto-cleanup if once
        if (once) {
          this.remove(emitter, event, id, metadata.emitterId);
        }
      } catch (error) {
        console.error(`[ListenerTracker] Error in listener ${id}:`, error);
        // Still cleanup if once
        if (once) {
          this.remove(emitter, event, id, metadata.emitterId);
        }
      }
    };

    // Store listener info
    eventListeners.add({
      id,
      handler,
      wrappedHandler,
      once,
      registeredAt: Date.now(),
    });

    // Actually register the listener
    emitter.on(event, wrappedHandler);

    // Set cleanup timeout
    if (timeout > 0) {
      const timerId = setTimeout(() => {
        console.warn(
          `[ListenerTracker] Auto-cleanup timeout reached for ${id} after ${timeout}ms`
        );
        this.remove(emitter, event, id, metadata.emitterId);
      }, timeout);

      this.cleanupTimers.set(id, timerId);
    }

    // Check for potential leaks
    if (HardwareConfig.SYSTEM.LISTENERS.TRACK_LEAKS) {
      this.checkForLeaks(emitterKey, event);
    }

    console.log(
      `[ListenerTracker] Registered listener ${id} for ${emitterKey}:${event} (once: ${once})`
    );

    return id;
  }

  /**
   * Remove a specific listener
   * @param {Object} emitter - Event emitter
   * @param {string} event - Event name
   * @param {string} listenerId - Listener ID from register()
   * @param {string} emitterId - Optional emitter identifier
   * @returns {boolean} Success status
   */
  remove(emitter, event, listenerId, emitterId = "default") {
    const emitterKey = this.getEmitterKey(emitter, emitterId);
    
    if (!this.listeners.has(emitterKey)) {
      return false;
    }

    const emitterListeners = this.listeners.get(emitterKey);
    if (!emitterListeners.has(event)) {
      return false;
    }

    const eventListeners = emitterListeners.get(event);
    let found = false;

    for (const listenerInfo of eventListeners) {
      if (listenerInfo.id === listenerId) {
        // Remove the actual listener
        emitter.removeListener(event, listenerInfo.wrappedHandler);
        
        // Remove from tracking
        eventListeners.delete(listenerInfo);
        
        // Clear cleanup timer
        if (this.cleanupTimers.has(listenerId)) {
          clearTimeout(this.cleanupTimers.get(listenerId));
          this.cleanupTimers.delete(listenerId);
        }
        
        found = true;
        console.log(`[ListenerTracker] Removed listener ${listenerId}`);
        break;
      }
    }

    // Cleanup empty structures
    if (eventListeners.size === 0) {
      emitterListeners.delete(event);
    }
    if (emitterListeners.size === 0) {
      this.listeners.delete(emitterKey);
    }

    return found;
  }

  /**
   * Remove all listeners for an event
   * @param {Object} emitter - Event emitter
   * @param {string} event - Event name
   * @param {string} emitterId - Optional emitter identifier
   * @returns {number} Number of listeners removed
   */
  removeAllForEvent(emitter, event, emitterId = "default") {
    const emitterKey = this.getEmitterKey(emitter, emitterId);
    
    if (!this.listeners.has(emitterKey)) {
      return 0;
    }

    const emitterListeners = this.listeners.get(emitterKey);
    if (!emitterListeners.has(event)) {
      return 0;
    }

    const eventListeners = emitterListeners.get(event);
    let count = 0;

    for (const listenerInfo of eventListeners) {
      emitter.removeListener(event, listenerInfo.wrappedHandler);
      
      if (this.cleanupTimers.has(listenerInfo.id)) {
        clearTimeout(this.cleanupTimers.get(listenerInfo.id));
        this.cleanupTimers.delete(listenerInfo.id);
      }
      
      count++;
    }

    emitterListeners.delete(event);
    
    if (emitterListeners.size === 0) {
      this.listeners.delete(emitterKey);
    }

    console.log(
      `[ListenerTracker] Removed ${count} listeners for ${emitterKey}:${event}`
    );

    return count;
  }

  /**
   * Remove all listeners for an emitter
   * @param {Object} emitter - Event emitter
   * @param {string} emitterId - Optional emitter identifier
   * @returns {number} Number of listeners removed
   */
  removeAllForEmitter(emitter, emitterId = "default") {
    const emitterKey = this.getEmitterKey(emitter, emitterId);
    
    if (!this.listeners.has(emitterKey)) {
      return 0;
    }

    const emitterListeners = this.listeners.get(emitterKey);
    let count = 0;

    for (const [event, eventListeners] of emitterListeners.entries()) {
      for (const listenerInfo of eventListeners) {
        emitter.removeListener(event, listenerInfo.wrappedHandler);
        
        if (this.cleanupTimers.has(listenerInfo.id)) {
          clearTimeout(this.cleanupTimers.get(listenerInfo.id));
          this.cleanupTimers.delete(listenerInfo.id);
        }
        
        count++;
      }
    }

    this.listeners.delete(emitterKey);

    console.log(`[ListenerTracker] Removed ${count} listeners for ${emitterKey}`);

    return count;
  }

  /**
   * Check for potential memory leaks
   * @param {string} emitterKey - Emitter key
   * @param {string} event - Event name
   */
  checkForLeaks(emitterKey, event) {
    const { MAX_PER_EVENT } = HardwareConfig.SYSTEM.LISTENERS;
    
    const emitterListeners = this.listeners.get(emitterKey);
    if (!emitterListeners) return;

    const eventListeners = emitterListeners.get(event);
    if (!eventListeners) return;

    if (eventListeners.size > MAX_PER_EVENT) {
      console.warn(
        `[ListenerTracker] ⚠️ Potential memory leak detected! ` +
        `${eventListeners.size} listeners registered for ${emitterKey}:${event} ` +
        `(threshold: ${MAX_PER_EVENT})`
      );
    }
  }

  /**
   * Get statistics about tracked listeners
   * @returns {Object} Statistics
   */
  getStats() {
    let totalListeners = 0;
    const byEmitter = {};

    for (const [emitterKey, emitterListeners] of this.listeners.entries()) {
      let emitterCount = 0;
      const byEvent = {};

      for (const [event, eventListeners] of emitterListeners.entries()) {
        byEvent[event] = eventListeners.size;
        emitterCount += eventListeners.size;
        totalListeners += eventListeners.size;
      }

      byEmitter[emitterKey] = {
        total: emitterCount,
        byEvent,
      };
    }

    return {
      totalListeners,
      totalEmitters: this.listeners.size,
      totalCleanupTimers: this.cleanupTimers.size,
      byEmitter,
    };
  }

  /**
   * Log current listener statistics
   */
  logStats() {
    const stats = this.getStats();
    console.log("[ListenerTracker] Statistics:", JSON.stringify(stats, null, 2));
  }

  /**
   * Cleanup all tracked listeners (emergency)
   */
  cleanup() {
    console.warn("[ListenerTracker] Emergency cleanup of all listeners!");
    
    let totalRemoved = 0;
    
    // Note: We can't actually remove listeners without the emitter reference
    // This just clears our tracking
    
    for (const timerId of this.cleanupTimers.values()) {
      clearTimeout(timerId);
    }
    
    totalRemoved = this.getStats().totalListeners;
    
    this.listeners.clear();
    this.cleanupTimers.clear();
    
    console.log(`[ListenerTracker] Cleared tracking for ${totalRemoved} listeners`);
  }
}

// Export singleton instance
const listenerTracker = new ListenerTracker();
export default listenerTracker;
