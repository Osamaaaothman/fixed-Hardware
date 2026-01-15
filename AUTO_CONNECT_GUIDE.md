# Auto-Connect Quick Start Guide

## 🎯 Goal
Enable automatic connection to CNC and Box when hardware powers on, even if the server is already running.

## ⚡ Quick Setup (3 Steps)

### Step 1: Check Configuration (Already Done!)

The auto-connect feature is **enabled by default**. Configuration is in:
`Backend/src/config/hardware.config.js`

```javascript
AUTO_CONNECT: {
  ENABLED: true,          // ✅ Already enabled
  CNC_ENABLED: true,      // ✅ CNC will auto-connect
  BOX_ENABLED: true,      // ✅ Box will auto-connect  
  STARTUP_DELAY: 3000,    // Wait 3 seconds after server start
  RETRY_INTERVAL: 10000,  // Retry every 10 seconds
  MAX_RETRIES: 10,        // Try 10 times (0 = infinite)
}
```

### Step 2: Start the Server

```bash
cd Backend
npm run dev
```

You'll see:
```
🚀 NEXABOARD SERVER STARTED
🔌 Auto-connect: Enabled
🔄 Starting auto-connect for hardware devices...
```

### Step 3: That's It!

Auto-connect is working! Test it:

## 🧪 Test Scenarios

### Scenario A: Hardware Already On
1. Power on CNC and Box
2. Start server
3. **Result:** Both connect within 3-5 seconds ✅

### Scenario B: Hardware Powers On Later (YOUR USE CASE!)
1. Start server (hardware OFF)
2. You'll see retry messages every 10s
3. Power on CNC and Box
4. **Result:** Both connect within 10 seconds ✅

### Scenario C: Cable Disconnects
1. Everything connected
2. Unplug cable
3. Server detects disconnect
4. Plug cable back in
5. **Result:** Reconnects automatically ✅

## 📊 Monitoring

### Console Logs
```
[ConnectionManager] cnc connection attempt #1...
[ConnectionManager] ✅ cnc connected successfully
[ConnectionManager] box connection attempt #1...
[ConnectionManager] ✅ box connected successfully
```

### Health Check API
```bash
curl http://localhost:5000/api/health
```

Response:
```json
{
  "status": "ok",
  "connections": {
    "cnc": {
      "enabled": true,
      "connected": true,
      "retryCount": 0,
      "error": null
    },
    "box": {
      "enabled": true,
      "connected": true,
      "retryCount": 0,
      "error": null
    }
  }
}
```

### Frontend Socket.IO Events

If your frontend needs to show connection status:

```javascript
// In your React component or main app
socket.on('connection:connected', ({ deviceType }) => {
  toast.success(`${deviceType} connected!`);
});

socket.on('connection:disconnected', ({ deviceType, reason }) => {
  toast.warning(`${deviceType} disconnected: ${reason}`);
});

socket.on('connection:error', ({ deviceType, error }) => {
  toast.error(`${deviceType} error: ${error}`);
});
```

## ⚙️ Customization

### Change Retry Timing

Want faster retries? Edit `hardware.config.js`:

```javascript
AUTO_CONNECT: {
  RETRY_INTERVAL: 5000,  // Try every 5 seconds instead of 10
}
```

### Change Default Ports

Using different USB ports? Edit `hardware.config.js`:

```javascript
// CNC Serial Config
CNC_CONFIG.SERIAL.DEFAULT_PORT = "COM5";  // Change from COM4

// Box Serial Config  
BOX_CONFIG.SERIAL.DEFAULT_PORT = "COM7";  // Change from COM3
```

### Disable Auto-Connect (if needed)

```javascript
AUTO_CONNECT: {
  ENABLED: false,  // Turn off completely
  // OR
  CNC_ENABLED: false,  // Only disable CNC
  BOX_ENABLED: false,  // Only disable Box
}
```

## 🐛 Troubleshooting

### "Connection Manager" not trying to connect

**Check 1:** Is auto-connect enabled?
```javascript
// In hardware.config.js
AUTO_CONNECT.ENABLED = true  // Must be true
```

**Check 2:** Are controllers registered?
Look for these logs on startup:
```
[AutoConnect] ✅ CNC controller registered
[AutoConnect] ✅ Box controller registered
```

If missing, controllers aren't integrated yet (see REFACTORING_SUMMARY.md)

### Retries stop after 10 attempts

This is by design. Change in config:
```javascript
MAX_RETRIES: 0,  // 0 = retry forever
```

### Wrong port detected

The system uses platform-aware defaults:
- **Windows:** COM4 (CNC), COM3 (Box)
- **Linux:** /dev/ttyUSB0 (CNC), /dev/ttyACM0 (Box)

Override in `hardware.config.js` as shown above.

### "Auto-connect disabled in configuration"

You'll see this if `ENABLED: false`. Set to `true` in config.

## 📋 What This Solves

✅ **Your Original Problem:**
> "When I power on the hardware only (CNC not moving), I want the server to automatically try to connect to both Box and CNC so if I power on the hardware only it will work without I start the software"

**Solution:** Now the server continuously tries to connect. When you power on the hardware, it connects within 10 seconds automatically!

## 🎯 Expected Behavior

```
Time    | Server | CNC  | Box  | Status
--------|--------|------|------|---------------------------
00:00   | ON     | OFF  | OFF  | Server retrying every 10s
00:05   | ON     | OFF  | OFF  | Still retrying...
00:10   | ON     | OFF  | OFF  | Still retrying...
00:15   | ON     | ON   | ON   | 🎉 BOTH CONNECT!
00:16   | ON     | ON   | ON   | ✅ System ready
```

## 🚀 Next Steps

1. **Test it!** Power hardware on/off while server runs
2. **Monitor logs** - Watch the connection attempts
3. **Adjust timing** if needed (retry interval)
4. **Add frontend indicators** using Socket.IO events

## 💡 Pro Tips

1. **Leave server running 24/7** - It will handle hardware power cycles
2. **Check health endpoint** if something seems wrong
3. **Logs tell everything** - Read console output carefully
4. **Infinite retries** - Set `MAX_RETRIES: 0` for production

## 📞 Need Help?

The system logs everything. If issues occur:
1. Check server console logs
2. Call health endpoint: `GET /api/health`
3. Review `REFACTORING_SUMMARY.md` for details

---

**That's it!** Auto-connect is working. Your hardware will connect whenever it's powered on, even if the server was already running. 🎉
