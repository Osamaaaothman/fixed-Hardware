/**
 * Centralized API and Serial Configuration
 * 
 * Change these values here to update them across the entire application
 */

// Backend API Configuration
export const API_CONFIG = {
  // Base URL for the backend API
  BASE_URL: "http://192.168.1.34:3000",
  
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
    };
  }
};

// Serial Port Configuration
export const SERIAL_CONFIG = {
  // Default serial port (Linux: /dev/ttyUSB0, Windows: COM4)
  DEFAULT_PORT: "/dev/ttyUSB0",
  
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

// Export convenience getters
export const getApiUrl = (endpoint) => {
  return API_CONFIG.ENDPOINTS[endpoint] || API_CONFIG.BASE_URL;
};

export const getSerialPort = () => SERIAL_CONFIG.DEFAULT_PORT;
export const getBaudRate = () => SERIAL_CONFIG.DEFAULT_BAUD_RATE;
