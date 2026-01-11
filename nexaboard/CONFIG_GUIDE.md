# Configuration Guide

## Centralized Configuration

All API URLs and Serial Port settings are now managed from a single location:

**File:** `src/config/api.config.js`

## How to Change Settings

### 1. Backend Server URL

To change the backend server address (e.g., when switching between development and production):

```javascript
// In src/config/api.config.js
export const API_CONFIG = {
  BASE_URL: "http://192.168.1.34:3000",  // ← Change this
  // ...
};
```

**Examples:**
- Local development: `"http://localhost:3000"`
- Network IP: `"http://192.168.1.34:3000"`
- Production: `"https://yourdomain.com"`

### 2. Serial Port

To change the default serial port (varies by operating system):

```javascript
// In src/config/api.config.js
export const SERIAL_CONFIG = {
  DEFAULT_PORT: "/dev/ttyUSB0",  // ← Change this
  // ...
};
```

**Common Serial Ports:**
- Linux: `/dev/ttyUSB0`, `/dev/ttyACM0`
- Windows: `COM3`, `COM4`, `COM5`, etc.
- macOS: `/dev/tty.usbserial-*`

### 3. Baud Rate

To change the serial communication baud rate:

```javascript
// In src/config/api.config.js
export const SERIAL_CONFIG = {
  DEFAULT_BAUD_RATE: 115200,  // ← Change this
  // ...
};
```

**Common Baud Rates:** 9600, 19200, 38400, 57600, 115200

## Files Updated

The following files now use the centralized configuration:

### API Files
- `src/api/queueApi.js` - Queue management API
- `src/api/textApi.js` - Text conversion API
- `src/api/imageApi.js` - Image processing API

### Page Components
- `src/pages/DrawPage.jsx` - Drawing functionality
- `src/pages/QueuePage.jsx` - Queue management

### UI Components
- `src/components/SerialLogModal.jsx` - Serial communication monitor

## Quick Start

1. Open `src/config/api.config.js`
2. Update `BASE_URL` to match your backend server address
3. Update `DEFAULT_PORT` to match your serial port
4. Save the file
5. Restart the development server (`npm run dev`)

## Note

After changing these values, all API calls, Socket.IO connections, and serial port operations across the entire frontend will automatically use the new settings. No need to update multiple files!
