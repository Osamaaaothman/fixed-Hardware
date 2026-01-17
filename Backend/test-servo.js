import servoController from './src/controllers/servoController.js';

console.log('Testing servo controller...');

// Wait a bit for initialization
setTimeout(() => {
  console.log('\nTesting M3 S0 (0 degrees)...');
  const result1 = servoController.setAngle('pen_servo', 0);
  console.log('Result:', result1);

  setTimeout(() => {
    console.log('\nTesting M3 S90 (90 degrees)...');
    const result2 = servoController.setAngle('pen_servo', 90);
    console.log('Result:', result2);

    setTimeout(() => {
      console.log('\nTesting M3 S180 (180 degrees)...');
      const result3 = servoController.setAngle('pen_servo', 180);
      console.log('Result:', result3);

      setTimeout(() => {
        console.log('\nTest complete. Exiting...');
        process.exit(0);
      }, 2000);
    }, 2000);
  }, 2000);
}, 1000);
