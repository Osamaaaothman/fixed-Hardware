#define STEP_PIN 2
#define DIR_PIN 3

void setup() {
  pinMode(STEP_PIN, OUTPUT);
  pinMode(DIR_PIN, OUTPUT);

  digitalWrite(DIR_PIN, HIGH);  // direction
}

void loop() {
  // rotate one full revolution: 3200 steps
  // for (int i = 0; i < 3200; i++) {
  //   digitalWrite(STEP_PIN, HIGH);
  //   delayMicroseconds(500);      // speed control
  //   digitalWrite(STEP_PIN, LOW);
  //   delayMicroseconds(500);
  // }

  // delay(1000);

  // reverse direction
  // digitalWrite(DIR_PIN, LOW);

  // for (int i = 0; i < 3200; i++) {
  //   digitalWrite(STEP_PIN, HIGH);
  //   delayMicroseconds(500);
  //   digitalWrite(STEP_PIN, LOW);
  //   delayMicroseconds(500);
  // }

  // delay(1000);
}
