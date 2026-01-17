#!/usr/bin/env node

/**
 * Servo Test Example for Raspberry Pi
 * 
 * Hardware Setup:
 * - Connect servo signal wire to GPIO pin (e.g., GPIO 18)
 * - Connect servo VCC to 5V (use external power for multiple servos)
 * - Connect servo GND to Raspberry Pi GND
 * 
 * Installation:
 * npm install pigpio
 * 
 * Usage:
 * sudo node servo-example.js
 * (sudo required for GPIO access)
 */

import servoController from './src/controllers/servoController.js';

// Configuration
const SERVO_PIN = 18; // GPIO pin number (BCM numbering)
const SERVO_NAME = 'pen_servo';

async function main() {
  console.log('=== Raspberry Pi Servo Control Demo ===\n');

  // Initialize servo
  console.log(`Initializing servo on GPIO ${SERVO_PIN}...`);
  servoController.initServo(SERVO_PIN, SERVO_NAME);

  // Wait a moment
  await delay(1000);

  // Example 1: Set specific angles
  console.log('\n--- Example 1: Set specific angles ---');
  await setAndWait(SERVO_NAME, 0, 'Minimum position (0°)');
  await setAndWait(SERVO_NAME, 90, 'Center position (90°)');
  await setAndWait(SERVO_NAME, 180, 'Maximum position (180°)');
  await setAndWait(SERVO_NAME, 90, 'Back to center');

  // Example 2: Smooth movement
  console.log('\n--- Example 2: Smooth movement ---');
  console.log('Moving smoothly from 90° to 0° over 2 seconds...');
  await servoController.moveSmooth(SERVO_NAME, 0, 2000);
  await delay(500);
  
  console.log('Moving smoothly from 0° to 180° over 2 seconds...');
  await servoController.moveSmooth(SERVO_NAME, 180, 2000);
  await delay(500);

  console.log('Moving smoothly back to center...');
  await servoController.moveSmooth(SERVO_NAME, 90, 1000);
  await delay(500);

  // Example 3: Sweep
  console.log('\n--- Example 3: Sweep motion ---');
  console.log('Sweeping between 0° and 180° (3 times)...');
  await servoController.sweep(SERVO_NAME, 0, 180, 3, 120);

  // Example 4: Pen lift simulation
  console.log('\n--- Example 4: Pen lift simulation ---');
  const PEN_UP = 45;   // Pen lifted
  const PEN_DOWN = 90; // Pen on paper

  console.log('Pen DOWN (drawing position)');
  await servoController.moveSmooth(SERVO_NAME, PEN_DOWN, 300);
  await delay(1000);

  console.log('Pen UP (lifted)');
  await servoController.moveSmooth(SERVO_NAME, PEN_UP, 300);
  await delay(1000);

  console.log('Pen DOWN');
  await servoController.moveSmooth(SERVO_NAME, PEN_DOWN, 300);
  await delay(1000);

  console.log('Pen UP');
  await servoController.moveSmooth(SERVO_NAME, PEN_UP, 300);
  await delay(1000);

  // Center and cleanup
  console.log('\n--- Centering and cleaning up ---');
  servoController.center(SERVO_NAME);
  await delay(1000);

  console.log('Detaching servo...');
  servoController.detach(SERVO_NAME);

  console.log('\n=== Demo Complete ===');
  process.exit(0);
}

// Helper functions
async function setAndWait(name, angle, description) {
  console.log(`${description}: Setting to ${angle}°`);
  servoController.setAngle(name, angle);
  await delay(1500); // Wait 1.5 seconds
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the demo
main().catch(error => {
  console.error('Error:', error);
  servoController.cleanup();
  process.exit(1);
});
