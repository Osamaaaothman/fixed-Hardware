import servoController from '../controllers/servoController.js';

/**
 * Servo API Routes
 * Express routes for controlling servo motors
 */

export function setupServoRoutes(app) {
  
  // Initialize a servo on a GPIO pin
  app.post('/api/servo/init', (req, res) => {
    const { pin, name } = req.body;
    
    if (!pin) {
      return res.status(400).json({ 
        success: false, 
        error: 'GPIO pin number is required' 
      });
    }

    const servoName = name || `servo_${pin}`;
    const success = servoController.initServo(pin, servoName);

    res.json({ 
      success, 
      message: success ? `Servo initialized on GPIO ${pin}` : 'Failed to initialize servo',
      name: servoName,
      pin
    });
  });

  // Set servo angle
  app.post('/api/servo/angle', (req, res) => {
    const { name, angle } = req.body;

    if (!name || angle === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Servo name and angle are required' 
      });
    }

    const success = servoController.setAngle(name, angle);

    res.json({ 
      success,
      message: success ? `Servo "${name}" set to ${angle}°` : 'Failed to set angle',
      angle: servoController.getAngle(name)
    });
  });

  // Move servo smoothly
  app.post('/api/servo/move-smooth', async (req, res) => {
    const { name, angle, duration = 1000 } = req.body;

    if (!name || angle === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Servo name and target angle are required' 
      });
    }

    const success = await servoController.moveSmooth(name, angle, duration);

    res.json({ 
      success,
      message: success ? `Servo "${name}" moved to ${angle}°` : 'Failed to move servo',
      angle: servoController.getAngle(name)
    });
  });

  // Sweep servo
  app.post('/api/servo/sweep', async (req, res) => {
    const { name, minAngle = 0, maxAngle = 180, sweeps = 1, speed = 60 } = req.body;

    if (!name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Servo name is required' 
      });
    }

    // Start sweep in background
    servoController.sweep(name, minAngle, maxAngle, sweeps, speed)
      .then(() => console.log(`[SERVO] Sweep complete for "${name}"`))
      .catch(err => console.error(`[SERVO] Sweep error:`, err));

    res.json({ 
      success: true,
      message: `Started sweep for servo "${name}"`,
      params: { minAngle, maxAngle, sweeps, speed }
    });
  });

  // Center servo
  app.post('/api/servo/center', (req, res) => {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Servo name is required' 
      });
    }

    const success = servoController.center(name);

    res.json({ 
      success,
      message: success ? `Servo "${name}" centered` : 'Failed to center servo',
      angle: 90
    });
  });

  // Detach servo
  app.post('/api/servo/detach', (req, res) => {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Servo name is required' 
      });
    }

    const success = servoController.detach(name);

    res.json({ 
      success,
      message: success ? `Servo "${name}" detached` : 'Failed to detach servo'
    });
  });

  // Get servo status
  app.get('/api/servo/status', (req, res) => {
    const { name } = req.query;

    if (name) {
      const angle = servoController.getAngle(name);
      res.json({
        success: angle !== null,
        name,
        angle
      });
    } else {
      res.json({
        success: true,
        servos: servoController.getStatus()
      });
    }
  });

  console.log('[SERVO] API routes initialized');
}

export default setupServoRoutes;
