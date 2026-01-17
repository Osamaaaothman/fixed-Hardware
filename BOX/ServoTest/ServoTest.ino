/**
 * Simple Servo Test Sketch
 * Upload this to BOX Arduino to test if servo hardware works
 * 
 * Connect:
 * - Servo Signal (Orange/Yellow) -> Pin 6
 * - Servo Power (Red) -> 5V (External power recommended!)
 * - Servo Ground (Brown/Black) -> GND
 */

#include <Servo.h>

#define SERVO_PIN 6

Servo testServo;

void setup() {
  Serial.begin(9600);
  Serial.println("=== SERVO HARDWARE TEST ===");
  Serial.println("Attaching servo to Pin 6...");
  
  testServo.attach(SERVO_PIN);
  delay(500);
  
  Serial.println("Starting servo sweep test...");
  Serial.println("Watch the servo - it should move!");
}

void loop() {
  // Test 1: Move to 0 degrees
  Serial.println("\n[TEST] Moving to 0 degrees (Pen UP position)");
  testServo.write(0);
  delay(2000);
  
  // Test 2: Move to 90 degrees (Middle)
  Serial.println("[TEST] Moving to 90 degrees (Middle position)");
  testServo.write(90);
  delay(2000);
  
  // Test 3: Move to 180 degrees
  Serial.println("[TEST] Moving to 180 degrees (Pen DOWN position)");
  testServo.write(180);
  delay(2000);
  
  // Test 4: Slow sweep
  Serial.println("[TEST] Slow sweep 0->180");
  for (int pos = 0; pos <= 180; pos += 5) {
    testServo.write(pos);
    delay(50);
  }
  
  Serial.println("[TEST] Slow sweep 180->0");
  for (int pos = 180; pos >= 0; pos -= 5) {
    testServo.write(pos);
    delay(50);
  }
  
  Serial.println("\n=== Test cycle complete. Repeating... ===\n");
  delay(1000);
}
