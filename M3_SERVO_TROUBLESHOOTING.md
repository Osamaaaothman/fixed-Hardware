# M3 Servo Command Troubleshooting Guide

## ✅ Implementation Summary

### What Changed:
1. **M3 commands NOW ONLY go to BOX** - Never to CNC
2. **Error handling added** - Clear error message if BOX is not connected
3. **Enhanced logging** - Detailed debug output to track M3 routing

---

## 📌 Critical Rules

### M3 Command Routing:
```
M3 S0   → BOX Servo → 0° (Pen UP position)
M3 S180 → BOX Servo → 180° (Pen DOWN position)

❌ NEVER goes to CNC
✅ ALWAYS goes to BOX only
```

### BOX Connection Required:
- **BOX MUST be connected** before sending M3 commands
- If BOX is disconnected, M3 commands will be **skipped with error**
- Check backend logs for: `❌ BOX NOT CONNECTED`

---

## 🔍 Debugging "Makes Noise But Doesn't Move"

### Backend Logs to Check:

#### 1. **From Serial Controller** (when sending G-code):
```
✅ Good - M3 command routed to BOX:
[SERIAL] ⚡ M3 command detected: M3 S180
[SERIAL] BOX Status - Port: exists, Open: YES
[SERIAL] ✅ Routing M3 S180 → BOX Arduino (Servo Control)
[SERIAL] ✅ Successfully sent M3 S180 to BOX Arduino

❌ Bad - BOX not connected:
[SERIAL] ⚡ M3 command detected: M3 S180
[SERIAL] BOX Status - Port: null, Open: NO
[SERIAL] ❌ BOX NOT CONNECTED: Cannot send M3 command (M3 S180)
```

#### 2. **From BOX Controller** (when sending via BOX command box):
```
✅ Good - Command sent to BOX:
[BOX] 🔧 M3 Servo Command: M3 S180
[BOX]    └─> Action: Pen DOWN (180°)
[BOX] ✅ Command sent: M3 S180

❌ Bad - BOX not connected:
[BOX] ❌ Error sending command "M3 S180": <error details>
```

---

### Arduino Serial Monitor Output:

Open Arduino Serial Monitor (9600 baud) and look for:

#### ✅ **Success Messages:**
```
[Servo M3] Moved to: 180
[Servo M3] Moved to: 0
```

#### ❌ **Error Messages:**
```
[Servo M3] Invalid format (missing S)
```
**Fix:** Ensure command is exactly `M3 S0` or `M3 S180` (no extra spaces)

```
[Server] Ignored (user not logged in)
```
**Fix:** Send "ready" command first to login (but M3 should work without login)

---

## 🔧 Hardware Troubleshooting

### If Arduino Shows "Moved to: 180" but Servo Doesn't Move:

#### 1. **Check Servo Power:**
- Servos need **5V and sufficient current** (>500mA)
- Arduino USB power may not be enough
- Use external 5V power supply connected to Arduino VIN/GND

#### 2. **Check Physical Connection:**
- Servo signal wire → **Pin 6** on Arduino
- Servo power (red) → **5V**
- Servo ground (brown/black) → **GND**

#### 3. **Test Servo Directly:**
Upload test code to verify servo works:
```cpp
#include <Servo.h>
Servo testServo;

void setup() {
  testServo.attach(6);
  testServo.write(90);  // Middle position
  delay(1000);
}

void loop() {
  testServo.write(0);    // Min position
  delay(1000);
  testServo.write(180);  // Max position
  delay(1000);
}
```

#### 4. **Check Servo Type:**
- Standard servos: 0-180° (typical)
- Continuous rotation servos: Won't work for position control
- Micro servos: May need different angles (0-90° sometimes)

#### 5. **Verify Servo Isn't Mechanically Blocked:**
- Disconnect servo arm from any mechanism
- Test if servo rotates freely
- Reattach and ensure no binding

---

## 🧪 Testing Procedure

### Test 1: Backend to BOX Connection
```bash
# Check backend logs when starting server
# Should see:
[BOX] Attempting auto-connect to Box on /dev/ttyACM0...
[BOX] Connected to Box on /dev/ttyACM0
```

### Test 2: Send M3 from BOX Command Box
1. Open frontend
2. Navigate to BOX Control panel
3. Send: `M3 S0` (pen up)
4. Send: `M3 S180` (pen down)
5. Watch Arduino Serial Monitor for responses

### Test 3: Send M3 from CNC G-code
1. Create simple G-code:
   ```
   G90
   M3 S180
   G4 P1000
   M3 S0
   ```
2. Send via CNC interface
3. Backend should show: `✅ Routing M3 S180 → BOX Arduino`

---

## 📋 Quick Checklist

- [ ] BOX Arduino connected via USB (/dev/ttyACM0 on Linux, COM port on Windows)
- [ ] Backend shows: `[BOX] Connected to Box`
- [ ] Servo physically connected to Pin 6
- [ ] Servo has adequate power (external 5V recommended)
- [ ] Arduino Serial Monitor shows: `[Servo M3] Moved to: <angle>`
- [ ] Command format is exact: `M3 S0` or `M3 S180`
- [ ] No mechanical obstruction on servo

---

## 🎯 Expected Behavior

### When Everything Works:

**Frontend → BOX Command:**
```
User sends: M3 S180
↓
Backend receives at /box/command
↓
Backend validates BOX is connected
↓
Backend sends "M3 S180\n" to /dev/ttyACM0
↓
Arduino receives and parses command
↓
Arduino executes: servoM3.write(180)
↓
Servo moves to 180°
↓
Arduino prints: [Servo M3] Moved to: 180
```

**CNC G-code with M3:**
```
CNC sends G-code with: M3 S180
↓
Serial controller detects M3 command
↓
Checks: Is M3 S0 or M3 S180? YES
↓
Checks: Is BOX connected? YES
↓
Routes to BOX (skips CNC)
↓
Same flow as above
```

---

## 🐛 Common Issues

### Issue: "M3 commands still going to CNC"
**Cause:** BOX not connected when G-code is sent
**Solution:** Ensure BOX is connected before starting drawing operations

### Issue: "Servo makes noise (buzzing) but doesn't move"
**Causes:**
1. Insufficient power - servo trying to move but can't
2. Servo mechanically blocked
3. Wrong servo type (continuous rotation)
4. Faulty servo

**Solutions:**
1. Use external 5V power supply (2A minimum)
2. Remove mechanical load and test
3. Replace with standard positional servo
4. Test with different servo

### Issue: "No response from Arduino"
**Causes:**
1. Wrong baud rate
2. Wrong COM port
3. Arduino not running BOX firmware

**Solutions:**
1. Verify 9600 baud in Serial Monitor
2. Check BOX is on correct port (/dev/ttyACM0 or COM port)
3. Re-upload newBox.ino to Arduino

---

## 📞 Support Information

**Backend Files:**
- M3 Routing: `Backend/src/controllers/serialController.js` (lines 544-599)
- BOX Commands: `Backend/src/controllers/boxController.js` (lines 1156-1200)

**Arduino File:**
- M3 Handler: `BOX/newBox/newBox.ino` (lines 1571-1587)
- Servo Init: `BOX/newBox/newBox.ino` (lines 1381-1382)
- Pin Definition: `BOX/newBox/newBox.ino` (line 21)

**Debug Logs:**
- Enable verbose logging in backend console
- Monitor Arduino Serial output at 9600 baud
- Check frontend console for errors
