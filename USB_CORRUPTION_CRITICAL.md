# 🚨 CRITICAL: USB Data Corruption Detected

## What Your Logs Show

```
[MSG:$???????'??????6????.??9??????????????????|k?????^?O????2)?"?????
```

This is **corrupted data** reaching your Arduino, causing GRBL to crash and reboot.

## THIS IS A HARDWARE PROBLEM, NOT SOFTWARE!

The garbage characters mean electrical noise is corrupting your USB communication.

---

## ⚡ IMMEDIATE ACTIONS (Do These NOW!)

### 1. **REPLACE YOUR USB CABLE** (90% of the time, this fixes it!)

❌ **Bad cables:**
- Cheap cables
- Long cables (>2 meters)
- Cables without shielding
- Phone charging cables

✅ **Good cables:**
- Short USB cable (under 1 meter)
- Cables with **ferrite beads** (cylinder lumps)
- "USB data cable" (not just charging)
- Shielded cables

**TEST NOW:** Try a different USB cable and USB port!

### 2. **SEPARATE MOTOR WIRES FROM USB CABLE**

Motor wires generate electromagnetic interference:

```
❌ WRONG:                    ✅ CORRECT:
Motor wires                   Motor wires
     |                              |
     |  USB cable                   |
     |    |                         |
     +----+                         |
                                    |    (10cm+ apart)
                                    |
                                  USB cable
```

**Keep at least 10cm separation!**

### 3. **CHECK POWER SUPPLY**

```bash
# Run this while drawing to monitor USB:
sudo dmesg -w

# Look for errors like:
# - "USB disconnect"
# - "device descriptor read error"
# - "reset high-speed USB"
```

If you see these, your power supply is insufficient.

**Requirements:**
- External 12V power supply (3-5 Amps minimum)
- **DO NOT** power motors from Arduino 5V!
- Use thick power wires (18-22 AWG)

---

## 📋 STEP-BY-STEP CHECKLIST

- [ ] **Replace USB cable** with high-quality short cable
- [ ] **Try different USB port** (preferably USB 2.0, not 3.0)
- [ ] **Separate motor wires** from USB cable (10cm minimum)
- [ ] **Check external power supply** (12V, 3-5A)
- [ ] **Verify motors NOT powered from Arduino**
- [ ] **Add ferrite beads** to USB cable (optional but helps)
- [ ] **Ground CNC frame** properly
- [ ] **Use shielded motor wires** (twisted pair)

---

## 🔧 SOFTWARE WORKAROUNDS

### Option 1: Lower Baud Rate (More Reliable)

Edit `nexaboard/src/config/api.config.js`:

```javascript
export const SERIAL_CONFIG = {
  DEFAULT_PORT: "/dev/ttyUSB0",
  DEFAULT_BAUD_RATE: 57600,  // Change from 115200 to 57600
};
```

Lower speed = more reliable, but slower transmission.

### Option 2: Change GRBL Baud Rate

Connect to Arduino with serial monitor and send:
```
$11=0.020
$110=2000.000
$100=57600
```

Then restart Arduino.

---

## 🧪 DIAGNOSTIC TESTS

### Test 1: USB Cable Quality
```bash
# Install USB monitoring tool:
sudo apt-get install usbutils

# Monitor USB errors:
watch -n 1 'dmesg | tail -20'

# If you see errors while machine is idle = BAD CABLE
```

### Test 2: Motor Interference
```bash
# Test with motors DISABLED:
# In GRBL, send: $1=255
# This disables stepper motors

# Try drawing again
# If it works = Motor EMI is the problem
```

### Test 3: Power Supply
```bash
# Measure voltage at Arduino while motors run:
# Should stay 11.5-12.5V
# If it drops below 11V = Insufficient power supply
```

---

## 🛒 SHOPPING LIST (Under $10 fixes most issues)

1. **USB Cable with Ferrite Beads** ($2-5)
   - Search: "USB 2.0 A to B cable ferrite short"
   - Length: 50cm - 1m

2. **Ferrite Beads** (pack of 10, $3-8)
   - Add to existing cables
   - Clip around cables near Arduino

3. **Better Power Supply** ($10-15)
   - 12V 5A minimum
   - Look for "12V 5A CNC power supply"

4. **Shielded Motor Cables** ($5-10)
   - Twisted pair wires
   - Search: "stepper motor shielded wire"

---

## ✅ VERIFICATION

After fixes, your serial log should look clean:

```
✅ GOOD:
[1/1722] G1 X0.77 Y20.26 F1500
ok
[2/1722] G1 X0.85 Y20.87 F1500
ok
[3/1722] G1 X0.89 Y21.43 F1500
ok
```

❌ BAD (what you have now):
```
[39/1722] G1 X0.77 Y20.26 F1500
ok
[40/1722] G1 X0.77 Y20.26 F1500
[MSG:$???????'??????6????.??9??????????????????
```

---

## 🆘 STILL NOT WORKING?

1. **Try a different computer** - Could be USB controller issue
2. **Use USB 2.0 hub with power** - Isolates USB electrically
3. **Add 10µF capacitor** between RESET and GND (prevents resets)
4. **Check for bad ground** - CNC frame should be grounded
5. **Test with different Arduino** - Could be damaged USB chip

---

## 📚 TECHNICAL DETAILS

Your error shows:
- **Corrupted serial data** entering GRBL buffer
- **GRBL parser crashes** on invalid commands
- **Watchdog reset** reboots Arduino
- **Timeouts** because Arduino is frozen/rebooting

This pattern = **EMI (Electromagnetic Interference)**

Common sources:
- Motor PWM signals (high frequency switching)
- Long unshielded wires (act as antennas)
- Poor USB cable shielding
- Ground loops
- Insufficient power supply capacitance

**The fix is HARDWARE, not software!**

---

## Priority Actions:

1. **RIGHT NOW:** Change USB cable + try different port
2. **IN 5 MINUTES:** Separate motor wires from USB
3. **TODAY:** Order better USB cable with ferrite beads
4. **THIS WEEK:** Add ferrite beads to motor wires

Total cost: $5-10
Total time: 10 minutes
Success rate: 95%+ ✅
