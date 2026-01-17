# Raspberry Pi Servo Controller (Node.js)

Control servo motors from your Raspberry Pi using Node.js and the `pigpio` library.

## Hardware Setup

### Wiring
```
Servo Motor          Raspberry Pi
-----------          ------------
Signal (Orange/Yellow) → GPIO Pin (e.g., GPIO 18)
VCC (Red)            → 5V (use external power for multiple servos)
GND (Brown/Black)    → GND
```

### Important Notes
- **Power**: For a single small servo, you can use Raspberry Pi 5V. For multiple servos or high-torque servos, use an external 5V power supply.
- **Ground**: Always connect servo GND to Raspberry Pi GND (common ground).
- **GPIO Pins**: Use BCM numbering (e.g., GPIO 18, not physical pin 12).

### Recommended GPIO Pins for PWM
- GPIO 12, 13, 18, 19 (hardware PWM capable)
- Any other GPIO can work with software PWM

## Installation

1. **Install pigpio daemon** (if not already installed):
```bash
sudo apt-get update
sudo apt-get install pigpio
sudo systemctl enable pigpiod
sudo systemctl start pigpiod
```

2. **Install Node.js package**:
```bash
cd Backend
npm install pigpio
```

## Usage

### Basic Example

```javascript
import servoController from './src/controllers/servoController.js';

// Initialize servo on GPIO 18
servoController.initServo(18, 'myServo');

// Set angle (0-180 degrees)
servoController.setAngle('myServo', 90); // Center position

// Move smoothly
await servoController.moveSmooth('myServo', 180, 1000); // Move to 180° over 1 second

// Sweep back and forth
await servoController.sweep('myServo', 0, 180, 3, 60); // 3 sweeps at 60°/sec

// Center the servo
servoController.center('myServo');

// Detach (stop PWM)
servoController.detach('myServo');
```

### Run Demo

```bash
cd Backend
sudo node servo-example.js
```

*Note: `sudo` is required for GPIO access*

## API Reference

### `initServo(pin, name)`
Initialize a servo on a GPIO pin.
- `pin` (number): GPIO pin number (BCM)
- `name` (string): Identifier for the servo
- Returns: `true` if successful

### `setAngle(name, angle)`
Set servo to a specific angle instantly.
- `name` (string): Servo identifier
- `angle` (number): Angle in degrees (0-180)
- Returns: `true` if successful

### `moveSmooth(name, targetAngle, duration)`
Move servo smoothly to target angle.
- `name` (string): Servo identifier
- `targetAngle` (number): Target angle (0-180)
- `duration` (number): Duration in milliseconds (default: 1000)
- Returns: Promise

### `sweep(name, minAngle, maxAngle, sweeps, speed)`
Sweep servo back and forth.
- `name` (string): Servo identifier
- `minAngle` (number): Minimum angle (default: 0)
- `maxAngle` (number): Maximum angle (default: 180)
- `sweeps` (number): Number of complete sweeps (default: 1)
- `speed` (number): Speed in degrees/second (default: 60)
- Returns: Promise

### `center(name)`
Center the servo (90°).
- `name` (string): Servo identifier

### `detach(name)`
Stop PWM signal to servo.
- `name` (string): Servo identifier

### `getAngle(name)`
Get current angle of servo.
- Returns: Current angle or `null`

### `getStatus()`
Get status of all servos.
- Returns: Object with servo states

## REST API Endpoints

If integrated with your Express server:

### Initialize Servo
```bash
POST /api/servo/init
Body: { "pin": 18, "name": "pen_servo" }
```

### Set Angle
```bash
POST /api/servo/angle
Body: { "name": "pen_servo", "angle": 90 }
```

### Move Smoothly
```bash
POST /api/servo/move-smooth
Body: { "name": "pen_servo", "angle": 180, "duration": 2000 }
```

### Sweep
```bash
POST /api/servo/sweep
Body: { "name": "pen_servo", "minAngle": 0, "maxAngle": 180, "sweeps": 3, "speed": 60 }
```

### Center
```bash
POST /api/servo/center
Body: { "name": "pen_servo" }
```

### Detach
```bash
POST /api/servo/detach
Body: { "name": "pen_servo" }
```

### Get Status
```bash
GET /api/servo/status
GET /api/servo/status?name=pen_servo
```

## Integration with Backend

Add to your `index.js`:

```javascript
import setupServoRoutes from './src/routes/servoRoutes.js';

// After creating your Express app
setupServoRoutes(app);
```

## Pen Lift Example

For a drawing robot with pen lift:

```javascript
const PEN_UP_ANGLE = 45;    // Pen lifted off paper
const PEN_DOWN_ANGLE = 90;  // Pen touching paper

// Initialize pen servo
servoController.initServo(18, 'pen');

// Pen down (start drawing)
await servoController.moveSmooth('pen', PEN_DOWN_ANGLE, 300);

// Pen up (stop drawing)
await servoController.moveSmooth('pen', PEN_UP_ANGLE, 300);
```

## Troubleshooting

### Permission Denied
- Run with `sudo` or add user to `gpio` group:
```bash
sudo usermod -a -G gpio $USER
```

### Servo Jitters
- Use external power supply for servo
- Ensure common ground between Pi and power supply
- Use hardware PWM capable pins (GPIO 12, 13, 18, 19)

### pigpiod Not Running
```bash
sudo systemctl status pigpiod
sudo systemctl start pigpiod
```

### Servo Doesn't Move
- Check wiring (signal, VCC, GND)
- Verify GPIO pin number (use BCM, not physical pin)
- Test servo with another power source
- Check if pigpiod is running

## GPIO Pin Reference (BCM Numbering)

Common PWM-capable pins:
- **GPIO 12** (Physical pin 32) - PWM0
- **GPIO 13** (Physical pin 33) - PWM1
- **GPIO 18** (Physical pin 12) - PWM0
- **GPIO 19** (Physical pin 35) - PWM1

## License

MIT
