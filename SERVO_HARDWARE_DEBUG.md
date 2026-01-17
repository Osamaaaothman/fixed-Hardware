# Servo Hardware Debugging Guide

## 🔴 Problem: Servo Makes Noise But Doesn't Move

This is a **hardware issue**, not software. The Arduino is receiving commands correctly but the servo cannot physically move.

---

## ⚡ Most Common Cause: INSUFFICIENT POWER

### Symptoms:

- Servo makes buzzing/humming noise
- Servo twitches but doesn't rotate
- Arduino resets when servo tries to move
- Servo works sometimes, not others

### Why:

**Servos draw 500mA - 1A when moving**

- USB power: ~500mA maximum (shared with Arduino)
- Arduino 5V pin: ~200mA maximum
- **Not enough current = servo can't move!**

### ✅ SOLUTION: External Power Supply

#### Option 1: Dedicated 5V Power Supply (RECOMMENDED)

```
5V 2A Power Supply
      |
      +--- Power Switch
      |
      +--- Red Wire ---> Servo VCC (Red wire)
      |
      +--- Black Wire --> Servo GND (Brown/Black wire)
                          Also connect to Arduino GND (common ground!)

Arduino Pin 6 --------> Servo Signal (Orange/Yellow wire)
```

#### Option 2: USB Power Bank

```
USB Power Bank (5V 2A output)
      |
      +--- USB to 5V adapter
      |
      +--- Connect to servo VCC + GND
      |
      +--- Common ground with Arduino
```

**CRITICAL: Always connect power supply GND to Arduino GND!**

---

## 🔧 Step-by-Step Hardware Debugging

### Step 1: Visual Inspection

Check connections:

```
Servo Wire Colors (Standard):
- Orange/Yellow = Signal --> Arduino Pin 6
- Red          = Power  --> External 5V (NOT Arduino 5V!)
- Brown/Black  = Ground --> GND + Arduino GND (common ground)

Some servos use different colors:
- White  = Signal
- Red    = Power
- Black  = Ground
```

### Step 2: Test with Simple Code

1. **Upload test sketch** to BOX Arduino:
   - Use [BOX/ServoTest/ServoTest.ino](BOX/ServoTest/ServoTest.ino)
   - This bypasses all the BOX logic

2. **Open Serial Monitor** (9600 baud)

3. **Watch the servo**:
   - ✅ Should move through positions: 0° → 90° → 180° → sweep
   - ❌ If still no movement, it's definitely power/hardware

### Step 3: Power Supply Test

**Test A: Arduino USB Power Only**

```arduino
// In ServoTest.ino, servo is powered from Arduino 5V pin
// If this doesn't work, you NEED external power
```

**Test B: External 5V Power**

```
1. Disconnect servo RED wire from Arduino
2. Connect servo RED to external 5V power supply
3. Connect power supply GND to Arduino GND (IMPORTANT!)
4. Servo should now move smoothly
```

### Step 4: Servo Health Check

**Check if servo is damaged:**

1. Disconnect servo from Arduino
2. Connect to external 5V + GND only
3. Manually rotate servo arm by hand:
   - ✅ Should move freely (no motor running)
   - ❌ If locked/grinding: servo may be damaged

4. Reconnect signal wire
5. Upload test sketch
6. Servo should move

**Try a different servo** if available to rule out faulty hardware.

---

## 🧪 Diagnostic Tests

### Test 1: Check Serial Monitor Output

**Upload newBox.ino, open Serial Monitor (9600 baud), send M3 command from backend:**

Expected output:

```
[Servo M3] Moved to: 180
```

✅ **If you see this:** Arduino is receiving commands correctly

- Problem is **hardware** (power/connection/servo)

❌ **If you DON'T see this:** Arduino not receiving commands

- Check BOX connection in backend logs
- Verify USB cable is data cable (not charge-only)

### Test 2: Multimeter Test

**Check power reaching servo:**

```
1. Set multimeter to DC voltage (20V range)
2. Touch RED probe to servo VCC wire
3. Touch BLACK probe to servo GND wire
4. Should read: 4.8V - 5.2V

If less than 4.5V: Power supply issue
If 0V: Connection problem
```

### Test 3: Current Draw Test

**Check if servo is trying to draw power:**

```
1. Use multimeter in current mode (10A range)
2. Break power wire, insert multimeter in series
3. When servo tries to move, should see:
   - 500mA - 1.5A spike (normal)
   - 0mA = servo not trying to move (damaged?)
   - High current but no movement = mechanical jam
```

---

## 🔍 Common Hardware Issues

### Issue 1: Wrong Servo Type

**Continuous Rotation Servo:**

- These servos rotate continuously like motors
- They DON'T move to specific angles
- M3 S0/S180 won't work with these
- **Solution:** Use standard positional servo (0-180°)

**How to identify:**

- Continuous servos usually labeled "360°" or "Continuous"
- Standard servos labeled "180°" or "0-180°"

### Issue 2: Mechanical Obstruction

**Symptoms:**

- Servo hums loudly
- Draws high current
- Gets hot
- Won't move

**Causes:**

- Servo arm mechanically blocked
- Gear jam inside servo
- Something physically preventing rotation

**Solutions:**

- Remove servo arm/horn completely
- Test if servo shaft rotates freely
- If internal jam, servo is likely damaged

### Issue 3: Voltage Drop

**When Arduino + Servo share USB power:**

```
USB Port: 5V 500mA
   |
   +--- Arduino: ~100mA
   +--- Servo trying to move: 800mA
   = Total: 900mA > 500mA available

Result: Voltage drops, servo can't move, Arduino may reset
```

**Solution:** Separate power supplies

### Issue 4: Signal Wire Issue

**Test signal wire:**

```arduino
// In ServoTest sketch, add:
pinMode(6, OUTPUT);
digitalWrite(6, HIGH);
delay(1000);
digitalWrite(6, LOW);
delay(1000);
// If servo doesn't respond to any signal, wire may be broken
```

---

## 📋 Quick Diagnostic Checklist

Run through this list:

- [ ] Servo connected to Pin 6 (signal wire)
- [ ] Servo GND connected to Arduino GND
- [ ] Servo VCC has 5V power (check with multimeter)
- [ ] External 5V power supply (2A minimum) connected
- [ ] Common ground between power supply and Arduino
- [ ] Uploaded ServoTest.ino and opened Serial Monitor
- [ ] Serial Monitor shows movement commands
- [ ] Servo is standard 0-180° type (not continuous)
- [ ] Servo arm removed to eliminate mechanical resistance
- [ ] Tested with different servo (if available)
- [ ] USB cable is data cable (not charge-only)

---

## 💡 Solutions Summary

### If servo doesn't move with ServoTest.ino:

**Most Likely:**

1. **Insufficient power** → Use external 5V 2A supply
2. **Damaged servo** → Replace with new servo
3. **Wrong servo type** → Use standard positional servo
4. **Mechanical jam** → Remove servo arm and test

**Less Likely:** 5. Bad signal wire → Test/replace wire 6. Wrong pin → Verify Pin 6 7. Arduino issue → Test with LED on Pin 6

### If servo moves with ServoTest but not with newBox.ino:

1. Commands not reaching Arduino → Check backend BOX connection
2. BOX code issue → Re-upload newBox.ino
3. Serial communication problem → Check baud rate (9600)

---

## 🎯 Expected Working Setup

### Wiring Diagram:

```
External 5V Power Supply (2A)
│
├─[+5V]────────────┐
│                  │
│              [Servo VCC] (Red)
│                  │
└─[GND]────┬───────┴─[Servo GND] (Brown)
           │
    Arduino GND────┘
    Arduino Pin 6─────[Servo Signal] (Orange)
```

### Test Procedure:

```
1. Upload ServoTest.ino
2. Power Arduino via USB
3. Power servo via external 5V
4. Open Serial Monitor (9600 baud)
5. Watch servo move: 0° → 90° → 180° → sweep
6. ✅ If works: Re-upload newBox.ino and test M3 commands
7. ❌ If doesn't work: Hardware fault (power/servo/wiring)
```

---

## 📞 Still Not Working?

### Try These:

1. **Swap servo** - Test with known-good servo
2. **Swap Arduino** - Test with different Arduino board
3. **Measure voltage** - Verify 5V at servo during movement
4. **Check current** - Verify servo is drawing current
5. **Test without load** - Remove servo arm completely
6. **Different power source** - Try battery pack instead of wall adapter

### Report These Details:

- Servo model/brand
- Power supply voltage and current rating
- Arduino board type
- Serial Monitor output
- Multimeter voltage reading at servo
- Does servo move at all (even slightly)?
- Does servo get warm/hot?

---

## ✅ Working Confirmation

**You'll know it's working when:**

1. Upload ServoTest.ino
2. Servo visibly rotates through positions
3. Serial Monitor shows position updates
4. No buzzing, smooth movement
5. Servo doesn't get excessively hot

**Then test with real system:**

1. Re-upload newBox.ino
2. Connect backend
3. Send M3 S180 from BOX command
4. Arduino Serial shows: `[Servo M3] Moved to: 180`
5. Servo physically moves to position
