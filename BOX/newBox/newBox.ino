#include <Keypad.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7789.h>
#include <Adafruit_ST77xx.h>
#include <Servo.h>
#include <MFRC522.h>
#include <avr/sleep.h>
#include <avr/power.h>
#include <Servo.h>
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
#define SERVO_M3_PIN 6

Servo servoM3;
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

  void clearContent() {
    // Clear only content area, preserve header (first 50 pixels)
    tft.fillRect(0, 50, 320, 190, ST77XX_BLACK);
  }

  void drawTitle(const char* text) {
    clear();
    // Premium gradient header with smooth transition
    for (int i = 0; i < 50; i += 2) {
      int brightness = 22 + (i * 12 / 50);
      tft.drawFastHLine(0, i, 320, tft.color565(brightness, brightness, brightness + 32));
    }
    
    // Triple-layer glowing underline
    tft.fillRect(0, 48, 320, 3, tft.color565(0, 200, 255));
    tft.fillRect(0, 49, 320, 2, tft.color565(0, 230, 255));
    tft.fillRect(0, 50, 320, 1, tft.color565(120, 245, 255));
    
    // Text with premium shadow
    tft.setTextColor(tft.color565(0, 90, 140));
    tft.setTextSize(3);
    centerText(text, 19);
    tft.setTextColor(tft.color565(0, 240, 255));
    centerText(text, 18);
  }

  void drawMessage(const char* text) {
    // Premium message card with depth
    int cardY = 82;
    int cardW = 280, cardH = 55;
    int cardX = (320 - cardW) / 2;
    
    // Shadow layers
    tft.fillRoundRect(cardX + 3, cardY + 3, cardW, cardH, 9, tft.color565(3, 3, 8));
    
    // Card gradient
    tft.fillRoundRect(cardX, cardY, cardW, cardH, 9, tft.color565(15, 15, 35));
    tft.fillRoundRect(cardX + 1, cardY + 1, cardW - 2, cardH - 2, 8, tft.color565(22, 22, 45));
    
    // Triple border
    tft.drawRoundRect(cardX, cardY, cardW, cardH, 9, tft.color565(0, 180, 255));
    tft.drawRoundRect(cardX + 1, cardY + 1, cardW - 2, cardH - 2, 8, tft.color565(80, 100, 140));
    
    // Left accent
    tft.fillRoundRect(cardX + 4, cardY + 4, 5, cardH - 8, 2, tft.color565(0, 200, 255));
    tft.fillRoundRect(cardX + 5, cardY + 5, 3, cardH - 10, 2, tft.color565(100, 230, 255));
    
    // Text with subtle shadow
    tft.setTextColor(tft.color565(150, 150, 170));
    tft.setTextSize(2);
    centerText(text, cardY + 20);
    tft.setTextColor(ST77XX_WHITE);
    centerText(text, cardY + 19);
  }

  void drawPasswordMasked(uint8_t length) {
    // Premium password card with enhanced depth
    int cardX = 45, cardY = 138, cardW = 230, cardH = 68;
    
    // Clear area
    tft.fillRect(cardX - 5, cardY - 5, cardW + 10, cardH + 10, ST77XX_BLACK);
    
    // Multi-layer shadow for depth
    tft.fillRoundRect(cardX + 4, cardY + 4, cardW, cardH, 10, tft.color565(3, 3, 8));
    tft.fillRoundRect(cardX + 3, cardY + 3, cardW, cardH, 10, tft.color565(6, 6, 12));
    
    // Card gradient background
    tft.fillRoundRect(cardX, cardY, cardW, cardH, 10, tft.color565(12, 12, 32));
    tft.fillRoundRect(cardX + 1, cardY + 1, cardW - 2, cardH - 2, 9, tft.color565(18, 18, 42));
    
    // Triple-layer glowing border
    tft.drawRoundRect(cardX, cardY, cardW, cardH, 10, tft.color565(0, 200, 255));
    tft.drawRoundRect(cardX + 1, cardY + 1, cardW - 2, cardH - 2, 9, tft.color565(0, 140, 220));
    tft.drawRoundRect(cardX + 2, cardY + 2, cardW - 4, cardH - 4, 8, tft.color565(25, 35, 65));
    
    // Premium left accent with gradient
    tft.fillRoundRect(cardX + 4, cardY + 4, 5, cardH - 8, 2, tft.color565(0, 220, 255));
    tft.fillRoundRect(cardX + 5, cardY + 5, 3, cardH - 10, 2, tft.color565(120, 240, 255));
    
    // Icon box with depth
    int iconX = cardX + 18, iconY = cardY + 16;
    tft.fillRoundRect(iconX + 1, iconY + 1, 34, 34, 4, tft.color565(5, 5, 10));
    tft.fillRoundRect(iconX, iconY, 34, 34, 4, tft.color565(0, 90, 140));
    tft.drawRoundRect(iconX, iconY, 34, 34, 4, tft.color565(0, 200, 255));
    tft.setTextColor(tft.color565(100, 240, 255));
    tft.setTextSize(3);
    tft.setCursor(iconX + 8, iconY + 8);
    tft.print("#");
    
    // Label with subtle glow
    tft.setTextColor(tft.color565(120, 120, 140));
    tft.setTextSize(1);
    tft.setCursor(cardX + 60, cardY + 11);
    tft.print("ENTER PIN CODE");
    
    // Premium password dots with animated glow
    int dotsY = cardY + 38;
    int dotSpacing = 23;
    int startX = cardX + 68;
    
    for (uint8_t i = 0; i < 4; i++) {
      int dotX = startX + (i * dotSpacing);
      if (i < length) {
        // Filled dot with multi-layer glow
        tft.fillCircle(dotX, dotsY, 9, tft.color565(0, 60, 100));
        tft.fillCircle(dotX, dotsY, 8, tft.color565(0, 160, 240));
        tft.fillCircle(dotX, dotsY, 6, tft.color565(80, 220, 255));
        tft.fillCircle(dotX, dotsY, 4, tft.color565(200, 250, 255));
        tft.fillCircle(dotX, dotsY, 2, ST77XX_WHITE);
      } else {
        // Empty dot with subtle depth
        tft.drawCircle(dotX, dotsY, 8, tft.color565(50, 50, 90));
        tft.drawCircle(dotX, dotsY, 7, tft.color565(35, 35, 65));
        tft.fillCircle(dotX, dotsY, 3, tft.color565(20, 20, 40));
      }
    }
  }

 void showModeMenu(int page = 1) {
  clear();
  
  // Premium gradient header
  for (int i = 0; i < 50; i += 2) {
    int brightness = 22 + (i * 12 / 50);
    tft.drawFastHLine(0, i, 320, tft.color565(brightness, brightness, brightness + 32));
  }
  
  // Triple-layer glowing underline
  tft.fillRect(0, 48, 320, 3, tft.color565(0, 200, 255));
  tft.fillRect(0, 49, 320, 2, tft.color565(0, 230, 255));
  tft.fillRect(0, 50, 320, 1, tft.color565(120, 245, 255));
  
  // Title with shadow effect
  tft.setTextColor(tft.color565(0, 90, 140));
  tft.setTextSize(3);
  centerText("MODE SELECT", 19);
  tft.setTextColor(tft.color565(0, 240, 255));
  centerText("MODE SELECT", 18);
  
  // Enhanced page indicator with navigation on the left
  tft.setTextSize(1);
  tft.setTextColor(tft.color565(110, 110, 130));
  char pageText[10];
  sprintf(pageText, "PAGE %d/2", page);
  tft.setCursor(266, 7);
  tft.print(pageText);
  
  // Page navigation buttons on top left
  if (page == 1) {
    // A: NEXT button (top left)
    tft.fillRoundRect(5, 4, 35, 18, 4, tft.color565(30, 30, 60));
    tft.drawRoundRect(5, 4, 35, 18, 4, tft.color565(100, 150, 255));
    tft.setTextColor(tft.color565(150, 150, 200));
    tft.setTextSize(1);
    tft.setCursor(10, 9);
    tft.print("A>");
  } else if (page == 2) {
    // B: PREV button (top left)
    tft.fillRoundRect(5, 4, 35, 18, 4, tft.color565(30, 30, 60));
    tft.drawRoundRect(5, 4, 35, 18, 4, tft.color565(100, 150, 255));
    tft.setTextColor(tft.color565(150, 150, 200));
    tft.setTextSize(1);
    tft.setCursor(10, 9);
    tft.print("<B");
  }
  
  // Menu cards with premium spacing
  int cardY = 68;
  int cardH = 40;
  int spacing = 10;
  
  if (page == 1) {
    // Card 1: Pen 1
    drawMenuCard(1, cardY, "1", "PEN 1", ST77XX_CYAN);
    cardY += cardH + spacing;
    
    // Card 2: Pen 2  
    drawMenuCard(2, cardY, "2", "PEN 2", tft.color565(100, 200, 255));
    cardY += cardH + spacing;
    
    // Card 3: Erasing Pen
    drawMenuCard(3, cardY, "3", "ERASING PEN", tft.color565(255, 150, 50));
  }
  else if (page == 2) {
    // Card 4: Drawing
    drawMenuCard(4, cardY, "4", "DRAWING", ST77XX_GREEN);
    cardY += cardH + spacing;
    
    // Card 5: Erasing
    drawMenuCard(5, cardY, "5", "ERASING", ST77XX_RED);
    cardY += cardH + spacing;
    
    // Card 6: Screenshot
    drawMenuCard(6, cardY, "6", "SCREENSHOT", ST77XX_YELLOW);
  }
  
  // Premium exit button with depth and glow
  int exitY = 266;
  
  // Multi-layer shadow
  tft.fillRoundRect(24, exitY + 5, 280, 42, 10, tft.color565(6, 2, 2));
  tft.fillRoundRect(23, exitY + 4, 280, 42, 10, tft.color565(10, 3, 3));
  
  // Button gradient layers
  tft.fillRoundRect(20, exitY, 280, 42, 10, tft.color565(55, 12, 12));
  tft.fillRoundRect(21, exitY + 1, 278, 40, 9, tft.color565(75, 18, 18));
  
  // Triple glowing border
  tft.drawRoundRect(20, exitY, 280, 42, 10, tft.color565(255, 60, 60));
  tft.drawRoundRect(21, exitY + 1, 278, 40, 9, tft.color565(255, 90, 90));
  tft.drawRoundRect(22, exitY + 2, 276, 38, 8, tft.color565(180, 35, 35));
  
  // Top shine effect
  tft.drawRoundRect(24, exitY + 4, 272, 12, 6, tft.color565(95, 25, 25));
  
  // Icon circle with depth
  int iconX = 52, iconY = exitY + 21;
  tft.fillCircle(iconX + 1, iconY + 1, 13, tft.color565(8, 2, 2));
  tft.fillCircle(iconX, iconY, 13, tft.color565(220, 40, 40));
  tft.fillCircle(iconX, iconY, 11, tft.color565(255, 80, 80));
  tft.setTextColor(ST77XX_WHITE);
  tft.setTextSize(2);
  tft.setCursor(iconX - 5, iconY - 7);
  tft.print("*");
  
  // Label with glow
  tft.setTextColor(tft.color565(255, 180, 180));
  tft.setTextSize(2);
  tft.setCursor(85, exitY + 15);
  tft.print("EXIT SYSTEM");
  
  Serial.print("[Display] mode menu page ");
  Serial.println(page);
}

void drawMenuCard(int num, int y, const char* key, const char* label, uint16_t color) {
  int cardX = 20, cardW = 280, cardH = 40;
  
  // Premium multi-layer shadow with blur
  tft.fillRoundRect(cardX + 5, y + 5, cardW, cardH, 9, tft.color565(2, 2, 6));
  tft.fillRoundRect(cardX + 4, y + 4, cardW, cardH, 9, tft.color565(4, 4, 10));
  tft.fillRoundRect(cardX + 3, y + 3, cardW, cardH, 9, tft.color565(6, 6, 14));
  
  // Card gradient background
  tft.fillRoundRect(cardX, y, cardW, cardH, 9, tft.color565(12, 12, 28));
  tft.fillRoundRect(cardX + 1, y + 1, cardW - 2, cardH - 2, 8, tft.color565(20, 20, 40));
  
  // Premium triple-layer border with glow
  tft.drawRoundRect(cardX, y, cardW, cardH, 9, color);
  
  // Calculate dimmed and bright versions of color
  uint8_t r = (color >> 11) & 0x1F;
  uint8_t g = (color >> 5) & 0x3F;
  uint8_t b = color & 0x1F;
  uint16_t dimColor = tft.color565(r * 8 / 2, g * 4 / 2, b * 8 / 2);
  uint16_t brightColor = tft.color565(min(31, r + 10), min(63, g + 20), min(31, b + 10));
  
  tft.drawRoundRect(cardX + 1, y + 1, cardW - 2, cardH - 2, 8, dimColor);
  tft.drawRoundRect(cardX + 2, y + 2, cardW - 4, cardH - 4, 7, tft.color565(32, 32, 52));
  
  // Premium left accent with gradient
  tft.fillRoundRect(cardX + 4, y + 4, 6, cardH - 8, 3, color);
  tft.fillRoundRect(cardX + 5, y + 5, 4, cardH - 10, 2, brightColor);
  
  // Top shine/highlight
  tft.drawFastHLine(cardX + 12, y + 3, cardW - 24, tft.color565(42, 42, 62));
  
  // Premium key circle with 3D depth
  int circleX = cardX + 40;
  int circleY = y + cardH / 2;
  tft.fillCircle(circleX + 2, circleY + 2, 15, tft.color565(4, 4, 8));
  tft.fillCircle(circleX, circleY, 15, color);
  tft.fillCircle(circleX, circleY, 14, dimColor);
  tft.fillCircle(circleX - 1, circleY - 1, 12, brightColor);
  
  // Key text
  tft.setTextColor(ST77XX_BLACK);
  tft.setTextSize(2);
  int textOffset = (strlen(key) > 1) ? -7 : -5;
  tft.setCursor(circleX + textOffset, circleY - 7);
  tft.print(key);
  
  // Label with premium typography
  tft.setTextColor(tft.color565(240, 240, 250));
  tft.setTextSize(2);
  tft.setCursor(cardX + 72, y + 13);
  tft.print(label);
  
  // Animated arrow indicator with glow
  int arrowX = cardX + cardW - 20;
  int arrowY = y + cardH / 2;
  tft.fillTriangle(arrowX + 1, arrowY + 1, arrowX + 9, arrowY - 5, arrowX + 9, arrowY + 6, tft.color565(4, 4, 8));
  tft.fillTriangle(arrowX, arrowY, arrowX + 9, arrowY - 6, arrowX + 9, arrowY + 6, color);
  tft.fillTriangle(arrowX + 1, arrowY, arrowX + 8, arrowY - 5, arrowX + 8, arrowY + 5, brightColor);
}


   void successAnimation() {
    clear();
    
    // Modern header
    tft.fillRect(0, 0, 320, 50, tft.color565(25, 25, 50));
    tft.fillRect(0, 48, 320, 2, tft.color565(0, 200, 100));
    tft.setTextColor(tft.color565(0, 255, 150));
    tft.setTextSize(3);
    centerText("SUCCESS", 18);
    
    // Success card
    int cardY = 80;
    int cardW = 280, cardH = 150;
    int cardX = (320 - cardW) / 2;
    
    // Animated card appearance
    for (int i = 0; i <= cardH; i += 15) {
      tft.fillRoundRect(cardX, cardY, cardW, i, 8, tft.color565(0, 40, 20));
      delay(8);
    }
    
    tft.fillRoundRect(cardX, cardY, cardW, cardH, 8, tft.color565(0, 40, 20));
    tft.drawRoundRect(cardX, cardY, cardW, cardH, 8, tft.color565(0, 200, 100));
    tft.drawRoundRect(cardX + 1, cardY + 1, cardW - 2, cardH - 2, 7, tft.color565(0, 100, 50));
    
    // Left accent
    tft.fillRoundRect(cardX + 2, cardY + 2, 4, cardH - 4, 2, tft.color565(0, 255, 150));
    
    // Checkmark circle icon
    int iconCenterX = 160;
    int iconCenterY = cardY + 60;
    
    // Animated checkmark
    tft.fillCircle(iconCenterX, iconCenterY, 35, tft.color565(0, 200, 100));
    delay(100);
    
    // Draw clean checkmark with proper thickness
    int checkX = iconCenterX - 12;
    int checkY = iconCenterY;
    
    // Left part of checkmark (going down)
    for (int i = 0; i <= 10; i++) {
      tft.fillCircle(checkX + i, checkY + i, 2, ST77XX_WHITE);
      delay(12);
    }
    
    // Right part of checkmark (going up)
    for (int i = 0; i <= 20; i++) {
      tft.fillCircle(checkX + 10 + i, checkY + 10 - i, 2, ST77XX_WHITE);
      delay(10);
    }
    
    delay(150);
    
    // Text
    tft.setTextColor(tft.color565(0, 255, 150));
    tft.setTextSize(2);
    centerText("LOGIN SUCCESS", cardY + 120);
    
    // Bottom status bar
    tft.fillRoundRect(20, 260, 280, 35, 6, tft.color565(0, 30, 15));
    tft.drawRoundRect(20, 260, 280, 35, 6, tft.color565(0, 150, 75));
    tft.setTextColor(tft.color565(0, 200, 100));
    tft.setTextSize(1);
    centerText("Authentication successful", 275);
    
    delay(500);
  }


 void errorAnimation(uint8_t attempt, uint8_t maxAttempt) {
    // Premium shake effect with smooth decay
    for (int shake = 0; shake < 5; shake++) {
      int intensity = 6 - shake;
      for (int offset = -intensity; offset <= intensity; offset += intensity * 2) {
        tft.fillRect(40 + offset, 138, 240, 68, tft.color565(80, 0, 0));
        tft.drawRoundRect(45 + offset, 138, 230, 68, 10, ST77XX_RED);
        delay(28);
        tft.fillRect(40 + offset, 138, 240, 68, ST77XX_BLACK);
      }
    }
    
    clear();
    int centerX = 160, centerY = 120;
    
    // Smooth pulsing red background with gradient
    for (int r = 0; r <= 65; r += 3) {
      int brightness = map(r, 0, 65, 255, 90);
      tft.fillCircle(centerX, centerY, r, tft.color565(brightness, 0, 0));
      delay(10);
    }
    
    delay(70);
    
    // Premium X mark with smooth drawing and thickness
    for (int i = 0; i <= 48; i += 2) {
      // Draw with premium thickness
      for (int thick = -3; thick <= 3; thick++) {
        tft.drawLine(132 + i, 92 + i + thick, 134 + i, 94 + i + thick, ST77XX_WHITE);
        tft.drawLine(188 - i, 92 + i + thick, 186 - i, 94 + i + thick, ST77XX_WHITE);
      }
      delay(8);
    }
    
    // Subtle outer glow
    tft.drawLine(132, 92, 184, 144, tft.color565(255, 80, 80));
    tft.drawLine(184, 92, 132, 144, tft.color565(255, 80, 80));
    
    delay(120);
    
    // Premium text with shadow and glow
    tft.setTextColor(tft.color565(100, 0, 0));
    tft.setTextSize(2);
    centerText("Access Denied!", 171);
    tft.setTextColor(tft.color565(255, 100, 100));
    centerText("Access Denied!", 170);
    
    if (attempt < maxAttempt) {
      delay(180);
      // Premium info card
      tft.fillRoundRect(75, 193, 170, 26, 5, tft.color565(40, 35, 0));
      tft.drawRoundRect(75, 193, 170, 26, 5, tft.color565(255, 200, 0));
      tft.drawRoundRect(76, 194, 168, 24, 4, tft.color565(180, 140, 0));
      tft.setTextColor(tft.color565(255, 220, 50));
      tft.setTextSize(1);
      char attemptMsg[30];
      sprintf(attemptMsg, "Attempts left: %d", maxAttempt - attempt);
      centerText(attemptMsg, 202);
    }
    
    delay(700);
  }

   void lockAnimation() {
    clear();
    int centerX = 160, centerY = 90;
    
    // Animated red pulse background
    for (int r = 0; r < 3; r++) {
      for (int i = 0; i <= 80; i += 8) {
        int brightness = 255 - i * 2;
        tft.drawCircle(centerX, centerY + 15, i, tft.color565(brightness, 0, 0));
        delay(8);
      }
    }
    
    // 3D lock body with shadow
    tft.fillRoundRect(centerX - 27, centerY + 3, 54, 54, 8, tft.color565(40, 0, 0));
    tft.fillRoundRect(centerX - 25, centerY, 50, 50, 8, tft.color565(200, 0, 0));
    tft.drawRoundRect(centerX - 25, centerY, 50, 50, 8, ST77XX_WHITE);
    tft.drawRoundRect(centerX - 24, centerY + 1, 48, 48, 7, tft.color565(255, 100, 100));
    
    // 3D shackle with depth
    for (int offset = 0; offset <= 2; offset++) {
      tft.drawRoundRect(centerX - 15 + offset, centerY - 22 + offset, 30, 28, 10, tft.color565(100, 100, 100));
    }
    tft.drawRoundRect(centerX - 15, centerY - 22, 30, 28, 10, ST77XX_WHITE);
    tft.drawRoundRect(centerX - 13, centerY - 20, 26, 25, 9, tft.color565(200, 200, 200));
    tft.fillRect(centerX - 15, centerY - 7, 30, 12, ST77XX_BLACK);
    
    // Keyhole with glow
    tft.fillCircle(centerX, centerY + 20, 6, tft.color565(100, 100, 0));
    tft.fillCircle(centerX, centerY + 20, 5, ST77XX_YELLOW);
    tft.fillTriangle(centerX - 3, centerY + 22, centerX + 3, centerY + 22, centerX, centerY + 35, ST77XX_YELLOW);
    
    delay(200);
    
    // Text with glow effect
    tft.setTextColor(tft.color565(150, 0, 0));
    tft.setTextSize(3);
    centerText("LOCKED", 156);
    tft.setTextColor(ST77XX_RED);
    centerText("LOCKED", 155);
    
    tft.fillRoundRect(100, 182, 120, 20, 4, tft.color565(40, 20, 20));
    tft.setTextColor(tft.color565(150, 80, 80));
    tft.setTextSize(1);
    centerText("Access Denied", 188);
    
    delay(500);
  }

   void showLockTimer(unsigned long remainingMs) {
    int totalSeconds = remainingMs / 1000;
    int minutes = totalSeconds / 60;
    int seconds = totalSeconds % 60;
    int centerX = 160, centerY = 120;
    
    // Clean minimal design with focus on timer
    
    // Top warning bar
    tft.fillRoundRect(30, 40, 260, 35, 8, tft.color565(60, 0, 0));
    tft.drawRoundRect(30, 40, 260, 35, 8, ST77XX_RED);
    tft.setTextColor(tft.color565(255, 100, 100));
    tft.setTextSize(2);
    centerText("LOCKED", 52);
    
    // Large timer display
    char buffer[10];
    if (minutes > 0) sprintf(buffer, "%d:%02d", minutes, seconds);
    else sprintf(buffer, "%d", seconds);
    
    int16_t x1, y1; uint16_t w, h;
    tft.setTextSize(6);
    
    // Shadow
    tft.setTextColor(tft.color565(40, 0, 0));
    tft.getTextBounds(buffer, 0, 0, &x1, &y1, &w, &h);
    tft.setCursor(centerX - w / 2 + 2, centerY - h / 2 + 2);
    tft.print(buffer);
    
    // Main timer text with color based on urgency
    uint16_t textColor;
    if (totalSeconds <= 5) textColor = ST77XX_RED;
    else if (totalSeconds <= 10) textColor = tft.color565(255, 150, 0);
    else textColor = ST77XX_WHITE;
    
    tft.setTextColor(textColor);
    tft.setCursor(centerX - w / 2, centerY - h / 2);
    tft.print(buffer);
    
    // Progress bar at bottom
    int barWidth = 240;
    int barX = 40;
    int barY = 180;
    float progress = (float)totalSeconds / 30.0;
    int fillWidth = barWidth * progress;
    
    // Bar background
    tft.fillRoundRect(barX, barY, barWidth, 20, 5, tft.color565(30, 30, 30));
    tft.drawRoundRect(barX, barY, barWidth, 20, 5, tft.color565(100, 100, 100));
    
    // Bar fill with color
    uint16_t barColor;
    if (totalSeconds <= 5) barColor = ST77XX_RED;
    else if (totalSeconds <= 10) barColor = tft.color565(255, 100, 0);
    else barColor = tft.color565(0, 200, 255);
    
    if (fillWidth > 0) {
      tft.fillRoundRect(barX + 2, barY + 2, fillWidth - 4, 16, 4, barColor);
    }
    
    // Message
    tft.setTextSize(1);
    tft.setTextColor(tft.color565(150, 150, 150));
    centerText("Please wait...", 215);
    
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
      // Ultra-smooth rainbow with quadratic easing
      for (int i = 0; i <= 255; i += 2) { 
        int eased = (i * i) / 255;
        setRGB(eased, 255 - eased, 0); 
        delay(speed - 8); 
      }
      for (int i = 0; i <= 255; i += 2) { 
        int eased = (i * i) / 255;
        setRGB(0, eased, 255 - eased); 
        delay(speed - 8); 
      }
      for (int i = 0; i <= 255; i += 2) { 
        int eased = (i * i) / 255;
        setRGB(255 - eased, 0, eased); 
        delay(speed - 8); 
      }
      // Smooth fade out
      for (int i = 255; i >= 0; i -= 5) {
        setRGB(i, 0, 255 - i);
        delay(speed - 12);
      }
    } 
    else if (mode == "erasing") {
      // Smooth breathing blue pulse
      for (int pulse = 0; pulse < 2; pulse++) {
        for (int i = 0; i <= 255; i += 4) { 
          int brightness = (i * i) / 255;
          setRGB(0, brightness / 5, brightness); 
          delay(speed - 10); 
        }
        for (int i = 255; i >= 0; i -= 4) { 
          int brightness = (i * i) / 255;
          setRGB(0, brightness / 5, brightness); 
          delay(speed - 10); 
        }
      }
    } 
    else if (mode == "exit") {
      // Smooth pulsing red warning
      for (int i = 0; i <= 255; i += 4) { 
        int brightness = (i * i) / 255;
        setRGB(brightness, brightness / 10, 0); 
        delay(speed - 10); 
      }
      delay(120);
      for (int i = 255; i >= 0; i -= 4) { 
        int brightness = (i * i) / 255;
        setRGB(brightness, brightness / 10, 0); 
        delay(speed - 10); 
      }
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
    
    // Modern header
    tft.fillRect(0, 0, 320, 50, tft.color565(25, 25, 50));
    tft.fillRect(0, 48, 320, 2, ST77XX_CYAN);
    tft.setTextColor(ST77XX_CYAN);
    tft.setTextSize(3);
    centerText("NEXA BOARD", 18);
    
    int centerX = 160;
    int centerY = 130;
    
    // Modern instruction card
    int cardY = 75;
    int cardW = 280, cardH = 120;
    int cardX = (320 - cardW) / 2;
    
    // Card with depth
    tft.fillRoundRect(cardX, cardY, cardW, cardH, 8, tft.color565(20, 20, 40));
    tft.drawRoundRect(cardX, cardY, cardW, cardH, 8, ST77XX_CYAN);
    tft.drawRoundRect(cardX + 1, cardY + 1, cardW - 2, cardH - 2, 7, tft.color565(40, 40, 60));
    
    // Left accent
    tft.fillRoundRect(cardX + 2, cardY + 2, 4, cardH - 4, 2, ST77XX_CYAN);
    
    // RFID icon - modern card symbol
    int iconX = cardX + 30;
    int iconY = cardY + 35;
    int iconW = 50, iconH = 35;
    
    // Mini card icon
    tft.fillRoundRect(iconX, iconY, iconW, iconH, 4, tft.color565(200, 200, 220));
    tft.drawRoundRect(iconX, iconY, iconW, iconH, 4, ST77XX_CYAN);
    
    // Chip on mini card
    tft.fillRoundRect(iconX + 5, iconY + 8, 12, 12, 2, tft.color565(255, 215, 0));
    for (int i = 0; i < 3; i++) {
      tft.drawFastHLine(iconX + 6, iconY + 10 + i * 3, 10, tft.color565(200, 160, 0));
    }
    
    // Wave symbol
    for (int i = 0; i < 3; i++) {
      int wx = iconX + 25 + i * 6;
      tft.drawLine(wx, iconY + 15, wx + 2, iconY + 17, ST77XX_CYAN);
      tft.drawLine(wx + 2, iconY + 17, wx + 4, iconY + 15, ST77XX_CYAN);
    }
    
    // Text content
    tft.setTextColor(ST77XX_WHITE);
    tft.setTextSize(2);
    tft.setCursor(iconX + iconW + 15, cardY + 30);
    tft.print("TAP CARD");
    
    tft.setTextColor(tft.color565(0, 255, 150));
    tft.setTextSize(2);
    tft.setCursor(iconX + iconW + 15, cardY + 55);
    tft.print("TO START");
    
    // Animated pulse indicator
    int pulseY = cardY + cardH + 20;
    for (int r = 5; r <= 25; r += 5) {
      tft.drawCircle(centerX, pulseY, r, tft.color565(0, 100 - r * 3, 150));
    }
    
    // Bottom instruction
    tft.setTextColor(tft.color565(120, 120, 150));
    tft.setTextSize(1);
    centerText("Hold card near the reader", cardY + cardH + 55);
    
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
  
  // Modern header
  tft.fillRect(0, 0, 320, 50, tft.color565(25, 25, 50));
  tft.fillRect(0, 48, 320, 2, tft.color565(0, 200, 100));
  tft.setTextColor(tft.color565(0, 255, 150));
  tft.setTextSize(3);
  centerText("SUCCESS", 18);
  
  // Success card
  int cardY = 80;
  int cardW = 280, cardH = 150;
  int cardX = (320 - cardW) / 2;
  
  // Animated card appearance
  for (int i = 0; i <= cardH; i += 15) {
    tft.fillRoundRect(cardX, cardY, cardW, i, 8, tft.color565(0, 40, 20));
    delay(8);
  }
  
  tft.fillRoundRect(cardX, cardY, cardW, cardH, 8, tft.color565(0, 40, 20));
  tft.drawRoundRect(cardX, cardY, cardW, cardH, 8, tft.color565(0, 200, 100));
  tft.drawRoundRect(cardX + 1, cardY + 1, cardW - 2, cardH - 2, 7, tft.color565(0, 100, 50));
  
  // Left accent
  tft.fillRoundRect(cardX + 2, cardY + 2, 4, cardH - 4, 2, tft.color565(0, 255, 150));
  
  // Checkmark circle icon
  int iconCenterX = 160;
  int iconCenterY = cardY + 60;
  
  // Animated checkmark
  tft.fillCircle(iconCenterX, iconCenterY, 35, tft.color565(0, 200, 100));
  delay(100);
  
  // Draw clean checkmark with proper thickness
  int checkX = iconCenterX - 12;
  int checkY = iconCenterY;
  
  // Left part of checkmark (going down)
  for (int i = 0; i <= 10; i++) {
    tft.fillCircle(checkX + i, checkY + i, 2, ST77XX_WHITE);
    delay(12);
  }
  
  // Right part of checkmark (going up)
  for (int i = 0; i <= 20; i++) {
    tft.fillCircle(checkX + 10 + i, checkY + 10 - i, 2, ST77XX_WHITE);
    delay(10);
  }
  
  delay(150);
  
  // Text
  tft.setTextColor(tft.color565(0, 255, 150));
  tft.setTextSize(2);
  centerText("ACCESS GRANTED", cardY + 120);
  
  // Bottom status bar
  tft.fillRoundRect(20, 260, 280, 35, 6, tft.color565(0, 30, 15));
  tft.drawRoundRect(20, 260, 280, 35, 6, tft.color565(0, 150, 75));
  tft.setTextColor(tft.color565(0, 200, 100));
  tft.setTextSize(1);
  centerText("Authentication successful", 275);
  
  delay(500);
  Serial.println("[Display] accessGrantedAnimation");
}

void accessDeniedAnimation() {
    clear();
    
    // Modern header
    tft.fillRect(0, 0, 320, 50, tft.color565(25, 25, 50));
    tft.fillRect(0, 48, 320, 2, ST77XX_RED);
    tft.setTextColor(tft.color565(255, 100, 100));
    tft.setTextSize(3);
    centerText("DENIED", 18);
    
    // Error card
    int cardY = 80;
    int cardW = 280, cardH = 150;
    int cardX = (320 - cardW) / 2;
    
    // Shake effect before showing card
    for (int shake = 0; shake < 3; shake++) {
      int offset = (shake % 2 == 0) ? 5 : -5;
      tft.fillRoundRect(cardX + offset, cardY, cardW, cardH, 8, tft.color565(40, 0, 0));
      delay(60);
      tft.fillRect(cardX + offset, cardY, cardW, cardH, ST77XX_BLACK);
    }
    
    // Draw card
    tft.fillRoundRect(cardX, cardY, cardW, cardH, 8, tft.color565(40, 0, 0));
    tft.drawRoundRect(cardX, cardY, cardW, cardH, 8, ST77XX_RED);
    tft.drawRoundRect(cardX + 1, cardY + 1, cardW - 2, cardH - 2, 7, tft.color565(100, 0, 0));
    
    // Left accent
    tft.fillRoundRect(cardX + 2, cardY + 2, 4, cardH - 4, 2, tft.color565(255, 50, 50));
    
    // X mark circle icon
    int iconCenterX = 160;
    int iconCenterY = cardY + 60;
    
    tft.fillCircle(iconCenterX, iconCenterY, 35, ST77XX_RED);
    delay(100);
    
    // Draw X mark
    for (int i = 0; i <= 24; i += 2) {
      for (int t = -2; t <= 2; t++) {
        tft.drawLine(iconCenterX - 12 + i, iconCenterY - 12 + i + t, 
                     iconCenterX - 10 + i, iconCenterY - 10 + i + t, ST77XX_WHITE);
        tft.drawLine(iconCenterX + 12 - i, iconCenterY - 12 + i + t, 
                     iconCenterX + 10 - i, iconCenterY - 10 + i + t, ST77XX_WHITE);
      }
      delay(12);
    }
    
    delay(150);
    
    // Text
    tft.setTextColor(tft.color565(255, 100, 100));
    tft.setTextSize(2);
    centerText("ACCESS DENIED", cardY + 120);
    
    // Bottom status bar
    tft.fillRoundRect(20, 260, 280, 35, 6, tft.color565(30, 0, 0));
    tft.drawRoundRect(20, 260, 280, 35, 6, tft.color565(150, 0, 0));
    tft.setTextColor(ST77XX_RED);
    tft.setTextSize(1);
    centerText("Invalid card detected", 275);
    
    delay(800);
    Serial.println("[Display] accessDeniedAnimation (centered)");
}

void queueEmptyAnimation() {
    clear();
    
    // Modern header
    tft.fillRect(0, 0, 320, 50, tft.color565(25, 25, 50));
    tft.fillRect(0, 48, 320, 2, ST77XX_YELLOW);
    tft.setTextColor(ST77XX_YELLOW);
    tft.setTextSize(3);
    centerText("QUEUE", 18);
    
    // Info card
    int cardY = 80;
    int cardW = 280, cardH = 150;
    int cardX = (320 - cardW) / 2;
    
    tft.fillRoundRect(cardX, cardY, cardW, cardH, 8, tft.color565(40, 35, 0));
    tft.drawRoundRect(cardX, cardY, cardW, cardH, 8, ST77XX_YELLOW);
    tft.drawRoundRect(cardX + 1, cardY + 1, cardW - 2, cardH - 2, 7, tft.color565(80, 70, 0));
    
    // Left accent
    tft.fillRoundRect(cardX + 2, cardY + 2, 4, cardH - 4, 2, ST77XX_YELLOW);
    
    // Empty box icon
    int iconCenterX = 160;
    int iconCenterY = cardY + 60;
    int boxSize = 50;
    
    // 3D box outline
    tft.drawRoundRect(iconCenterX - boxSize/2, iconCenterY - boxSize/2, 
                      boxSize, boxSize, 6, ST77XX_YELLOW);
    tft.drawRoundRect(iconCenterX - boxSize/2 + 1, iconCenterY - boxSize/2 + 1, 
                      boxSize - 2, boxSize - 2, 5, tft.color565(200, 180, 0));
    
    // Empty lines inside
    for (int i = 0; i < 3; i++) {
      tft.drawFastHLine(iconCenterX - 15, iconCenterY - 12 + i * 12, 
                        30, tft.color565(100, 90, 0));
    }
    
    // Large question mark
    tft.setTextColor(ST77XX_YELLOW);
    tft.setTextSize(3);
    tft.setCursor(iconCenterX - 9, iconCenterY - 12);
    tft.print("?");
    
    delay(200);
    
    // Text
    tft.setTextColor(ST77XX_YELLOW);
    tft.setTextSize(2);
    centerText("QUEUE EMPTY", cardY + 120);
    
    // Bottom status bar
    tft.fillRoundRect(20, 260, 280, 35, 6, tft.color565(30, 25, 0));
    tft.drawRoundRect(20, 260, 280, 35, 6, tft.color565(150, 130, 0));
    tft.setTextColor(tft.color565(200, 180, 0));
    tft.setTextSize(1);
    centerText("No drawing tasks available", 275);
    
    delay(1500);
    
    Serial.println("[Display] queueEmptyAnimation");
}




 void nexaBoardAnimation() {
    int centerX = 160;
    int centerY = 110;
    
    // Smooth scan line effect with fade
    for (int y = 0; y < tft.height(); y += 2) { 
      int brightness = map(y, 0, tft.height(), 50, 255);
      tft.drawFastHLine(0, y, tft.width(), tft.color565(0, brightness / 2, brightness)); 
      if (y % 4 == 0) delay(8); 
    }
    
    delay(250); 
    clear();
    
    // Modern box with depth
    int boxW = 200, boxH = 90;
    int boxX = centerX - boxW/2, boxY = centerY - boxH/2;
    
    // Shadow effect
    tft.fillRoundRect(boxX + 4, boxY + 4, boxW, boxH, 8, tft.color565(10, 10, 20));
    
    // Animated box border growth
    for (int i = 0; i <= boxW; i += 8) { 
      tft.drawRoundRect(boxX, boxY, i, boxH, 8, ST77XX_CYAN); 
      delay(25); 
    }
    tft.fillRoundRect(boxX, boxY, boxW, boxH, 8, tft.color565(10, 20, 40));
    tft.drawRoundRect(boxX, boxY, boxW, boxH, 8, ST77XX_CYAN);
    tft.drawRoundRect(boxX + 1, boxY + 1, boxW - 2, boxH - 2, 7, tft.color565(0, 150, 200));
    
    delay(100);
    
    // Animated text with glow
    tft.setTextSize(3); 
    tft.setTextColor(ST77XX_WHITE);
    
    int cursorX = centerX - 60, cursorY = centerY - 30;
    tft.setCursor(cursorX, cursorY); 
    const char* text1 = "NEXA";
    for (int i = 0; i < 4; i++) {
      tft.print(text1[i]); 
      delay(100); 
    }
    
    delay(150);
    
    cursorX = centerX - 70; 
    cursorY = centerY + 8; 
    tft.setCursor(cursorX, cursorY);
    const char* text2 = "BOARD";
    for (int i = 0; i < 5; i++) {
      tft.print(text2[i]); 
      delay(100); 
    }
    
    delay(200);
    
    // Modern corner accents with animation
    int cSize = 18;
    uint16_t accentColor = tft.color565(0, 255, 150);
    
    for (int i = 0; i <= cSize; i += 3) {
      // Top-left
      tft.fillRect(boxX - 3, boxY - 3, i, 3, accentColor);
      tft.fillRect(boxX - 3, boxY - 3, 3, i, accentColor);
      // Top-right
      tft.fillRect(boxX + boxW - i + 3, boxY - 3, i, 3, accentColor);
      tft.fillRect(boxX + boxW, boxY - 3, 3, i, accentColor);
      // Bottom-left
      tft.fillRect(boxX - 3, boxY + boxH, i, 3, accentColor);
      tft.fillRect(boxX - 3, boxY + boxH - i, 3, i, accentColor);
      // Bottom-right
      tft.fillRect(boxX + boxW - i + 3, boxY + boxH, i, 3, accentColor);
      tft.fillRect(boxX + boxW, boxY + boxH - i, 3, i, accentColor);
      delay(30);
    }
    
    delay(150);
    
    // Modern progress bar with glow
    int barY = boxY + boxH + 30, barW = 180, barH = 10, barX = centerX - barW/2;
    tft.fillRoundRect(barX, barY, barW, barH, 5, tft.color565(20, 20, 40));
    tft.drawRoundRect(barX, barY, barW, barH, 5, ST77XX_CYAN);
    
    for (int i = 0; i < barW - 6; i += 4) { 
      int brightness = map(i, 0, barW, 100, 255);
      tft.fillRoundRect(barX + 3, barY + 3, i, barH - 6, 3, tft.color565(0, brightness, brightness / 2)); 
      delay(18); 
    }
    
    // Completion flash
    for (int flash = 0; flash < 2; flash++) {
      tft.fillRoundRect(barX + 3, barY + 3, barW - 6, barH - 6, 3, ST77XX_WHITE);
      delay(80);
      tft.fillRoundRect(barX + 3, barY + 3, barW - 6, barH - 6, 3, ST77XX_GREEN);
      delay(80);
    }
    
    delay(350); 
    clear();
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
    servoM3.attach(SERVO_M3_PIN);
    servoM3.write(0);
    delay(200);
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
    else if (cmd.startsWith("M3")) {

    int sIndex = cmd.indexOf('S');
    if (sIndex == -1) sIndex = cmd.indexOf('s');

    if (sIndex != -1) {
        int angle = cmd.substring(sIndex + 1).toInt();
        angle = constrain(angle, 0, 180);

        servoM3.write(angle);

        Serial.print("[Servo M3] Moved to: ");
        Serial.println(angle);
    } else {
        Serial.println("[Servo M3] Invalid format (missing S)");
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
    if (rem == 0) {
      // Lock time expired - unlock and reset
      security.reset();
      loginStage = WAIT_RFID;
      inputPassword = "";
      display.clear();
      display.drawTitle("Nexa Board");
      display.requestRFIDAnimation();
      Serial.println("[System] Lock expired, unlocked and reset to WAIT_RFID");
      return;
    }
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
          display.drawMessage("Enter password:");
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
  
  // Premium mode card with pulsing border
  for (int pulse = 0; pulse < 2; pulse++) {
    display.tft.fillRoundRect(50, 50, 220, 60, 8, display.tft.color565(20, 50, 30));
    display.tft.drawRoundRect(50, 50, 220, 60, 8, display.tft.color565(0, 255, 150));
    display.tft.drawRoundRect(51, 51, 218, 58, 7, display.tft.color565(0, 200, 100));
    delay(80);
    display.tft.drawRoundRect(50, 50, 220, 60, 8, display.tft.color565(0, 180, 100));
    delay(80);
  }
  display.tft.setTextColor(display.tft.color565(100, 255, 200));
  display.tft.setTextSize(2);
  display.centerText("DRAWING...", 65);
  display.tft.setTextColor(display.tft.color565(80, 200, 150));
  display.tft.setTextSize(1);
  display.centerText("Creating masterpiece", 88);
  display.tft.setTextColor(display.tft.color565(120, 160, 140));
  display.centerText("Server or # to exit", 280);

  // Artistic brush with creative patterns
  int pattern = 0;
  float wave = 0;
  
  while (!exitRequested) {
    if (system) system->checkServerCommands();
  
    char key = keypad.getKey();
    if (key == '#') {
      exitRequested = true;
      break;
    }

    display.rgbEffect("writing", 15);

    // Creative brush stroke patterns
    int baseY = 150;
    for (int x = 30; x < 290 && !exitRequested; x += 4) {
      // Check server commands more frequently (every 5 iterations)
      if (x % 20 == 0) {
        if (system) system->checkServerCommands();
        char keyInner = keypad.getKey();
        if (keyInner == '#') {
          exitRequested = true;
          break;
        }
      }

      // Smooth wave pattern
      int y = baseY + sin(wave + x * 0.08) * 20;
      int y2 = baseY + cos(wave + x * 0.06) * 12;
      
      // Gradient brush stroke
      int colorShift = (x * 3) % 255;
      uint16_t color1 = display.tft.color565(0, 255 - colorShift / 2, colorShift);
      uint16_t color2 = display.tft.color565(colorShift / 3, 200, 255 - colorShift);
      
      // Multi-layer brush for depth
      display.tft.drawLine(x - 2, y + 2, x + 2, y + 2, display.tft.color565(20, 40, 30));
      display.tft.drawLine(x, y - 1, x, y + 1, color1);
      display.tft.drawPixel(x, y, color2);
      
      // Secondary decorative stroke
      if (x % 6 == 0) {
        display.tft.fillCircle(x, y2, 2, display.tft.color565(100, 255, 200));
      }

      delay(8); // Reduced delay for faster response
    }
    
    wave += 0.5;
    pattern++;
    
    // Clear and redraw for continuous animation
    if (pattern % 3 == 0) {
      display.tft.fillRect(20, 120, 280, 80, ST77XX_BLACK);
    }
    
    // Additional server command check between animation cycles
    if (system) system->checkServerCommands();
  }

  exitRequested = false;
  
  // Quick exit transition
  display.tft.setTextColor(display.tft.color565(100, 255, 200));
  display.tft.setTextSize(2);
  display.tft.fillRect(0, 110, 320, 40, ST77XX_BLACK);
  display.centerText("Exiting...", 120);
  
  Serial.println("MODE_READY");
  delay(300);
}

void ModeHandler::erasingMode(bool &exitRequested) {
  display.clear();
  display.drawTitle("Erasing Mode");
  
  // Premium mode card
  display.tft.fillRoundRect(50, 60, 220, 70, 10, display.tft.color565(50, 20, 20));
  display.tft.drawRoundRect(50, 60, 220, 70, 10, display.tft.color565(255, 100, 100));
  display.tft.drawRoundRect(51, 61, 218, 68, 9, display.tft.color565(200, 60, 60));
  
  // Title with icon
  display.tft.setTextColor(display.tft.color565(255, 150, 150));
  display.tft.setTextSize(2);
  display.centerText("ERASING", 75);
  
  // Eraser icon
  display.tft.fillRoundRect(145, 95, 30, 20, 4, display.tft.color565(255, 200, 200));
  display.tft.drawRoundRect(145, 95, 30, 20, 4, display.tft.color565(255, 100, 100));
  display.tft.fillRect(148, 98, 8, 14, display.tft.color565(200, 150, 150));
  
  display.tft.setTextColor(display.tft.color565(200, 120, 120));
  display.tft.setTextSize(1);
  display.centerText("Clearing whiteboard", 220);
  display.tft.setTextColor(display.tft.color565(160, 100, 100));
  display.centerText("Server or # to exit", 280);

  // Whiteboard representation
  int boardX = 40;
  int boardY = 140;
  int boardW = 240;
  int boardH = 60;
  
  int eraseProgress = 0;
  int animationCycle = 0;

  while (!exitRequested) {
    if (system) system->checkServerCommands();
    
    char key = keypad.getKey();
    if (key == '#') {
      exitRequested = true;
      break;
    }

    display.rgbEffect("erasing", 15);

    // Draw whiteboard frame
    display.tft.drawRoundRect(boardX - 2, boardY - 2, boardW + 4, boardH + 4, 8, display.tft.color565(100, 100, 100));
    display.tft.drawRoundRect(boardX - 3, boardY - 3, boardW + 6, boardH + 6, 9, display.tft.color565(80, 80, 80));
    
    // Fill board with "dirty" marks (getting cleaner)
    int marksRemaining = 30 - (eraseProgress * 30 / boardW);
    for (int i = 0; i < marksRemaining; i++) {
      int mx = boardX + random(eraseProgress + 5, boardW - 5);
      int my = boardY + random(5, boardH - 5);
      display.tft.fillCircle(mx, my, random(1, 3), display.tft.color565(random(150, 200), random(100, 150), random(100, 150)));
    }
    
    // Animated eraser moving across
    int eraserX = boardX + eraseProgress;
    int eraserY = boardY + boardH / 2 + sin(animationCycle * 0.3) * 8;
    
    // Eraser shadow
    display.tft.fillRoundRect(eraserX + 2, eraserY + 2, 35, 18, 5, display.tft.color565(40, 20, 20));
    
    // Eraser body (pink/white)
    display.tft.fillRoundRect(eraserX, eraserY, 35, 18, 5, display.tft.color565(255, 220, 220));
    display.tft.drawRoundRect(eraserX, eraserY, 35, 18, 5, display.tft.color565(255, 150, 150));
    
    // Eraser felt part
    display.tft.fillRect(eraserX + 28, eraserY + 3, 6, 12, display.tft.color565(200, 180, 180));
    display.tft.drawRect(eraserX + 28, eraserY + 3, 6, 12, display.tft.color565(150, 100, 100));
    
    // Eraser label detail
    display.tft.drawFastHLine(eraserX + 5, eraserY + 6, 18, display.tft.color565(255, 180, 180));
    display.tft.drawFastHLine(eraserX + 5, eraserY + 10, 18, display.tft.color565(255, 180, 180));
    
    // Cleaning particles
    for (int p = 0; p < 5; p++) {
      int px = eraserX + 28 + random(-5, 8);
      int py = eraserY + random(0, 18);
      display.tft.fillCircle(px, py, 1, display.tft.color565(220, 220, 220));
    }
    
    // Clean area behind eraser
    display.tft.fillRect(boardX, boardY, eraseProgress, boardH, display.tft.color565(250, 250, 250));
    
    // Progress indicator
    int progressBarW = (eraseProgress * 200) / boardW;
    display.tft.fillRect(60, 235, 200, 8, display.tft.color565(60, 30, 30));
    display.tft.fillRect(60, 235, progressBarW, 8, display.tft.color565(255, 100, 100));
    display.tft.drawRect(60, 235, 200, 8, display.tft.color565(150, 70, 70));
    
    // Move eraser
    eraseProgress += 3;
    if (eraseProgress >= boardW) {
      eraseProgress = 0;
      // Flash clean board
      display.tft.fillRect(boardX, boardY, boardW, boardH, display.tft.color565(255, 255, 255));
      delay(150);
    }
    
    animationCycle++;
    delay(25);
  }

  exitRequested = false;
  
  // Exit animation
  display.clear();
  display.tft.setTextColor(display.tft.color565(100, 255, 150));
  display.tft.setTextSize(3);
  display.centerText("CLEAN!", 110);
  
  // Sparkle effect
  for (int i = 0; i < 20; i++) {
    int sx = random(60, 260);
    int sy = random(80, 160);
    display.tft.fillCircle(sx, sy, 2, display.tft.color565(255, 255, 200));
    delay(30);
  }
  
  delay(300);
  
  Serial.println("MODE_READY");
  delay(300);
}

void ModeHandler::pen2Mode(bool &exitRequested) {
  display.clear();
  
  // Pen switching animation
  display.tft.fillRoundRect(40, 80, 240, 80, 10, display.tft.color565(40, 20, 50));
  display.tft.drawRoundRect(40, 80, 240, 80, 10, display.tft.color565(200, 100, 255));
  display.tft.drawRoundRect(41, 81, 238, 78, 9, display.tft.color565(150, 50, 200));
  
  // Title
  display.tft.setTextColor(display.tft.color565(220, 150, 255));
  display.tft.setTextSize(2);
  display.centerText("SWITCHING TO", 95);
  
  // Pen number with emphasis
  display.tft.setTextColor(display.tft.color565(255, 100, 255));
  display.tft.setTextSize(3);
  display.centerText("PEN 2", 125);
  
  Serial.println("MODE_READY");
  delay(300);
  
  // Animated moving dots
  int dotIndex = 0;
  while (!exitRequested) {
    if (system) system->checkServerCommands();
    char key = keypad.getKey();
    if (key == '#') break;
    
    // Clear previous dots
    display.tft.fillRect(100, 175, 120, 10, ST77XX_BLACK);
    
    // Draw moving dots
    for (int i = 0; i < 3; i++) {
      int brightness = (i == dotIndex % 3) ? 255 : 100;
      display.tft.fillCircle(120 + i * 30, 180, 4, display.tft.color565(brightness * 200 / 255, brightness * 100 / 255, brightness));
    }
    
    dotIndex++;
    delay(200);
  }
}


void ModeHandler::erasingPenMode(bool &exitRequested) {
  display.clear();
  
  // Pen switching animation
  display.tft.fillRoundRect(40, 80, 240, 80, 10, display.tft.color565(50, 30, 20));
  display.tft.drawRoundRect(40, 80, 240, 80, 10, display.tft.color565(255, 160, 100));
  display.tft.drawRoundRect(41, 81, 238, 78, 9, display.tft.color565(200, 120, 60));
  
  // Title
  display.tft.setTextColor(display.tft.color565(255, 200, 150));
  display.tft.setTextSize(2);
  display.centerText("SWITCHING TO", 95);
  
  // Pen type with emphasis
  display.tft.setTextColor(display.tft.color565(255, 180, 120));
  display.tft.setTextSize(3);
  display.centerText("ERASER", 125);
  
  Serial.println("MODE_READY");
  delay(300);
  
  // Animated moving dots
  int dotIndex = 0;
  while (!exitRequested) {
    if (system) system->checkServerCommands();
    char key = keypad.getKey();
    if (key == '#') break;
    
    // Clear previous dots
    display.tft.fillRect(100, 175, 120, 10, ST77XX_BLACK);
    
    // Draw moving dots
    for (int i = 0; i < 3; i++) {
      int brightness = (i == dotIndex % 3) ? 255 : 100;
      display.tft.fillCircle(120 + i * 30, 180, 4, display.tft.color565(brightness, brightness * 160 / 255, brightness * 100 / 255));
    }
    
    dotIndex++;
    delay(200);
  }
}

void ModeHandler::screenshotMode(bool &exitRequested) {
  display.clear();
  display.drawTitle("Screenshot");
  
  // Premium mode card - moved lower
  display.tft.fillRoundRect(50, 90, 220, 60, 8, display.tft.color565(40, 40, 20));
  display.tft.drawRoundRect(50, 90, 220, 60, 8, display.tft.color565(255, 255, 100));
  display.tft.drawRoundRect(51, 91, 218, 58, 7, display.tft.color565(200, 200, 60));
  display.tft.setTextColor(display.tft.color565(255, 255, 150));
  display.tft.setTextSize(2);
  display.centerText("CAMERA READY", 105);
  display.tft.setTextColor(display.tft.color565(200, 200, 120));
  display.tft.setTextSize(1);
  display.centerText("Capturing screen", 128);
  display.tft.setTextColor(display.tft.color565(160, 160, 100));
  display.centerText("Server controls exit", 280);
  
  int centerX = 160;
  int centerY = 180;
  int captureCount = 0;

  while (!exitRequested) {
    if (system) system->checkServerCommands();
    
    // Professional camera body with lens
    display.tft.fillRoundRect(centerX - 50, centerY - 35, 100, 70, 8, display.tft.color565(40, 40, 40));
    display.tft.drawRoundRect(centerX - 50, centerY - 35, 100, 70, 8, display.tft.color565(180, 180, 180));
    
    // Camera lens with focus rings
    for (int r = 35; r > 5; r -= 6) {
      int brightness = 100 + (35 - r) * 3;
      display.tft.drawCircle(centerX, centerY, r, display.tft.color565(brightness, brightness, brightness + 50));
      delay(20);
    }
    display.tft.fillCircle(centerX, centerY, 28, display.tft.color565(20, 20, 60));
    display.tft.fillCircle(centerX, centerY, 24, display.tft.color565(40, 40, 100));
    display.tft.drawCircle(centerX, centerY, 28, display.tft.color565(150, 150, 200));
    
    // Lens reflection
    display.tft.fillCircle(centerX - 8, centerY - 8, 6, display.tft.color565(180, 180, 255));
    
    // Shutter button
    display.tft.fillCircle(centerX + 35, centerY - 25, 6, display.tft.color565(255, 80, 80));
    display.tft.drawCircle(centerX + 35, centerY - 25, 6, display.tft.color565(200, 60, 60));
    
    // Viewfinder
    display.tft.fillRect(centerX - 35, centerY - 28, 15, 8, display.tft.color565(80, 80, 120));
    
    // Focus animation - pulsing corners
    for (int pulse = 0; pulse < 3; pulse++) {
      int offset = pulse * 8;
      uint16_t focusColor = display.tft.color565(0, 255 - pulse * 60, 255);
      
      // Corner brackets
      display.tft.drawFastHLine(centerX - 60 - offset, centerY - 50 - offset, 15, focusColor);
      display.tft.drawFastVLine(centerX - 60 - offset, centerY - 50 - offset, 15, focusColor);
      
      display.tft.drawFastHLine(centerX + 45 + offset, centerY - 50 - offset, 15, focusColor);
      display.tft.drawFastVLine(centerX + 60 + offset, centerY - 50 - offset, 15, focusColor);
      
      display.tft.drawFastHLine(centerX - 60 - offset, centerY + 50 + offset, 15, focusColor);
      display.tft.drawFastVLine(centerX - 60 - offset, centerY + 35 + offset, 15, focusColor);
      
      display.tft.drawFastHLine(centerX + 45 + offset, centerY + 50 + offset, 15, focusColor);
      display.tft.drawFastVLine(centerX + 60 + offset, centerY + 35 + offset, 15, focusColor);
      
      delay(150);
    }
    
    display.tft.setTextColor(display.tft.color565(100, 255, 200));
    display.tft.setTextSize(1);
    display.centerText("FOCUSING...", 220);
    delay(300);
    
    // Capture flash effect with camera click
    display.tft.setTextColor(ST77XX_YELLOW);
    display.centerText("CAPTURING!", 220);
    
    for (int flash = 0; flash < 2 && !exitRequested; flash++) {
      if (system) system->checkServerCommands();
      display.setRGB(255, 255, 200);
      display.tft.fillScreen(ST77XX_WHITE);
      delay(80);
      display.setRGB(0, 0, 0);
      display.clearContent();
      display.drawTitle("Screenshot");
      delay(120);
    }
    
    // Success indicator
    display.tft.fillCircle(centerX, centerY, 30, display.tft.color565(0, 80, 40));
    display.tft.drawCircle(centerX, centerY, 30, ST77XX_GREEN);
    display.tft.setTextColor(ST77XX_GREEN);
    display.tft.setTextSize(3);
    display.centerText("✓", centerY - 12);
    
    captureCount++;
    char countText[20];
    sprintf(countText, "Captured: %d", captureCount);
    display.tft.setTextColor(display.tft.color565(150, 255, 150));
    display.tft.setTextSize(1);
    display.centerText(countText, 220);
    
    delay(1200);
    
    display.clearContent();
    display.drawTitle("Screenshot");
    display.tft.fillRoundRect(50, 90, 220, 60, 8, display.tft.color565(40, 40, 20));
    display.tft.drawRoundRect(50, 90, 220, 60, 8, display.tft.color565(255, 255, 100));
    display.tft.setTextColor(display.tft.color565(255, 255, 150));
    display.tft.setTextSize(2);
    display.centerText("READY AGAIN", 105);
    display.tft.setTextColor(display.tft.color565(200, 200, 120));
    display.tft.setTextSize(1);
    sprintf(countText, "Total: %d captures", captureCount);
    display.centerText(countText, 128);
    
    delay(500);
  }

  exitRequested = false;
  display.clear();
  
  // Glitch exit animation
  for (int glitch = 0; glitch < 6; glitch++) {
    display.tft.fillScreen(ST77XX_BLACK);
    
    // Random glitch text positions and colors
    int offsetX = random(-10, 10);
    int offsetY = random(-5, 5);
    
    display.tft.setTextSize(3);
    display.tft.setTextColor(display.tft.color565(255, random(100, 255), random(100, 255)));
    display.tft.setCursor(80 + offsetX, 100 + offsetY);
    display.tft.print("EXITING");
    
    // Random glitch lines
    for (int i = 0; i < 5; i++) {
      int y = random(50, 200);
      display.tft.drawFastHLine(0, y, 320, display.tft.color565(random(100, 255), random(100, 255), random(100, 255)));
    }
    
    delay(80);
  }
  
  display.clear();
  display.tft.setTextSize(4);
  display.centerText("✓", 125);
  Serial.println("MODE_READY");
  delay(800);
}

void ModeHandler::pen1Mode(bool &exitRequested) {
  display.clear();
  
  // Pen switching animation
  display.tft.fillRoundRect(40, 80, 240, 80, 10, display.tft.color565(20, 30, 50));
  display.tft.drawRoundRect(40, 80, 240, 80, 10, display.tft.color565(100, 200, 255));
  display.tft.drawRoundRect(41, 81, 238, 78, 9, display.tft.color565(50, 150, 200));
  
  // Title
  display.tft.setTextColor(display.tft.color565(150, 220, 255));
  display.tft.setTextSize(2);
  display.centerText("SWITCHING TO", 95);
  
  // Pen number with emphasis
  display.tft.setTextColor(ST77XX_CYAN);
  display.tft.setTextSize(3);
  display.centerText("PEN 1", 125);
  
  Serial.println("MODE_READY");
  delay(300);
  
  // Animated moving dots
  int dotIndex = 0;
  while (!exitRequested) {
    if (system) system->checkServerCommands();
    char key = keypad.getKey();
    if (key == '#') break;
    
    // Clear previous dots
    display.tft.fillRect(100, 175, 120, 10, ST77XX_BLACK);
    
    // Draw moving dots
    for (int i = 0; i < 3; i++) {
      int brightness = (i == dotIndex % 3) ? 255 : 100;
      display.tft.fillCircle(120 + i * 30, 180, 4, display.tft.color565(brightness * 100 / 255, brightness * 200 / 255, brightness));
    }
    
    dotIndex++;
    delay(200);
  }
}

void ModeHandler::exitMode(bool &logoutRequested) {
  display.clear();
  display.drawTitle("Logging Out");
  
  // Exit animation
  for (int i = 0; i < 3; i++) {
    display.tft.fillCircle(160, 120, 40 - i * 10, display.tft.color565(255 - i * 60, 100, 100));
    delay(100);
  }
  
  display.tft.setTextColor(ST77XX_WHITE);
  display.tft.setTextSize(2);
  display.centerText("Goodbye!", 110);
  
  logoutRequested = true;
  delay(500);
}

void logout(bool &logoutRequested) {
  logoutRequested = true;
  delay(600);
}

/* ----------------- App Instance ----------------- */
NexaBoardSystem App;

/* ----------------- Arduino Hooks ---------------- */
void setup() { App.begin(); }
void loop()  { App.tick(); }
