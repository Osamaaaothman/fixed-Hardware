/**
 * Centralized API and Serial Configuration
 *
 * Change these values here to update them across the entire application
 */

// Detect backend URL dynamically
// In production, use the same host as the frontend
// In development, use localhost:5000
const getBackendUrl = () => {
  // If running in production (built and served)
  if (import.meta.env.PROD) {
    // Use the current window location but with backend port
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:5000`;
  }
  // In development, use localhost
  return "http://localhost:5000";
};

// Backend API Configuration
export const API_CONFIG = {
  // Base URL for the backend API
  BASE_URL: getBackendUrl(),

  // API endpoints (derived from base URL)
  get ENDPOINTS() {
    return {
      QUEUE: `${this.BASE_URL}/api/queue`,
      IMAGE: `${this.BASE_URL}/api/image`,
      TEXT: `${this.BASE_URL}/api`,
      DRAW: `${this.BASE_URL}/api/draw`,
      SERIAL: `${this.BASE_URL}/api/serial`,
      FONTS: `${this.BASE_URL}/api/fonts`,
      SYSTEM_LOCK: `${this.BASE_URL}/api/system/lock`,
      SYSTEM_UNLOCK: `${this.BASE_URL}/api/system/unlock`,
      SYSTEM_STATUS: `${this.BASE_URL}/api/system/status`,
      BOX: `${this.BASE_URL}/api/box`,
      ERASING: `${this.BASE_URL}/api/erasing`,
    };
  },
};

// Serial Port Configuration
export const SERIAL_CONFIG = {
  // Default serial port (Linux: /dev/ttyACM0, Windows: COM4)
  DEFAULT_PORT: "/dev/ttyACM0",

  // Default baud rate
  // NOTE: If experiencing data corruption, try lowering to 57600 or 38400
  // Higher speeds (115200) are more susceptible to USB interference
  DEFAULT_BAUD_RATE: 115200,
};

// Socket.IO Configuration
export const SOCKET_CONFIG = {
  // Socket.IO server URL
  SERVER_URL: API_CONFIG.BASE_URL,
};

// ESP32 Camera Configuration
// ⚠️ IMPORTANT: Change this when your ESP cam IP changes
export const CAMERA_CONFIG = {
  BASE_URL: "http://192.168.1.12",
  STREAM_URL: "http://192.168.1.12:81/stream",
  CAPTURE_URL: "http://192.168.1.12/capture",
};

// Export convenience getters
export const getApiUrl = (endpoint) => {
  return API_CONFIG.ENDPOINTS[endpoint] || API_CONFIG.BASE_URL;
};

export const getSerialPort = () => SERIAL_CONFIG.DEFAULT_PORT;
export const getBaudRate = () => SERIAL_CONFIG.DEFAULT_BAUD_RATE;
