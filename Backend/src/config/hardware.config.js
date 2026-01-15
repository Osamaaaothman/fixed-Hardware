/**
 * Centralized Hardware Configuration
 *
 * All hardware-specific constants, dimensions, timing values, and connection parameters
 * are centralized here to avoid magic numbers scattered throughout the codebase.
 *
 * @description This configuration supports multiple hardware types:
 * - CNC Machine (GRBL-based)
 * - Arduino Box Controller
 * - ESP32 Remote Controller (future addition)
 */

// ==================== CNC MACHINE CONFIGURATION ====================

export const CNC_CONFIG = {
  // Physical dimensions (mm)
  DIMENSIONS: {
    WIDTH: 95,
    HEIGHT: 130,
    MAX_X: 95,
    MAX_Y: 130,
    MIN_X: 0,
    MIN_Y: 0,
  },

  // Pen positions (Z-axis in mm)
  PEN: {
    UP: -2.3,
    DOWN: 0,
    SAFE_HEIGHT: -5.0, // Extra safe height for rapid movements
  },

  // Movement parameters
  MOVEMENT: {
    FEED_RATE: 8000, // mm/min for drawing
    RAPID_RATE: 10000, // mm/min for rapid positioning
    PLUNGE_RATE: 500, // mm/min for Z-axis movements
    ACCELERATION: 1000, // mm/s^2
  },

  // Erasing parameters
  ERASING: {
    Y_STEP: 5, // mm between horizontal passes
    OVERLAP: 0.5, // mm overlap between passes
    FEED_RATE: 8000, // mm/min for erasing movements
  },

  // Serial connection
  SERIAL: {
    BAUD_RATE: 115200,
    DATA_BITS: 8,
    PARITY: "none",
    STOP_BITS: 1,
    FLOW_CONTROL: false,
    DEFAULT_PORT: process.platform === "win32" ? "COM4" : "/dev/ttyUSB0",
  },

  // GRBL-specific timing
  GRBL: {
    INIT_TIME: 2500, // ms to wait for GRBL initialization after connection
    SOFT_RESET_DELAY: 100, // ms to wait after soft reset
    HOMING_TIMEOUT: 60000, // ms maximum time for homing cycle
    UNLOCK_DELAY: 100, // ms to wait after unlock command
  },

  // Response handling
  RESPONSE: {
    TIMEOUT: 3000, // ms to wait for GRBL response
    MAX_CONSECUTIVE_TIMEOUTS: 5, // Number of timeouts before giving up
    RETRY_DELAY: 500, // ms to wait before retry
  },
};

// ==================== BOX CONTROLLER CONFIGURATION ====================

export const BOX_CONFIG = {
  // Serial connection
  SERIAL: {
    BAUD_RATE: 9600,
    DATA_BITS: 8,
    PARITY: "none",
    STOP_BITS: 1,
    FLOW_CONTROL: false,
    DEFAULT_PORT: process.platform === "win32" ? "COM3" : "/dev/ttyACM0",
  },

  // Authentication
  AUTH: {
    PASSWORD: "1111", // Default Box password
    LOGIN_TIMEOUT: 5000, // ms to wait for login confirmation
    MAX_LOGIN_ATTEMPTS: 3, // Maximum failed login attempts
    LOCKOUT_DURATION: 300000, // ms to lock out after max attempts (5 minutes)
  },

  // Command handling
  COMMANDS: {
    TIMEOUT: 2000, // ms window for command differentiation
    MAX_LOG_SIZE: 100, // Maximum activity log entries
  },

  // Mode transitions
  MODES: {
    SWITCH_DELAY: 500, // ms to wait when switching modes
    IDLE_TIMEOUT: 300000, // ms before auto-logout (5 minutes)
  },

  // Reconnection
  RECONNECT: {
    MAX_ATTEMPTS: 5, // Maximum reconnection attempts
    INITIAL_DELAY: 1000, // ms initial delay before reconnect
    MAX_DELAY: 30000, // ms maximum delay between attempts
    BACKOFF_MULTIPLIER: 2, // Exponential backoff multiplier
  },

  // Pen configurations
  PENS: {
    pen1: {
      name: "Pen 1 (Black)",
      gcode: [
        "G90", // Absolute positioning
        "G0 Z-2.3", // Pen up
        "G0 X10 Y10", // Move to pen 1 position
        "G0 Z0", // Pen down to grab
        "G4 P500", // Dwell 500ms
        "G0 Z-2.3", // Pen up
      ],
    },
    pen2: {
      name: "Pen 2 (Color)",
      gcode: [
        "G90",
        "G0 Z-2.3",
        "G0 X50 Y10", // Move to pen 2 position
        "G0 Z0",
        "G4 P500",
        "G0 Z-2.3",
      ],
    },
    erasing_pen: {
      name: "Erasing Pen",
      gcode: [
        "G90",
        "G0 Z-2.3",
        "G0 X80 Y10", // Move to eraser position
        "G0 Z0",
        "G4 P500",
        "G0 Z-2.3",
      ],
    },
  },
};

// ==================== ESP32 REMOTE CONFIGURATION (Future) ====================

export const REMOTE_CONFIG = {
  // HTTP/WebSocket connection
  CONNECTION: {
    DEFAULT_IP: "192.168.1.100",
    HTTP_PORT: 80,
    WS_PORT: 81,
    TIMEOUT: 5000, // ms for HTTP requests
  },

  // Command protocol
  COMMANDS: {
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // ms between retries
    ACK_TIMEOUT: 2000, // ms to wait for acknowledgment
  },

  // Status polling
  POLLING: {
    ENABLED: true,
    INTERVAL: 5000, // ms between status checks
  },
};

// ==================== CAMERA CONFIGURATION ====================

export const CAMERA_CONFIG = {
  // ESP32-CAM connection
  CONNECTION: {
    DEFAULT_URL: "http://192.168.1.184",
    STREAM_PORT: 81,
    TIMEOUT: 10000, // ms for capture requests
  },

  // Capture settings
  CAPTURE: {
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // ms between retries
    MAX_SIZE: 5242880, // 5MB maximum image size
    ALLOWED_FORMATS: ["image/jpeg", "image/png"],
  },

  // Storage
  STORAGE: {
    BASE_PATH: "uploads/captures",
    MAX_CAPTURES: 100, // Maximum stored captures
    CLEANUP_THRESHOLD: 90, // Cleanup when 90% full
  },
};

// ==================== QUEUE PROCESSING CONFIGURATION ====================

export const QUEUE_CONFIG = {
  // Processing
  PROCESSING: {
    MAX_CONCURRENT: 1, // Only one queue item at a time
    RETRY_ATTEMPTS: 2, // Retry failed items
    RETRY_DELAY: 5000, // ms between retries
  },

  // Persistence
  PERSISTENCE: {
    SAVE_DEBOUNCE: 500, // ms to debounce save operations
    BACKUP_ENABLED: true,
    MAX_BACKUPS: 5, // Keep last 5 backups
    AUTO_SAVE: true,
  },

  // Timeouts
  TIMEOUTS: {
    ITEM_PROCESSING: 600000, // 10 minutes max per item
    QUEUE_IDLE: 300000, // 5 minutes before marking queue idle
  },
};

// ==================== SYSTEM CONFIGURATION ====================

export const SYSTEM_CONFIG = {
  // Auto-connect on startup
  AUTO_CONNECT: {
    ENABLED: true,
    CNC_ENABLED: true,
    BOX_ENABLED: true,
    REMOTE_ENABLED: false, // Future: ESP32 remote
    STARTUP_DELAY: 3000, // ms to wait before auto-connect
    RETRY_INTERVAL: 10000, // ms between retry attempts
    MAX_RETRIES: 10, // Maximum auto-connect retries (0 = infinite)
  },

  // Platform-specific
  PLATFORM: {
    OS: process.platform, // 'win32', 'linux', 'darwin'
    IS_WINDOWS: process.platform === "win32",
    IS_LINUX: process.platform === "linux",
    IS_MAC: process.platform === "darwin",
  },

  // Logging
  LOGGING: {
    LEVEL: process.env.LOG_LEVEL || "info", // 'debug', 'info', 'warn', 'error'
    MAX_LOG_SIZE: 1000, // Maximum log entries in memory
    CONSOLE_COLORS: true,
  },

  // Event listener management
  LISTENERS: {
    MAX_PER_EVENT: 10, // Warn if more than this many listeners
    CLEANUP_TIMEOUT: 120000, // ms before force cleanup
    TRACK_LEAKS: true,
  },
};

// ==================== SECURITY CONFIGURATION ====================

export const SECURITY_CONFIG = {
  // System lock
  LOCK: {
    ENABLED: process.env.ENABLE_SYSTEM_LOCK === "true",
    SECRET_CODE: process.env.LOCK_SECRET || "1234", // Override via environment
    MAX_ATTEMPTS: 5,
    LOCKOUT_DURATION: 900000, // 15 minutes
    REQUIRE_HASH: true, // Use bcrypt for password verification
  },

  // Rate limiting
  RATE_LIMIT: {
    WINDOW_MS: 60000, // 1 minute
    MAX_REQUESTS: 100, // Max requests per window
    SKIP_SUCCESSFUL: false,
  },

  // Input validation
  VALIDATION: {
    MAX_GCODE_LINES: 100000, // Maximum G-code lines per job
    MAX_GCODE_LINE_LENGTH: 256, // Maximum characters per G-code line
    ALLOWED_GCODES: [
      "G0",
      "G1",
      "G2",
      "G3",
      "G4",
      "G17",
      "G20",
      "G21",
      "G90",
      "G91",
      "M3",
      "M5",
      "M8",
      "M9",
    ],
    FORBIDDEN_GCODES: ["M999"], // Reset command - dangerous
  },
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Get serial port configuration for a specific device type
 * @param {'cnc' | 'box' | 'remote'} deviceType
 * @returns {Object} Serial port configuration
 */
export function getSerialConfig(deviceType) {
  switch (deviceType) {
    case "cnc":
      return CNC_CONFIG.SERIAL;
    case "box":
      return BOX_CONFIG.SERIAL;
    case "remote":
      // Future: Remote might not use serial
      return null;
    default:
      throw new Error(`Unknown device type: ${deviceType}`);
  }
}

/**
 * Get retry configuration with exponential backoff
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {Object} config - Config object with INITIAL_DELAY and MAX_DELAY
 * @returns {number} Delay in milliseconds
 */
export function getRetryDelay(attempt, config) {
  const {
    INITIAL_DELAY = 1000,
    MAX_DELAY = 30000,
    BACKOFF_MULTIPLIER = 2,
  } = config;
  const delay = INITIAL_DELAY * Math.pow(BACKOFF_MULTIPLIER, attempt);
  return Math.min(delay, MAX_DELAY);
}

/**
 * Validate G-code line against security rules
 * @param {string} line - G-code line to validate
 * @returns {{valid: boolean, error?: string}}
 */
export function validateGcodeLine(line) {
  const trimmed = line.trim().toUpperCase();

  // Empty lines and comments are okay
  if (!trimmed || trimmed.startsWith("(") || trimmed.startsWith(";")) {
    return { valid: true };
  }

  // Check line length
  if (trimmed.length > SECURITY_CONFIG.VALIDATION.MAX_GCODE_LINE_LENGTH) {
    return { valid: false, error: "G-code line too long" };
  }

  // Check for forbidden commands
  for (const forbidden of SECURITY_CONFIG.VALIDATION.FORBIDDEN_GCODES) {
    if (trimmed.includes(forbidden)) {
      return { valid: false, error: `Forbidden G-code: ${forbidden}` };
    }
  }

  return { valid: true };
}

/**
 * Check if auto-connect is enabled for a device type
 * @param {'cnc' | 'box' | 'remote'} deviceType
 * @returns {boolean}
 */
export function shouldAutoConnect(deviceType) {
  if (!SYSTEM_CONFIG.AUTO_CONNECT.ENABLED) {
    return false;
  }

  switch (deviceType) {
    case "cnc":
      return SYSTEM_CONFIG.AUTO_CONNECT.CNC_ENABLED;
    case "box":
      return SYSTEM_CONFIG.AUTO_CONNECT.BOX_ENABLED;
    case "remote":
      return SYSTEM_CONFIG.AUTO_CONNECT.REMOTE_ENABLED;
    default:
      return false;
  }
}

// ==================== CONFIGURATION EXPORT ====================

export default {
  CNC: CNC_CONFIG,
  BOX: BOX_CONFIG,
  REMOTE: REMOTE_CONFIG,
  CAMERA: CAMERA_CONFIG,
  QUEUE: QUEUE_CONFIG,
  SYSTEM: SYSTEM_CONFIG,
  SECURITY: SECURITY_CONFIG,

  // Helper functions
  getSerialConfig,
  getRetryDelay,
  validateGcodeLine,
  shouldAutoConnect,
};
