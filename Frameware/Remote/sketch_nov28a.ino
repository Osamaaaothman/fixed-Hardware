#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>
#include <WebSocketsClient.h>
#include <HTTPClient.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SH1106G display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// =====================================
//  Hardware Pins
// =====================================
#define JOY_X 34
#define JOY_Y 35
#define JOY_SW 27
#define CENTER 2048
#define DEADZONE 300
#define JOY_EPS 3
#define BTN1 32
#define BTN2 33
#define BTN3 25
#define BTN4 26
#define Laser 23

int centerX = 0;
int centerY = 0;

int joyX, joyY;
bool joyPressed;
bool laserStateUI = false;

// =====================================
//  WiFi
// =====================================
const char* ssid = "Waddah";
const char* password = "wm@1551976";

// =====================================
//  WebSocket Config
// =====================================
WebSocketsClient webSocket;
unsigned long lastServerSeen = 0;
String lastMode = "disconnected";

const char* WS_HOST = "192.168.1.37";
const uint16_t WS_PORT = 4444;
const char* WS_PATH = "/ws";

// =====================================
//  PREVIOUS STATE (EVENT DETECTION)
// =====================================
int prevJoyX = 0;
int prevJoyY = 0;
bool prevJoyPressed = false;
bool prevLaserState = false;
String prevMode = "";

// =====================================
//  DEBOUNCING TIMING
// =====================================
unsigned long lastBtnPress[4] = {0, 0, 0, 0};
const unsigned long DEBOUNCE_DELAY = 200;
const unsigned long SERVER_TIMEOUT = 10000;
const unsigned long STATUS_SEND_INTERVAL = 50; 
unsigned long lastStatusSend = 0;

// =====================================
//  WiFi Icon Helper
// =====================================
int getWiFiStrengthIcon() {
  if (WiFi.status() != WL_CONNECTED) return 0;
  int32_t rssi = WiFi.RSSI();
  if (rssi > -55) return 3;
  if (rssi > -70) return 2;
  if (rssi > -85) return 1;
  return 0;
}

// =====================================
//  Animations + UI
// =====================================
void animationStartup() {
  for (int b = 0; b <= 255; b += 25) {
    display.clearDisplay();
    display.setTextSize(2);
    display.setTextColor(SH110X_WHITE);
    display.setCursor(5, 20);
    display.println("NEXA");
    display.setCursor(5, 45);
    display.println("REMOTE");
    display.display();
    delay(40);
  }
}

void animationSlideText(String line1, String line2) {
  for (int x = SCREEN_WIDTH; x >= 0; x -= 8) {
    display.clearDisplay();
    display.setTextSize(2);
    display.setCursor(x, 10);
    display.println(line1);
    display.setCursor(x, 35);
    display.println(line2);
    display.display();
    delay(15);
  }
}

void animationLaserPulse(bool on) {
  for (int i = 0; i < 3; i++) {
    display.clearDisplay();
    display.setTextSize(2);
    display.setCursor(10, 20);
    display.println(on ? "LASER ON" : "LASER OFF");
    display.drawCircle(110, 10, 3 + i, SH110X_WHITE);
    display.display();
    delay(70);
  }
}

void drawUI(String mode, bool laserState) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print("REMOTE CNC");

  int wifiStrength = getWiFiStrengthIcon();
  display.setCursor(88, 0);
  display.print(wifiStrength == 3 ? "[|||]" :
                wifiStrength == 2 ? "[|| ]" :
                wifiStrength == 1 ? "[|  ]" : "[ X ]");

  display.drawLine(0, 10, SCREEN_WIDTH, 10, SH110X_WHITE);
  display.setTextSize(2);
  display.setCursor(0, 20);

  if (mode == "writing") display.println("WRITING");
  else if (mode == "erasing") display.println("ERASING");
  else if (mode == "exiting") display.println("EXITING");
  else if (mode == "ready") display.println("READY");
  else if (mode == "idle") display.println("IDLE");
  else if (mode == "sleep") display.println("SLEEP");
  else display.println("Offline");

  display.drawLine(0, 45, SCREEN_WIDTH, 45, SH110X_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 52);
  display.print("LASER: ");
  display.setCursor(48, 52);
  display.print(laserState ? "[ON]" : "OFF");

  display.display();
}

void displayStatus(String json) {
  int start = json.indexOf("\"status\":\"");
  if (start == -1) return;
  start += 10;
  int end = json.indexOf("\"", start);
  if (end == -1) return;

  String mode = json.substring(start, end);
  if (mode != lastMode) {
    animationSlideText("MODE:", mode);
    lastMode = mode;
  }
  drawUI(mode, laserStateUI);
}

// =====================================
//  SEND FUNCTIONS
// =====================================
void sendToServer(int btn) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected - cannot send command");
    return;
  }

  HTTPClient http;
  String url = "http://192.168.1.37:4444/api/box/command?btn=" + String(btn);
  http.begin(url);
  http.setTimeout(3000);
  
  int httpCode = http.GET();
  if (httpCode > 0) {
    Serial.printf("Button %d sent - Response: %d\n", btn, httpCode);
  } else {
    Serial.printf("Button %d failed - Error: %s\n", btn, http.errorToString(httpCode).c_str());
  }
  
  http.end();
}

void sendRemoteStatus() {
  if (!webSocket.isConnected()) {
    return;
  }

  char msg[160];
  snprintf(msg, sizeof(msg),
    "{\"type\":\"remote\",\"mode\":\"%s\",\"joyX\":%d,\"joyY\":%d,\"joyBtn\":%d}",
    lastMode.c_str(),
    joyX,
    joyY,
    joyPressed ? 1 : 0
  );

  bool sent = webSocket.sendTXT(msg);
  if (!sent) {
    Serial.println("Failed to send remote status");
  }
}


// =====================================
//  Joystick - ADVANCED FILTERING FOR CNC
// =====================================

int readJoystick(int pin, int center) {
  int val = analogRead(pin);
  int diff = val - center;
  return map(diff, -2048, 2048, -150, 150);
}
// =====================================
//  WebSocket Events
// =====================================
void webSocketEvent(WStype_t type, uint8_t *payload, size_t len) {
  switch (type) {
    case WStype_CONNECTED:
      Serial.println("WebSocket Connected");
      lastServerSeen = millis();
      drawUI("idle", laserStateUI);
      break;

    case WStype_DISCONNECTED:
      Serial.println("WebSocket Disconnected");
      lastMode = "offline";
      drawUI("offline", laserStateUI);
      break;

    case WStype_TEXT:
      if (len > 0 && len < 1024) {
        String message = "";
        for (size_t i = 0; i < len; i++) {
          message += (char)payload[i];
        }
        displayStatus(message);
        lastServerSeen = millis();
      }
      break;

    case WStype_ERROR:
      Serial.println("WebSocket Error");
      break;
  }
}

// =====================================
//  SETUP
// =====================================
void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("\n\n=== NEXA CNC Remote Starting ===");

  // Initialize I2C and Display
  Wire.begin(21, 22);
  pinMode(JOY_SW, INPUT_PULLUP);

  if (!display.begin(0x3C, true)) {
    Serial.println("Display initialization failed!");
    while (1) delay(10);
  }

  animationStartup();
  drawUI("init", false);

  // Configure ADC with better settings
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);
  
  // CRITICAL: Discard first readings (usually garbage)
  Serial.println("Warming up ADC...");
  for (int i = 0; i < 20; i++) {
    analogRead(JOY_X);
    analogRead(JOY_Y);
    delay(10);
  }
  
  delay(200);

  // Calibrate Joystick with proper averaging
  Serial.println("Calibrating joystick center...");
  long sumX = 0, sumY = 0;
  for (int i = 0; i < 30; i++) {
    sumX += analogRead(JOY_X);
    sumY += analogRead(JOY_Y);
    delay(10);
  }
  centerX = sumX / 30;
  centerY = sumY / 30;
  Serial.printf("Joystick Center: X=%d, Y=%d\n", centerX, centerY);

  // Setup Buttons
  pinMode(BTN1, INPUT_PULLUP);
  pinMode(BTN2, INPUT_PULLUP);
  pinMode(BTN3, INPUT_PULLUP);
  pinMode(BTN4, INPUT_PULLUP);

  // Setup Laser
  pinMode(Laser, OUTPUT);
  digitalWrite(Laser, LOW);

  // Connect to WiFi with timeout
  Serial.printf("Connecting to WiFi: %s\n", ssid);
  WiFi.begin(ssid, password);
  
  int wifiAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && wifiAttempts < 40) {
    delay(500);
    Serial.print(".");
    wifiAttempts++;
    
    if (wifiAttempts % 5 == 0) {
      drawUI("connecting", false);
    }
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    Serial.printf("IP: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("Signal: %d dBm\n", WiFi.RSSI());
    
    // Initialize WebSocket
    webSocket.begin(WS_HOST, WS_PORT, WS_PATH);
    webSocket.onEvent(webSocketEvent);
    webSocket.setReconnectInterval(3000);
    
    drawUI("ready", false);
  } else {
    Serial.println("\nWiFi Connection Failed!");
    drawUI("wifi_fail", false);
  }
  
  Serial.println("Setup complete - Ready for CNC control!");
}

// =====================================
//  LOOP (EVENT-DRIVEN + OPTIMIZED)
// =====================================
void loop() {
  webSocket.loop();



  // Button handling with debouncing
  unsigned long currentTime = millis();

  if (digitalRead(BTN1) == LOW && currentTime - lastBtnPress[0] > DEBOUNCE_DELAY) {
    sendToServer(1);
    lastBtnPress[0] = currentTime;
  }

  if (digitalRead(BTN2) == LOW && currentTime - lastBtnPress[1] > DEBOUNCE_DELAY) {
    sendToServer(2);
    lastBtnPress[1] = currentTime;
  }

  if (digitalRead(BTN3) == LOW && currentTime - lastBtnPress[2] > DEBOUNCE_DELAY) {
    sendToServer(3);
    lastBtnPress[2] = currentTime;
  }

  if (digitalRead(BTN4) == LOW && currentTime - lastBtnPress[3] > DEBOUNCE_DELAY) {
    laserStateUI = !laserStateUI;
    digitalWrite(Laser, laserStateUI);
    animationLaserPulse(laserStateUI);
    lastBtnPress[3] = currentTime;
  }


  static unsigned long lastJoyRead = 0;
    joyX = readJoystick(JOY_X,centerX);
    joyY = -readJoystick(JOY_Y,centerY);
    joyPressed = !digitalRead(JOY_SW);
    lastJoyRead = currentTime;
 
  bool changed =
    abs(joyX - prevJoyX) > JOY_EPS ||
    abs(joyY - prevJoyY) > JOY_EPS ||
    joyPressed != prevJoyPressed ||
    laserStateUI != prevLaserState ||
    lastMode != prevMode;


  if (changed) {
    sendRemoteStatus();
    prevJoyX = joyX;
    prevJoyY = joyY;
    prevJoyPressed = joyPressed;
    prevLaserState = laserStateUI;
    prevMode = lastMode;
    lastStatusSend = currentTime;
  }

}