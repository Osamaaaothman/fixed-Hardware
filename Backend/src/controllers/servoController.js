import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Servo Controller for Raspberry Pi
 * Controls servo motors using PWM on GPIO pins via pigpio daemon
 * 
 * Servo typically uses:
 * - 1000μs (1ms) pulse = 0° position
 * - 1500μs (1.5ms) pulse = 90° position (center)
 * - 2000μs (2ms) pulse = 180° position
 */

// Check if pigpio daemon is available
let pigpioAvailable = false;

try {
  await execAsync('pigs hwver');
  pigpioAvailable = true;
  console.log('[SERVO] ✅ pigpio daemon is available');
} catch (error) {
  console.warn('[SERVO] ⚠️ pigpio daemon not available - will run in MOCK mode');
}

class ServoController {
  constructor() {
    this.servos = new Map();
  }

  /**
   * Initialize a servo on a specific GPIO pin
   * @param {number} pin - GPIO pin number (BCM numbering)
   * @param {string} name - Name identifier for the servo
   */
  initServo(pin, name = `servo_${pin}`) {
    if (this.servos.has(name)) {
      console.log(`[SERVO] Servo "${name}" already initialized`);
      return true;
    }

    const mockMode = !pigpioAvailable;

    this.servos.set(name, { 
      pin, 
      currentAngle: 0,
      mockMode
    });
    
    // Set to center position initially
    this.setAngle(name, 0);
    
    if (mockMode) {
      console.log(`[SERVO] ✓ Initialized servo "${name}" on GPIO pin ${pin} (MOCK MODE - simulation only)`);
    } else {
      console.log(`[SERVO] ✓ Initialized servo "${name}" on GPIO pin ${pin} (HARDWARE MODE)`);
    }
    return true;
  }

  /**
   * Set servo angle (0-180 degrees)
   * @param {string} name - Servo name
   * @param {number} angle - Angle in degrees (0-180)
   */
  setAngle(name, angle) {
    try {
      const servo = this.servos.get(name);
      if (!servo) {
        console.error(`[SERVO] Servo "${name}" not found`);
        return { success: false, message: `Servo "${name}" not found` };
      }

      // Clamp angle between 0 and 180
      angle = Math.max(0, Math.min(180, angle));

      // SG90 servo calibration values
      // SG90 typically works best with 500-2400μs range
      const MIN_PW = 500;    // microseconds for 0°
      const MAX_PW = 2400;   // microseconds for 180°

      const pulseWidth = MIN_PW + (angle / 180) * (MAX_PW - MIN_PW);
      
      if (servo.mockMode) {
        // Simulation mode
        console.log(`[SERVO] 🎯 Mock: Setting "${name}" to ${angle}° (${pulseWidth.toFixed(0)}μs) - SIMULATION ONLY`);
      } else {
        // Real hardware control using pigs command
        execAsync(`pigs s ${servo.pin} ${pulseWidth.toFixed(0)}`)
          .then(() => {
            console.log(`[SERVO] ⚡ Hardware: Set "${name}" (GPIO ${servo.pin}) to ${angle}° (${pulseWidth.toFixed(0)}μs)`);
          })
          .catch(err => {
            console.error(`[SERVO] Error setting servo:`, err.message);
          });
      }
      
      servo.currentAngle = angle;
      return { success: true, angle: angle, pulseWidth: pulseWidth, mockMode: servo.mockMode };
    } catch (error) {
      console.error(`[SERVO] Failed to set angle for "${name}":`, error.message);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get current angle of servo
   * @param {string} name - Servo name
   */
  getAngle(name) {
    const servo = this.servos.get(name);
    return servo ? servo.currentAngle : null;
  }

  /**
   * Move servo smoothly from current position to target angle
   * @param {string} name - Servo name
   * @param {number} targetAngle - Target angle (0-180)
   * @param {number} duration - Duration in milliseconds
   */
  async moveSmooth(name, targetAngle, duration = 1000) {
    const servo = this.servos.get(name);
    if (!servo) {
      console.error(`[SERVO] Servo "${name}" not found`);
      return false;
    }

    const startAngle = servo.currentAngle;
    const angleChange = targetAngle - startAngle;
    const steps = 50; // Number of steps for smooth motion
    const stepDelay = duration / steps;
    const angleStep = angleChange / steps;

    for (let i = 1; i <= steps; i++) {
      const angle = startAngle + (angleStep * i);
      this.setAngle(name, angle);
      await new Promise(resolve => setTimeout(resolve, stepDelay));
    }

    return true;
  }

  /**
   * Sweep servo back and forth between two angles
   * @param {string} name - Servo name
   * @param {number} minAngle - Minimum angle
   * @param {number} maxAngle - Maximum angle
   * @param {number} sweeps - Number of complete sweeps
   * @param {number} speed - Speed in degrees per second
   */
  async sweep(name, minAngle = 0, maxAngle = 180, sweeps = 1, speed = 60) {
    const servo = this.servos.get(name);
    if (!servo) {
      console.error(`[SERVO] Servo "${name}" not found`);
      return false;
    }

    const angleRange = Math.abs(maxAngle - minAngle);
    const duration = (angleRange / speed) * 1000; // Convert to milliseconds

    for (let i = 0; i < sweeps; i++) {
      console.log(`[SERVO] Sweep ${i + 1}/${sweeps}`);
      await this.moveSmooth(name, maxAngle, duration);
      await this.moveSmooth(name, minAngle, duration);
    }

    return true;
  }

  /**
   * Center the servo (90 degrees)
   * @param {string} name - Servo name
   */
  center(name) {
    return this.setAngle(name, 90);
  }

  /**
   * Detach servo (stop sending PWM signal)
   * @param {string} name - Servo name
   */
  detach(name) {
    const servo = this.servos.get(name);
    if (servo && !servo.mockMode) {
      execAsync(`pigs s ${servo.pin} 0`).catch(err => {
        console.error(`[SERVO] Error detaching servo:`, err.message);
      });
      console.log(`[SERVO] Detached servo "${name}"`);
      return true;
    }
    return false;
  }

  /**
   * Cleanup and release all servos
   */
  cleanup() {
    console.log('[SERVO] Cleaning up all servos...');
    for (const [name, servo] of this.servos) {
      if (!servo.mockMode) {
        execAsync(`pigs s ${servo.pin} 0`).catch(() => {});
      }
    }
    this.servos.clear();
    console.log('[SERVO] Cleanup complete');
  }

  /**
   * Get status of all servos
   */
  getStatus() {
    const status = {};
    for (const [name, servo] of this.servos) {
      status[name] = {
        pin: servo.pin,
        currentAngle: servo.currentAngle
      };
    }
    return status;
  }
}

// Create singleton instance
const servoController = new ServoController();

// Initialize pen servo on GPIO 18 (default PWM pin)
try {
  servoController.initServo(18, 'pen_servo');
  console.log('[SERVO] Pen servo initialized on GPIO 18');
} catch (error) {
  console.error('[SERVO] Failed to initialize pen servo:', error.message);
}

// Cleanup on exit
process.on('SIGINT', () => {
  servoController.cleanup();
  process.exit();
});

process.on('SIGTERM', () => {
  servoController.cleanup();
  process.exit();
});

export default servoController;
