#include <Keypad.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7789.h>
#include <Adafruit_ST77xx.h>
#include <Servo.h>
#include <MFRC522.h>
#include <avr/sleep.h>
#include <avr/power.h>
/* --------------------- Pins & HW --------------------- */
#define TFT_CS   10
#define TFT_DC    9
#define TFT_RST   8
#define TRIG      2
#define ECHO      3
#define LED_RED  11
#define LED_GRN  12
#define LED_BLU  13
#define RFID_SS_PIN 53
#define RFID_RST_PIN 7

/* =====================================================
 *                    DisplayManager
 * ===================================================== */
class DisplayManager {
public:
  Adafruit_ST7789 tft;

  DisplayManager() : tft(TFT_CS, TFT_DC, TFT_RST) {}

  void begin() {
    tft.init(240, 320);
    tft.setRotation(1);
    tft.fillScreen(ST77XX_BLACK);
    pinMode(LED_RED, OUTPUT);
    pinMode(LED_GRN, OUTPUT);
    pinMode(LED_BLU, OUTPUT);
    setRGB(0, 0, 0);
    Serial.println("[Display] initialized");
    nexaBoardAnimation();
  }

  void clear() { tft.fillScreen(ST77XX_BLACK); }

  void drawTitle(const char* text) {
    clear();
    tft.setTextColor(ST77XX_CYAN);
    tft.setTextSize(3);
    centerText(text, 60);
  }

  void drawMessage(const char* text) {
    tft.setTextColor(ST77XX_WHITE);
    tft.setTextSize(2);
    centerText(text, 120);
  }

  void drawPasswordMasked(uint8_t length) {
    tft.fillRect(60, 160, 120, 40, ST77XX_BLACK);
    tft.drawRoundRect(60, 160, 120, 40, 6, ST77XX_WHITE);
    tft.setTextColor(ST77XX_YELLOW);
    tft.setTextSize(3);
    tft.setCursor(80, 170);
    for (uint8_t i = 0; i < length; i++) tft.print('*');
  }

 void showModeMenu(int page = 1) {
  clear();
  drawTitle("Select Mode");

  tft.setTextColor(ST77XX_WHITE);
  tft.setTextSize(2);

  if (page == 1) {
    tft.setCursor(40, 80);  tft.println("1: pen1");
    tft.setCursor(40, 110); tft.println("2: pen2");
    tft.setCursor(40, 140); tft.println("3: Erasing pen");
    tft.setCursor(40, 190); tft.println("A: Next Page");
  }
  else if (page == 2) {
    tft.setCursor(40, 80);  tft.println("4: drawing");
    tft.setCursor(40, 110); tft.println("5: erasing");
    tft.setCursor(40, 140); tft.println("6: screenshot");
    tft.setCursor(40, 190); tft.println("B: Prev Page");
  }

  // زر Exit ثابت في كل الصفحات
  tft.setTextColor(ST77XX_RED);
  tft.setTextSize(2);
  tft.setCursor(40, 220);
  tft.println("*: EXIT");

  // عرض مؤشر الصفحة
  tft.setTextSize(1);
  tft.setTextColor(ST77XX_YELLOW);
  char pageText[10];
  sprintf(pageText, "Page %d/2", page);
  tft.setCursor(200, 10);
  tft.print(pageText);

  Serial.print("[Display] mode menu page ");
  Serial.println(page);
}


   void successAnimation() {
    clear();
    for (int r = 10; r <= 60; r += 5) {
      tft.drawCircle(160, 120, r, ST77XX_GREEN);
      if (r > 15) tft.drawCircle(160, 120, r - 5, ST77XX_BLACK);
      delay(25);
    }
    tft.fillCircle(160, 120, 50, ST77XX_GREEN);
    delay(100);
    int x0 = 140, y0 = 120;
    for (int i = 0; i <= 15; i++) { tft.fillCircle(x0 + i, y0 + i, 2, ST77XX_WHITE); delay(20); }
    for (int i = 0; i <= 30; i++) { tft.fillCircle(x0 + 15 + i, y0 + 15 - i, 2, ST77XX_WHITE); delay(20); }
    delay(300);
    tft.setTextColor(ST77XX_GREEN);
    tft.setTextSize(2);
    centerText("Access Granted!", 190);
    for (int i = 0; i < 20; i++) {
      int x = random(80, 240);
      int y = random(80, 160);
      tft.fillCircle(x, y, 2, ST77XX_GREEN);
      delay(30);
    }
    delay(800);
  }


 void errorAnimation(uint8_t attempt, uint8_t maxAttempt) {
    for (int shake = 0; shake < 3; shake++) {
      tft.fillRect(60, 160, 120, 40, ST77XX_RED);
      tft.drawRoundRect(60, 160, 120, 40, 6, ST77XX_WHITE);
      delay(80);
      tft.fillRect(60, 160, 120, 40, ST77XX_BLACK);
      tft.drawRoundRect(60, 160, 120, 40, 6, ST77XX_WHITE);
      delay(80);
    }
    clear();
    for (int i = 0; i <= 40; i += 2) {
      tft.drawLine(140 + i, 100 + i, 140 + i + 2, 100 + i + 2, ST77XX_RED);
      tft.drawLine(180 - i, 100 + i, 180 - i - 2, 100 + i + 2, ST77XX_RED);
      delay(15);
    }
    for (int offset = -2; offset <= 2; offset++) {
      tft.drawLine(140, 100 + offset, 180, 140 + offset, ST77XX_RED);
      tft.drawLine(180, 100 + offset, 140, 140 + offset, ST77XX_RED);
    }
    delay(200);
    tft.setTextColor(ST77XX_RED);
    tft.setTextSize(2);
    centerText("Access Denied!", 170);
    if (attempt < maxAttempt) {
      tft.setTextColor(ST77XX_YELLOW);
      tft.setTextSize(1);
      char attemptMsg[30];
      sprintf(attemptMsg, "Attempts left: %d", maxAttempt - attempt);
      centerText(attemptMsg, 200);
    }
    delay(800);
  }

   void lockAnimation() {
    clear();
    int centerX = 155, centerY = 80;
    tft.fillRoundRect(centerX - 25, centerY, 50, 50, 8, ST77XX_RED);
    tft.drawRoundRect(centerX - 25, centerY, 50, 50, 8, ST77XX_WHITE);
    tft.drawRoundRect(centerX - 15, centerY - 20, 30, 25, 10, ST77XX_WHITE);
    tft.drawRoundRect(centerX - 13, centerY - 18, 26, 23, 8, ST77XX_WHITE);
    tft.fillRect(centerX - 15, centerY - 5, 30, 10, ST77XX_BLACK);
    tft.fillCircle(centerX, centerY + 18, 5, ST77XX_WHITE);
    tft.fillTriangle(centerX - 3, centerY + 20, centerX + 3, centerY + 20, centerX, centerY + 32, ST77XX_WHITE);
    tft.setTextColor(ST77XX_RED);
    tft.setTextSize(3);
    centerText("LOCKED", 150);
    tft.setTextColor(0x8410);
    tft.setTextSize(1);
    centerText("Access Denied", 175);
    delay(500);
  }

   void showLockTimer(unsigned long remainingMs) {
    int totalSeconds = remainingMs / 1000;
    int minutes = totalSeconds / 60;
    int seconds = totalSeconds % 60;
    int centerX = 260, centerY = 50, radius = 40;
    tft.fillCircle(centerX, centerY, radius + 2, ST77XX_BLACK);
    tft.drawCircle(centerX, centerY, radius, ST77XX_YELLOW);
    char buffer[10];
    if (minutes > 0) sprintf(buffer, "%02d:%02d", minutes, seconds);
    else sprintf(buffer, "%02ds", seconds);
    int16_t x1, y1; uint16_t w, h;
    tft.setTextSize(3);
    tft.setTextColor(ST77XX_YELLOW);
    tft.getTextBounds(buffer, 0, 0, &x1, &y1, &w, &h);
    int textX = centerX - w / 2;
    int textY = centerY - h / 2;
    tft.setCursor(textX, textY);
    tft.print(buffer);
    delay(300);
  }

  void centerText(const char* text, int y) {
    int16_t x1, y1; uint16_t w, h;
    tft.getTextBounds(text, 0, y, &x1, &y1, &w, &h);
    tft.setCursor((tft.width() - w) / 2, y);
    tft.print(text);
  }

  void setRGB(int r, int g, int b) {
    analogWrite(LED_RED, r);
    analogWrite(LED_GRN, g);
    analogWrite(LED_BLU, b);
  }

  void rgbEffect(const String& mode, int speed = 25) {
    Serial.print("[RGB] effect start: ");
    Serial.println(mode);
    if (mode == "writing") {
      for (int i = 0; i <= 255; i += 5) { setRGB(i, 255 - i, 0); delay(speed); }
      for (int i = 0; i <= 255; i += 5) { setRGB(0, i, 255 - i); delay(speed); }
      for (int i = 0; i <= 255; i += 5) { setRGB(255 - i, 0, i); delay(speed); }
    } else if (mode == "erasing") {
      for (int i = 0; i <= 255; i += 10) { setRGB(0, 0, i); delay(speed); }
      for (int i = 255; i >= 0; i -= 10) { setRGB(0, 0, i); delay(speed); }
    } else if (mode == "exit") {
      for (int i = 0; i <= 255; i += 10) { setRGB(i, 0, 0); delay(speed); }
      for (int i = 255; i >= 0; i -= 10) { setRGB(i, 0, 0); delay(speed); }
    }
    setRGB(0, 0, 0);
    Serial.print("[RGB] effect end: ");
    Serial.println(mode);
  }

  void sendCommand(uint8_t cmd) {
    digitalWrite(TFT_DC, LOW);
    digitalWrite(TFT_CS, LOW);
    SPI.transfer(cmd);
    digitalWrite(TFT_CS, HIGH);
  }
  void turnOffScreen() { sendCommand(ST77XX_DISPOFF); sendCommand(ST77XX_SLPIN); Serial.println("[Display] turnOffScreen called"); }
  void turnOnScreen()  { sendCommand(ST77XX_SLPOUT);  sendCommand(ST77XX_DISPON); Serial.println("[Display] turnOnScreen called"); }

void requestRFIDAnimation() {
    clear();
    
    int centerX = 120;
    int centerY = 100;
    
    // Draw RFID card in center
    int cardWidth = 70;
    int cardHeight = 45;
    int cardX = centerX - cardWidth / 2;
    int cardY = centerY - cardHeight / 2;
    
    // Card shadow for depth
    tft.fillRoundRect(cardX + 3, cardY + 3, cardWidth, cardHeight, 5, 
                      tft.color565(20, 20, 20));
    
    // Card body - white/light colored
    tft.fillRoundRect(cardX, cardY, cardWidth, cardHeight, 5, 
                      tft.color565(240, 240, 240));
    
    // Card border
    tft.drawRoundRect(cardX, cardY, cardWidth, cardHeight, 5, 
                      tft.color565(0, 150, 255));
    tft.drawRoundRect(cardX + 1, cardY + 1, cardWidth - 2, cardHeight - 2, 4, 
                      tft.color565(0, 180, 255));
    
    // RFID chip on card (gold color)
    int chipX = cardX + 10;
    int chipY = cardY + 12;
    int chipSize = 16;
    
    tft.fillRoundRect(chipX, chipY, chipSize, chipSize, 2, 
                      tft.color565(255, 215, 0));
    tft.drawRoundRect(chipX, chipY, chipSize, chipSize, 2, 
                      tft.color565(200, 160, 0));
    
    // Chip contact lines
    for (int i = 0; i < 4; i++) {
        tft.drawFastHLine(chipX + 2, chipY + 3 + i * 3, chipSize - 4, 
                         tft.color565(180, 140, 0));
    }
    
    // Card text/logo area
    tft.setTextColor(tft.color565(100, 100, 100));
    tft.setTextSize(1);
    tft.setCursor(cardX + 30, cardY + 15);
    tft.print("RFID");
    
    // Small wave symbol on card
    for (int i = 0; i < 3; i++) {
        int waveX = cardX + 35 + i * 5;
        tft.drawLine(waveX, cardY + 25, waveX + 2, cardY + 27, 
                     tft.color565(0, 150, 255));
        tft.drawLine(waveX + 2, cardY + 27, waveX + 4, cardY + 25, 
                     tft.color565(0, 150, 255));
    }
    
    // Arrow/motion indicator below card
    int arrowY = centerY + 50;
    
    // This will be animated - for static version, show middle position
    drawPassingArrow(centerX, arrowY, 0);
    
    // Text above card
    tft.setTextColor(ST77XX_WHITE);
    tft.setTextSize(2);
    centerText("TAP CARD", 30);
    
    // Instruction text below arrow
    tft.setTextColor(tft.color565(0, 255, 150));
    tft.setTextSize(2);
    centerText("PLACE HERE", 180);
    
    // Small instruction
    tft.setTextColor(tft.color565(150, 150, 150));
    tft.setTextSize(1);
    centerText("Hold card near reader", 210);
    
    Serial.println("[Display] RFID card animation ready");
}

// Draw animated arrow - call this in loop with frame counter
void drawPassingArrow(int centerX, int y, int frame) {
    // Calculate arrow position (moves left to right)
    int arrowOffset = (frame % 80) - 40; // Range: -40 to +40
    int arrowX = centerX + arrowOffset;
    
    // Fade effect - arrow is brightest in center
    int brightness = 255 - abs(arrowOffset) * 4;
    if (brightness < 50) brightness = 50;
    
    uint16_t arrowColor = tft.color565(0, brightness, brightness);
    
    // Draw arrow pointing right
    int arrowLength = 25;
    
    // Arrow shaft
    tft.drawFastHLine(arrowX - arrowLength/2, y, arrowLength, arrowColor);
    tft.drawFastHLine(arrowX - arrowLength/2, y + 1, arrowLength, arrowColor);
    
    // Arrow head
    for (int i = 0; i < 8; i++) {
        tft.drawLine(arrowX + arrowLength/2 - i, y - i + 1, 
                     arrowX + arrowLength/2 - i, y + i + 1, arrowColor);
    }
    
    // Optional: trail effect (dots behind arrow)
    for (int i = 1; i < 4; i++) {
        int trailX = arrowX - (i * 10);
        int trailAlpha = brightness / (i + 1);
        uint16_t trailColor = tft.color565(0, trailAlpha, trailAlpha);
        tft.fillCircle(trailX, y, 2, trailColor);
    }
}

// Alternative: Vertical passing motion (top to bottom)
void drawPassingArrowVertical(int x, int centerY, int frame) {
    // Arrow moves from top to bottom
    int arrowOffset = (frame % 60) - 30;
    int arrowY = centerY + arrowOffset;
    
    int brightness = 255 - abs(arrowOffset) * 5;
    if (brightness < 50) brightness = 50;
    
    uint16_t arrowColor = tft.color565(0, brightness, brightness);
    
    // Arrow pointing down
    int arrowLength = 20;
    
    // Arrow shaft
    tft.drawFastVLine(x, arrowY - arrowLength/2, arrowLength, arrowColor);
    tft.drawFastVLine(x + 1, arrowY - arrowLength/2, arrowLength, arrowColor);
    
    // Arrow head
    for (int i = 0; i < 6; i++) {
        tft.drawFastHLine(x - i + 1, arrowY + arrowLength/2 - i, i * 2, arrowColor);
    }
}

// Optional: Add pulsing animation (call this in your main loop)
void updateRFIDPulse(int frame) {
    int centerX = 120;
    int centerY = 120;
    int radius = 115 + (frame % 20);
    int brightness = 255 - ((frame % 20) * 10);
    
    uint16_t color = tft.color565(0, brightness / 2, brightness);
    tft.drawCircle(centerX, centerY, radius, color);
}

void accessGrantedAnimation() {
  clear();
  tft.fillCircle(120, 120, 60, ST77XX_GREEN);

 
  for (int i = 95; i <= 115; i++) {
    tft.drawLine(95, 120, i, 120 + (i - 95), ST77XX_WHITE);
    delay(10);
  }

  for (int i = 115; i <= 150; i++) {
    tft.drawLine(115, 140, i, 90 + (150 - i), ST77XX_WHITE);
    delay(10);
  }


  tft.setTextColor(ST77XX_WHITE);
  tft.setTextSize(2);
  centerText("ACCESS GRANTED", 190);

  Serial.println("[Display] accessGrantedAnimation");
}

void accessDeniedAnimation() {
    clear();

    int centerX = tft.width() / 2;   
    int centerY = tft.height() / 2;
    for (int r = 0; r <= 60; r += 4) {
        tft.fillCircle(centerX, centerY, r, ST77XX_RED);
        delay(10);
    }
    for (int i = 0; i <= 60; i += 4) {
        tft.drawLine(centerX - 30, centerY - 30,
                     centerX - 30 + i, centerY - 30 + i,
                     ST77XX_WHITE);
        delay(20);
    }

    for (int i = 0; i <= 60; i += 4) {
        tft.drawLine(centerX + 30, centerY - 30,
                     centerX + 30 - i, centerY - 30 + i,
                     ST77XX_WHITE);
        delay(20);
    }
    tft.setTextColor(ST77XX_WHITE);
    tft.setTextSize(2);
    delay(500);
    centerText("ACCESS DENIED", centerY + 70);

    Serial.println("[Display] accessDeniedAnimation (centered)");
}

void queueEmptyAnimation() {
    clear();
    
    int centerX = tft.width() / 2;
    int centerY = tft.height() / 2;
    
   
    int boxW = 80, boxH = 60;
    int boxX = centerX - boxW/2;
    int boxY = centerY - boxH/2 - 20;
    
   
    tft.drawRect(boxX, boxY, boxW, boxH, ST77XX_ORANGE);
    tft.drawRect(boxX + 1, boxY + 1, boxW - 2, boxH - 2, ST77XX_ORANGE);
    tft.drawRect(boxX + 2, boxY + 2, boxW - 4, boxH - 4, ST77XX_ORANGE);
    
    
    for (int i = 0; i < 3; i++) {
        tft.drawFastHLine(boxX + 10, boxY + 15 + i * 15, boxW - 20, tft.color565(100, 100, 100));
    }
    
   
    tft.setTextColor(ST77XX_YELLOW);
    tft.setTextSize(4);
    tft.setCursor(centerX - 12, centerY - 15);
    tft.print("?");
    
    delay(300);
    
   
    tft.setTextColor(ST77XX_ORANGE);
    tft.setTextSize(2);
    centerText("QUEUE IS EMPTY", centerY + 60);
    
   
    tft.setTextColor(ST77XX_WHITE);
    tft.setTextSize(1);
    centerText("No tasks in queue", centerY + 85);
    
    delay(1500);
    
    Serial.println("[Display] queueEmptyAnimation");
}




 void nexaBoardAnimation() {
    int centerX = tft.width() / 2;
    int centerY = tft.height() / 2;
    for (int y = 0; y < tft.height(); y += 3) { tft.drawFastHLine(0, y, tft.width(), ST77XX_CYAN); delay(15); }
    delay(300); clear();
    int boxW = 180, boxH = 80;
    int boxX = centerX - boxW/2, boxY = centerY - boxH/2;
    for (int i = 0; i <= boxW; i += 10) { tft.drawRect(boxX, boxY, i, boxH, ST77XX_BLUE); delay(40); }
    tft.drawRect(boxX, boxY, boxW, boxH, ST77XX_BLUE);
    tft.setTextSize(3); tft.setTextColor(ST77XX_WHITE);
    int cursorX = centerX - 54, cursorY = centerY - 25;
    tft.setCursor(cursorX, cursorY); tft.print("N"); delay(120); tft.print("E"); delay(120); tft.print("X"); delay(120); tft.print("A"); delay(220);
    cursorX = centerX - 64; cursorY = centerY + 10; tft.setCursor(cursorX, cursorY);
    tft.print("B"); delay(200); tft.print("O"); delay(120); tft.print("A"); delay(200); tft.print("R"); delay(200); tft.print("D"); delay(350);
    int cSize = 15;
    tft.fillRect(boxX - 2, boxY - 2, cSize, 3, ST77XX_CYAN);
    tft.fillRect(boxX - 2, boxY - 2, 3, cSize, ST77XX_CYAN);
    tft.fillRect(boxX + boxW - cSize + 2, boxY - 2, cSize, 3, ST77XX_CYAN);
    tft.fillRect(boxX + boxW, boxY - 2, 3, cSize, ST77XX_CYAN);
    tft.fillRect(boxX - 2, boxY + boxH, cSize, 3, ST77XX_CYAN);
    tft.fillRect(boxX - 2, boxY + boxH - cSize, 3, cSize, ST77XX_CYAN);
    tft.fillRect(boxX + boxW - cSize + 2, boxY + boxH, cSize, 3, ST77XX_CYAN);
    tft.fillRect(boxX + boxW, boxY + boxH - cSize, 3, cSize, ST77XX_CYAN);
    int barY = boxY + boxH + 25, barW = 160, barH = 6, barX = centerX - barW/2;
    tft.drawRect(barX, barY, barW, barH, ST77XX_BLUE);
    for (int i = 0; i < barW - 4; i += 8) { tft.fillRect(barX + 2, barY + 2, i, barH - 4, ST77XX_GREEN); delay(25); }
    tft.fillRect(barX + 2, barY + 2, barW - 4, barH - 4, ST77XX_GREEN);
    delay(300); clear();
    Serial.println("[Display] nexaBoardAnimation done");
  }
};

/* =====================================================
 *                    RFID Manager
 * ===================================================== */
class RfidManager {
public:
  MFRC522 rfid;
  RfidManager() : rfid(RFID_SS_PIN, RFID_RST_PIN) {}
  byte authorizedUID[4] = {0x82, 0xED, 0x17, 0x02};

  void begin() {
    SPI.begin();
    rfid.PCD_Init();
    Serial.println("[RFID] initialized");
  }

  int checkState() {
    if (!rfid.PICC_IsNewCardPresent()) return 0;
    if (!rfid.PICC_ReadCardSerial()) return 0;

    // Print UID for debugging
    Serial.print("[RFID] card detected UID=");
    for (byte i = 0; i < rfid.uid.size; i++) {
      if (rfid.uid.uidByte[i] < 0x10) Serial.print("0");
      Serial.print(rfid.uid.uidByte[i], HEX);
      Serial.print(" ");
    }
    Serial.println();

    // compare first 4 bytes with authorized
    bool match = true;
    for (byte i = 0; i < 4; i++) {
      if (rfid.uid.uidByte[i] != authorizedUID[i]) { match = false; break; }
    }
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    if (match) {
      Serial.println("[RFID] authorized card");
      return 1;
    } else {
      Serial.println("[RFID] unauthorized card");
      return -1;
    }
  }
};
/* =====================================================
 *                    DFPlayer Manager
 * ===================================================== */

class DFPlayerSimple {
public:
  HardwareSerial &serial;
  DFPlayerSimple(HardwareSerial &ser) : serial(ser) {}
  // Initialize serial
  void begin(long baud = 9600) {
    serial.begin(baud);
    delay(500);
  }
  // Send DFPlayer command
  void sendCommand(uint8_t cmd, uint8_t p1, uint8_t p2) {
    uint8_t buf[8] = {
      0x7E,  // Start byte
      0xFF,  // Version
      0x06,  // Length
      cmd,   // Command
      0x00,  // No feedback
      p1,    // Param1
      p2,    // Param2
      0xEF   // End byte
    };
    serial.write(buf, 8);
  }
  // Set volume (0–30)
  void setVolume(uint8_t vol) {
    if (vol > 30) vol = 30;
    sendCommand(0x06, 0x00, vol);
  }
  // Play track number
  void playTrack(uint16_t track) {
    uint8_t high = (track >> 8) & 0xFF;
    uint8_t low  = track & 0xFF;
    sendCommand(0x03, high, low);
  }


  void playSound(int trackNumber, int volume) {
    delay(200);
    setVolume(volume);
    delay(200);
    playTrack(trackNumber);
}

};

/* =====================================================
 *                    Keypad Manager
 * ===================================================== */
class KeypadManager {
public:
  static const byte ROWS = 4, COLS = 4;
  char hexaKeys[ROWS][COLS] = {
    {'1','2','3','A'},
    {'4','5','6','B'},
    {'7','8','9','C'},
    {'*','0','#','D'}
  };
  byte rowPins[ROWS] = {31, 33, 35, 37};
  byte colPins[COLS] = {30, 32, 34, 36};
  Keypad kpd;

  unsigned long lastKeyTime = 0;
  const unsigned long debounceDelay = 200; 
  char lastKey = NO_KEY;
  
  KeypadManager() : kpd(makeKeymap(hexaKeys), rowPins, colPins, ROWS, COLS) {}
  
  char getKey() { 
    char k = kpd.getKey();
    
    if (!k) {
      lastKey = NO_KEY;
      return NO_KEY;
    }
    unsigned long currentTime = millis();
   
    if (k == lastKey && (currentTime - lastKeyTime) < debounceDelay) {
      return NO_KEY;
    }

    lastKeyTime = currentTime;
    lastKey = k;

    Serial.print("[Keypad] key=");
    Serial.println(k);
    
    return k;
  }
};

/* =====================================================
 *                    Security System
 * ===================================================== */
class SecuritySystem {
public:
  String correctPassword = "1234";
  uint8_t attempt = 0;
  const uint8_t maxAttempt = 3;
  bool locked = false;
  unsigned long lockStartTime = 0;
  const unsigned long lockDuration = 30000UL;

  void reset() { attempt = 0; locked = false; Serial.println("[Security] reset"); }
  bool isLocked() const { return locked; }
  void lockNow() { locked = true; lockStartTime = millis(); Serial.println("[Security] locked now"); }
  unsigned long remainingLockMs() const {
    unsigned long elapsed = millis() - lockStartTime;
    return (elapsed >= lockDuration) ? 0 : (lockDuration - elapsed);
  }
  bool check(const String& input) {
    Serial.print("[Security] checking password input=");
    Serial.println(input);
    if (input == correctPassword) {
       attempt = 0;
     Serial.println("[Security] password correct");
     return true; 
     }
    attempt++;
    
    Serial.print("[Security] password incorrect, attempt=");
    Serial.println(attempt);
    if (attempt >= maxAttempt) 
    {
      Serial.println("MaxAttemptAccessed");
      lockNow();
    }

    return false;
  }
};
/* =====================================================
 *                    Mode Handler
 * ===================================================== */
class NexaBoardSystem; // Forward declaration

class ModeHandler {
  DisplayManager& display;
  KeypadManager& keypad;
  class NexaBoardSystem* system;
public:
 ModeHandler(DisplayManager& d, KeypadManager& k)
    : display(d), keypad(k), system(nullptr) {}
  
  void setSystem(NexaBoardSystem* sys) { system = sys; }

  // Method declarations
  void writingMode(bool &exitRequested);
  void erasingMode(bool &exitRequested);
  void pen1Mode(bool &exitRequested);
  void pen2Mode(bool &exitRequested);
  void erasingPenMode(bool &exitRequested);
  void screenshotMode(bool &exitRequested);
  void exitMode(bool& logoutRequested);
};


/* =====================================================
 *                    NexaBoard System
 * ===================================================== */
class NexaBoardSystem {
public:
  DisplayManager display;
  KeypadManager keypad;
  SecuritySystem security;
  DFPlayerSimple dfplayer;
  ModeHandler modes;
  RfidManager rfidManager;
  enum LoginStage { WAIT_RFID, ENTER_PASSWORD };
  LoginStage loginStage = WAIT_RFID;
  bool systemActive = true;
  bool loggedIn = false;
  String inputPassword = "";
  unsigned long lastActivityTime = 0;
  const unsigned long timeoutMs = 30000UL;
  String status = "";
 String inputNumber = "";
 int currentPage = 1;

 enum ActiveMode {
  MODE_NONE,
  MODE_PEN1,
  MODE_PEN2,
  MODE_ERASING_PEN,
  MODE_WRITING,
  MODE_ERASING,
  MODE_SCREENSHOT
};

ActiveMode currentMode = MODE_NONE;
bool exitModeRequested = false;

NexaBoardSystem():modes(display, keypad),dfplayer(Serial1) {
  modes.setSystem(this);
}


  void begin() {
    Serial.begin(9600);
    Serial.println("[System] starting...");
    pinMode(LED_RED, OUTPUT);
    pinMode(LED_GRN, OUTPUT);
    pinMode(LED_BLU, OUTPUT);
    pinMode(TRIG, OUTPUT);
    pinMode(ECHO, INPUT);
    dfplayer.begin();
    dfplayer.playSound(1,23);
    display.begin();
    rfidManager.begin();
    loginStage = WAIT_RFID;
    loggedIn = false;
    inputPassword = "";
    security.reset();
    display.drawTitle("Nexa Board");
    display.requestRFIDAnimation();
    lastActivityTime = millis();
    Serial.println("[System] ready and waiting for RFID");
  }
void sendStatusToServer(String s) {
    Serial.println(s);
}


  void checkServerCommands() {
    if (Serial.available()) {
        String cmd = Serial.readStringUntil('\n');
        cmd.trim();
        if (cmd.length() > 0) {
            Serial.print("[Server] Command Received: ");
            Serial.println(cmd);
            handleServerCommand(cmd);
        }
    }
}

void handleServerCommand(String cmd) {


    if (security.isLocked()) {
        Serial.println("[Server] Ignored command (system locked)");
        return;
    }

   
    if (!loggedIn && cmd != "ready") {
        Serial.println("[Server] Ignored (user not logged in)");
        return;
    }

    // حراسة: منع تشغيل مود جديد فوق مود شغال
    if (currentMode != MODE_NONE) {
        if (
            cmd == "exiting" || cmd == "locked" || cmd == "ready" ||
            (cmd == "exit_pen1"        && currentMode == MODE_PEN1) ||
            (cmd == "exit_pen2"        && currentMode == MODE_PEN2) ||
            (cmd == "exit_erasing_pen" && currentMode == MODE_ERASING_PEN) ||
            (cmd == "exit_writing"     && currentMode == MODE_WRITING) ||
            (cmd == "exit_erasing"     && currentMode == MODE_ERASING) ||
            (cmd == "exit_screenshot"  && currentMode == MODE_SCREENSHOT)
        ) {
            // كمّل تنفيذ الأوامر المسموحة
        } else {
            Serial.println("[Server] Ignored: cannot start new mode while another mode is running");
            return;
        }
    }

 if (cmd == "pen1") {
        currentMode = MODE_PEN1;
        exitModeRequested = false;
        sendStatusToServer("MODE_PEN1");
        modes.pen1Mode(exitModeRequested);
        currentMode = MODE_NONE;
        display.showModeMenu();
    }
    else if (cmd == "pen2") {
        currentMode = MODE_PEN2;
        exitModeRequested = false;
        sendStatusToServer("MODE_PEN2");
        modes.pen2Mode(exitModeRequested);
        currentMode = MODE_NONE;
        display.showModeMenu();
    }
    else if (cmd == "erasing_pen") {
        currentMode = MODE_ERASING_PEN;
        exitModeRequested = false;
        sendStatusToServer("MODE_ERASING_PEN");
        modes.erasingPenMode(exitModeRequested);
        currentMode = MODE_NONE;
        display.showModeMenu();
    }
    else if (cmd == "writing") {
        currentMode = MODE_WRITING;
        exitModeRequested = false;
        sendStatusToServer("MODE_WRITING");
        modes.writingMode(exitModeRequested);
        currentMode = MODE_NONE;
        display.showModeMenu();
    }
    else if (cmd == "erasing") {
        currentMode = MODE_ERASING;
        exitModeRequested = false;
        sendStatusToServer("MODE_ERASING");
        modes.erasingMode(exitModeRequested);
        currentMode = MODE_NONE;
        display.showModeMenu();
    }
    else if (cmd == "screenshot") {
        currentMode = MODE_SCREENSHOT;
        exitModeRequested = false;
        sendStatusToServer("SCREENSHOT_REQUEST");
        modes.screenshotMode(exitModeRequested);
        currentMode = MODE_NONE;
        display.showModeMenu();
    }

    else if (cmd == "exit_pen1" && currentMode == MODE_PEN1) {
        exitModeRequested = true;
    }if (cmd == "queue_empty") {
        Serial.println("[Server] → Queue is empty notification");
        display.queueEmptyAnimation();
        delay(500);
        if (loggedIn) {
            display.showModeMenu(currentPage);
        }
    }

   
    else if (cmd == "exit_pen2" && currentMode == MODE_PEN2) {
        exitModeRequested = true;
    }
    else if (cmd == "exit_erasing_pen" && currentMode == MODE_ERASING_PEN) {
        exitModeRequested = true;
    }
    else if (cmd == "exit_writing" && currentMode == MODE_WRITING) {
        exitModeRequested = true;
    }
    else if (cmd == "exit_erasing" && currentMode == MODE_ERASING) {
        exitModeRequested = true;
    }
    else if (cmd == "exit_screenshot" && currentMode == MODE_SCREENSHOT) {
        exitModeRequested = true;
    }

    else if (cmd == "exiting") {
        Serial.println("[Server] → Logout triggered");

        loggedIn = false;
        inputPassword = "";
        loginStage = WAIT_RFID;
        currentPage = 1; // إعادة تعيين الصفحة إلى 1
        display.requestRFIDAnimation();
        sendStatusToServer("LOGOUT");
    }

    else if (cmd == "ready") {
        sendStatusToServer("MODE_READY");
    }

    else if (cmd == "locked") {
        Serial.println("[Server] → Manual LOCK triggered from server");
        loggedIn = false;
        inputPassword = "";
        security.attempt = 0;
        loginStage = WAIT_RFID;
        currentPage = 1; // إعادة تعيين الصفحة إلى 1
        display.lockAnimation();
        display.requestRFIDAnimation();
        sendStatusToServer("LOGOUT");
    }

    else if (cmd == "sync") {
        Serial.println("[Server] → Status sync requested");
        // Send current status to server
        if (!loggedIn) {
            sendStatusToServer("IDLE");
        } else if (currentMode == MODE_WRITING) {
            sendStatusToServer("MODE_WRITING");
        } else if (currentMode == MODE_ERASING) {
            sendStatusToServer("MODE_ERASING");
        } else if (currentMode == MODE_PEN1) {
            sendStatusToServer("MODE_PEN1");
        } else if (currentMode == MODE_PEN2) {
            sendStatusToServer("MODE_PEN2");
        } else if (currentMode == MODE_ERASING_PEN) {
            sendStatusToServer("MODE_ERASING_PEN");
        } else if (currentMode == MODE_SCREENSHOT) {
            sendStatusToServer("SCREENSHOT_REQUEST");
        } else {
            sendStatusToServer("LOGIN_OK"); // Logged in, in menu
        }
    }

    else {
        Serial.println("[Server] Unknown command");
    }
}


 void tick() {

  checkServerCommands();

 
 if (loggedIn && (currentMode == MODE_PEN1 || currentMode == MODE_PEN2 || 
                   currentMode == MODE_ERASING_PEN || currentMode == MODE_WRITING || 
                   currentMode == MODE_ERASING || currentMode == MODE_SCREENSHOT)) {
    lastActivityTime = millis();
    return;
}


  if (security.isLocked()) {
    unsigned long rem = security.remainingLockMs();
    display.showLockTimer(rem);
    return;
  }

  if (!loggedIn) {
    handleLogin();
    return;
  }

  handleModeSelection();
}


private:

  void enterSleep() {
    display.clear();
    display.drawTitle("Sleep Mode");
    display.tft.setTextColor(ST77XX_YELLOW);
    display.tft.setTextSize(2);
    display.centerText("Move hand or press key", 120);
    delay(10000);
    display.turnOffScreen();
    analogWrite(LED_RED, 0);
    analogWrite(LED_GRN, 0);
    analogWrite(LED_BLU, 0);
    systemActive = false; 
    Serial.println("[System] Screen turned off (Sleep Mode) - systemActive=false");
  }
  void wakeFromSleep() {
    systemActive = true;
    inputPassword = "";
    lastActivityTime = millis();
    loginStage = WAIT_RFID;
    display.turnOnScreen();
    delay(100);
    display.clear();
    display.drawTitle("Nexa Board");
    display.requestRFIDAnimation();
    Serial.println("[System] Screen reactivated (Wake Up) - systemActive=true");

  }



  void handleLogin() {
    char key = keypad.getKey();
    unsigned long now = millis();

    if (systemActive) {
      lastActivityTime = (key ? now : lastActivityTime);

      if (loginStage == WAIT_RFID) {
      
        int cardStatus = rfidManager.checkState();
        if (cardStatus == 1) {
          Serial.println("[Login] card authorized -> go to ENTER_PASSWORD");
          dfplayer.playSound(3,25);
          display.accessGrantedAnimation();
          delay(300);
          loginStage = ENTER_PASSWORD;
          inputPassword = "";
          display.drawTitle("Enter Password");
          display.drawPasswordMasked(0);
          return;
        } else if (cardStatus == -1) {
         
          Serial.println("[Login] wrong card detected");
          dfplayer.playSound(2,25);
          display.accessDeniedAnimation();
          display.drawTitle("Wrong card");
          display.drawMessage("Try again");
          delay(900);
          display.requestRFIDAnimation();
          return;
        }

     
      } else if (loginStage == ENTER_PASSWORD) {
    
        if (key) {
          if (key == '#') {
            Serial.print("[Login] '#' pressed - checking password=");
            Serial.println(inputPassword);
            if (security.check(inputPassword)) {
              dfplayer.playSound(3,23);
              display.successAnimation();
              security.attempt = 0;
              sendStatusToServer("LOGIN_OK");
              loggedIn = true;
              display.showModeMenu();
              Serial.println("[Login] loggedIn = true");
            } else {
              Serial.println("[Login] password incorrect");
               dfplayer.playSound(2,23);
              sendStatusToServer("LOGIN_FAIL");
              display.errorAnimation(security.attempt, security.maxAttempt);
              if (security.isLocked()) {
               dfplayer.playSound(6,23);
                display.lockAnimation();
                inputPassword = "";
                return;
              }
             
              display.drawTitle("Try Again");
              display.drawMessage("Enter password:");
              inputPassword = "";
              display.drawPasswordMasked(0);
            }
          } else if (key == '*') {
            inputPassword = "";
            Serial.println("[Login] '*' pressed - password cleared");
            display.drawPasswordMasked(0);
          } else {

            inputPassword += key;
            Serial.print("[Login] appended key to password, now=");
            Serial.println(inputPassword);
             dfplayer.playSound(4,25);
            display.drawPasswordMasked((uint8_t)inputPassword.length());
           
          }
        }
      }

      
     if (currentMode == MODE_NONE && (now - lastActivityTime >= timeoutMs)) {
    enterSleep();
    sendStatusToServer("SLEEP");
}

    } else {
  
      if (key) {
        Serial.println("[System] key pressed while sleeping -> wakeFromSleep()");
        sendStatusToServer("IDLE");
        wakeFromSleep();
      
      }
    }
  }

 void handleModeSelection() {
  char key = keypad.getKey();
  if (!key) return;

  Serial.print("[ModeSelection] key=");
  Serial.println(key);
  switch (key) {
    case '1':
      if (currentPage == 1) {
        sendStatusToServer("MODE_PEN1");
        exitModeRequested = false;
        currentMode = MODE_PEN1;
        modes.pen1Mode(exitModeRequested);
        currentMode = MODE_NONE;
        display.showModeMenu(currentPage);
      }
      break;

    case '2':
      if (currentPage == 1) {
        sendStatusToServer("MODE_PEN2");
        exitModeRequested = false;
        currentMode = MODE_PEN2;
        modes.pen2Mode(exitModeRequested);
        currentMode = MODE_NONE;
        display.showModeMenu(currentPage);
      }
      break;

    case '3':
      if (currentPage == 1) {
        sendStatusToServer("MODE_ERASING_PEN");
        exitModeRequested = false;
        currentMode = MODE_ERASING_PEN;
        modes.erasingPenMode(exitModeRequested);
        currentMode = MODE_NONE;
        display.showModeMenu(currentPage);
      }
      break;
    
    case '*':
      // Exit في جميع الصفحات
      {
        bool logoutRequested = false;
        sendStatusToServer("LOGOUT");
        modes.exitMode(logoutRequested);
        loggedIn = false;
        inputPassword = "";
        security.attempt = 0;
        loginStage = WAIT_RFID;
        currentPage = 1; // إعادة تعيين الصفحة إلى 1

        display.clear();
        display.drawTitle("Nexa Board");
        display.requestRFIDAnimation();
        Serial.println("[ModeSelection] logged out, waiting for RFID");
        lastActivityTime = millis();
      }
      break;
    
    case '4':
      if (currentPage == 2) {
        sendStatusToServer("DRAWING_BUTTON_PRESSED");
        // Wait for server to respond with "writing" or "queue_empty"
      }
      break;

    case '5':
      if (currentPage == 2) {
        sendStatusToServer("MODE_ERASING");
        exitModeRequested = false;
        currentMode = MODE_ERASING;
        modes.erasingMode(exitModeRequested);
        currentMode = MODE_NONE;
        display.showModeMenu(currentPage);
      }
      break;

    case '6':
      if (currentPage == 2) {
        sendStatusToServer("SCREENSHOT_REQUEST");
        exitModeRequested = false;
        currentMode = MODE_SCREENSHOT;
        modes.screenshotMode(exitModeRequested);
        currentMode = MODE_NONE;
        display.showModeMenu(currentPage);
      }
      break;
    
    case 'B':
      if (currentPage > 1) {
        currentPage--;
        display.showModeMenu(currentPage);
        Serial.println("[ModeSelection] previous page");
      }
      break;

    case 'A':
      if (currentPage < 2) {
        currentPage++;
        display.showModeMenu(currentPage);
        Serial.println("[ModeSelection] next page");
      }
      break;

    default:
      Serial.println("[ModeSelection] unknown key");
      break;
  }
}

};

/* =====================================================
 *              ModeHandler Implementation
 * ===================================================== */

void ModeHandler::writingMode(bool &exitRequested) {
  display.clear();
  display.drawTitle("Drawing Mode");
  display.centerText("Server or #: exit", 280);

  int y = 160;

  while (!exitRequested) {
    // قراءة أوامر السيرفر
    if (system) system->checkServerCommands();
  
    char key = keypad.getKey();
    if (key == '#') {
      exitRequested = true;
      break;
    }

    display.rgbEffect("writing", 15);

    for (int x = 20; x < 220 && !exitRequested; x += 10) {
      if (system) system->checkServerCommands();
      char keyInner = keypad.getKey();
      if (keyInner == '#') {
        exitRequested = true;
        break;
      }

      display.tft.drawLine(20, y, x, y, ST77XX_CYAN);
      delay(50);
    }

    display.tft.fillRect(20, y - 2, 200, 4, ST77XX_BLACK);
  }

  exitRequested = false; 

  display.clear();
  display.drawTitle("Done Drawing");
  Serial.println("MODE_READY");
  delay(600);
}

void ModeHandler::erasingMode(bool &exitRequested) {
  display.clear();
  display.drawTitle("Erasing Mode");
  display.centerText("Server or #: exit", 280);

  int y = 160;

  while (!exitRequested) {
    // قراءة أوامر السيرفر
    if (system) system->checkServerCommands();
    
    char key = keypad.getKey();
    if (key == '#') {
      exitRequested = true;
      break;
    }

    display.rgbEffect("erasing", 20);

    for (int x = 0; x < 240 && !exitRequested; x += 20) {
      if (system) system->checkServerCommands();
      char keyInner = keypad.getKey();
      if (keyInner == '#') {
        exitRequested = true;
        break;
      }

      display.tft.fillRect(x, y - 30, 20, 60, ST77XX_RED);
      delay(60);
      display.tft.fillRect(x, y - 30, 20, 60, ST77XX_BLACK);
    }
  }

  exitRequested = false; 

  display.clear();
  display.drawTitle("Done Erasing");
  Serial.println("MODE_READY");
  delay(600);
}

void ModeHandler::pen1Mode(bool &exitRequested) {
  display.clear();
  display.drawTitle("Pen 1");
  display.centerText("# to exit", 280);

  int y = 120;
  uint8_t hue = 0;

  while (!exitRequested) {
    if (system) system->checkServerCommands();
    char key = keypad.getKey();
    if (key == '#') break;

    uint16_t color = display.tft.color565(
      abs(128 - hue) * 2,
      hue,
      255 - hue
    );

    display.tft.drawLine(20, y, 220, y, color);
    y += 6;
    hue += 12;

    if (y > 200) {
      display.clear();
      display.drawTitle("Pen 1");
      y = 90;
    }

    delay(40);
  }

  exitRequested = false;
  display.clear();
  display.drawTitle("Pen1 Done");
  delay(600);
}


void ModeHandler::pen2Mode(bool &exitRequested) {
  display.clear();
  display.drawTitle("Pen 2");
  display.centerText("# to exit", 280);

  int cx = 120, cy = 140;
  int radius = 5;
  bool grow = true;

  while (!exitRequested) {
    if (system) system->checkServerCommands();
    char key = keypad.getKey();
    if (key == '#') break;

    display.tft.drawCircle(cx, cy, radius, ST77XX_CYAN);

    if (grow) radius++;
    else radius--;

    if (radius > 40) grow = false;
    if (radius < 6)  grow = true;

    delay(35);
  }

  exitRequested = false;
  display.clear();
  display.drawTitle("Pen2 Done");
  delay(600);
}


void ModeHandler::erasingPenMode(bool &exitRequested) {
  display.clear();
  display.drawTitle("Erasing Pen");
  display.centerText("# to exit", 280);

  int x = 30;
  int y = 100;
  bool moveRight = true;

  while (!exitRequested) {
    if (system) system->checkServerCommands();
    char key = keypad.getKey();
    if (key == '#') break;

    display.tft.fillCircle(x, y, 12, ST77XX_BLACK);
    display.tft.drawCircle(x, y, 12, ST77XX_RED);

    x += moveRight ? 12 : -12;

    if (x > 210 || x < 30) {
      moveRight = !moveRight;
      y += 25;
      if (y > 190) y = 90;
    }

    delay(50);
  }

  exitRequested = false;
  display.clear();
  display.drawTitle("Erase Done");
  delay(600);
}


void ModeHandler::screenshotMode(bool &exitRequested) {
  display.clear();
  display.drawTitle("Screenshot");
  display.centerText("Server: exit", 280);
  
  int centerX = 120;
  int centerY = 120;

  while (!exitRequested) {
    if (system) system->checkServerCommands();
    // Animation: Camera flash effect
    display.tft.fillCircle(centerX, centerY, 40, ST77XX_WHITE);
    display.tft.fillCircle(centerX, centerY, 30, ST77XX_BLUE);
    display.tft.fillRect(centerX - 15, centerY - 5, 30, 10, ST77XX_WHITE);
    display.tft.fillCircle(centerX + 20, centerY - 20, 5, ST77XX_YELLOW);
    
    display.tft.setTextColor(ST77XX_WHITE);
    display.tft.setTextSize(2);
    display.centerText("Taking Screenshot...", 180);
    
    // Flash effect
    for (int i = 0; i < 3 && !exitRequested; i++) {
      if (system) system->checkServerCommands();
      display.setRGB(255, 255, 255);
      delay(100);
      display.setRGB(0, 0, 0);
      delay(100);
    }
    
    delay(500);
  }

  exitRequested = false;
  display.clear();
  display.drawTitle("Screenshot Done");
  Serial.println("MODE_READY");
  delay(600);
}

void ModeHandler::exitMode(bool& logoutRequested) {
  display.rgbEffect("exit", 25);
  display.clear();
  display.drawTitle("LOG OUT");

  display.tft.setTextColor(ST77XX_WHITE);
  display.tft.setTextSize(2);
  display.centerText("Logging out...", 180);

  logoutRequested = true;
  delay(600);
}

/* ----------------- App Instance ----------------- */
NexaBoardSystem App;

/* ----------------- Arduino Hooks ---------------- */
void setup() { App.begin(); }
void loop()  { App.tick(); }
