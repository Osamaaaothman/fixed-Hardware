# GRBL Serial Communication Troubleshooting

## Issue: GRBL Resets During Operation

### Symptoms
- G-code sending stops mid-operation
- See `??` in serial output
- Followed by `Grbl 1.1h ['$' for help]` message
- Arduino appears to reboot

### Root Causes & Fixes Applied

#### 1. **DTR (Data Terminal Ready) Reset** ✅ FIXED
**Problem:** When opening a serial connection, the DTR line toggles, which triggers the Arduino's auto-reset circuit.

**Solution Applied:**
```javascript
// Prevent DTR from resetting Arduino
activePort = new SerialPort({
  path: port,
  baudRate: baudRate,
  autoOpen: false,
  hupcl: false,      // Disable hangup on close
  lock: false,
});

// After opening, explicitly disable DTR/RTS
activePort.set({ dtr: false, rts: false });
```

#### 2. **GRBL Reset Detection** ✅ FIXED
**Problem:** Need to detect when GRBL resets unexpectedly.

**Solution Applied:**
- Added detection for GRBL startup message
- Stops transmission if reset detected
- Logs error to frontend

#### 3. **Response Timeout** ✅ FIXED
**Problem:** If Arduino doesn't respond, the system hangs forever.

**Solution Applied:**
- Added 5-second timeout per command
- Automatically continues if timeout occurs
- Logs timeout errors

### Additional Troubleshooting Steps

#### Hardware Solutions

1. **Disable Auto-Reset (Recommended)**
   - Add a 10µF capacitor between RESET and GND pins on Arduino
   - This prevents DTR from triggering reset
   - OR: Cut the RESET-EN trace on Arduino board (permanent)

2. **Check Power Supply**
   - Unstable power can cause resets
   - Use external 12V power supply for CNC
   - Don't power motors from Arduino 5V

3. **Check USB Cable**
   - Use high-quality USB cable with good shielding
   - Shorter cables are better
   - Avoid USB hubs

4. **Check Wiring**
   - Motor wires can cause EMI (electromagnetic interference)
   - Keep motor wires away from Arduino/USB cable
   - Use shielded cables for motors

#### Software Solutions

1. **Slower Communication**
   If still having issues, add delay between commands:
   ```javascript
   // Add small delay between commands
   await new Promise(resolve => setTimeout(resolve, 10));
   ```

2. **Check GRBL Buffer**
   GRBL has a limited buffer. Our current implementation waits for "ok" before sending next line, which is correct.

3. **GRBL Settings**
   Check your GRBL settings (send `$$` command):
   - `$10` should be `0` or `1` (status report mask)
   - `$11` should be `0.010` (junction deviation)

### Testing

Test the fix with:
```bash
# From Backend directory
npm start

# Then test drawing from frontend
```

### Monitor Serial Communication

Add this to your Arduino sketch for debugging:
```cpp
// In setup()
Serial.println("GRBL Ready");

// Monitor for unexpected resets
```

### If Problem Persists

1. **Check Backend logs** for detailed error messages
2. **Use Arduino IDE Serial Monitor** to test commands manually
3. **Test with simpler G-code** (fewer lines)
4. **Try different baud rate** (9600 instead of 115200)

### References
- [GRBL Wiki](https://github.com/gnea/grbl/wiki)
- [Arduino Auto-Reset](https://www.arduino.cc/en/Main/Disabling)
- Serial Port Node.js [Documentation](https://serialport.io/docs/)
