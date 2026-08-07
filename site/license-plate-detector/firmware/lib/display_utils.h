/*
 * Circuit Forge Technologies
 * Display utility library for SSD1306 OLED
 * v1.1 — Added confidence level display + highlighting
 */

#ifndef DISPLAY_UTILS_H
#define DISPLAY_UTILS_H

#include <Adafruit_SSD1306.h>
#include <Adafruit_GFX.h>

class LPRDisplay {
private:
  Adafruit_SSD1306 *disp;
  int w, h;

public:
  LPRDisplay(Adafruit_SSD1306 *display, int width = 128, int height = 64)
    : disp(display), w(width), h(height) {}

  void showSplash() {
    disp->clearDisplay();
    disp->setTextSize(1);
    disp->setTextColor(SSD1306_WHITE);
    disp->setCursor(8, 8);
    disp->println(F("Circuit Forge"));
    disp->setCursor(8, 20);
    disp->println(F("License Plate"));
    disp->setCursor(8, 32);
    disp->println(F("  Detector"));
    disp->setCursor(8, 50);
    disp->setTextSize(0);
    disp->println(F("  v1.1 Booting..."));
    disp->display();
  }

  void showIP(const char *ip) {
    disp->clearDisplay();
    disp->setTextSize(1);
    disp->setCursor(0, 0);
    disp->println(F("Wi-Fi Connected"));
    disp->println();
    disp->println(F("IP Address:"));
    disp->setCursor(0, 30);
    disp->setTextSize(2);
    disp->println(ip);
    disp->display();
  }

  void showCapturing(int frame) {
    disp->clearDisplay();
    disp->setTextSize(1);
    disp->setCursor(20, 10);
    disp->println(F("CAPTURING"));
    const char spinner[] = {'|', '/', '-', '\\'};
    disp->setCursor(55, 30);
    disp->setTextSize(2);
    disp->print(spinner[frame % 4]);
    disp->display();
  }

  // Plate result with confidence bar — high confidence
  void showPlateResult(const char *plateText, float confidence) {
    disp->clearDisplay();

    // Triple border for highlight
    disp->drawRect(0, 0, w, h, SSD1306_WHITE);
    disp->drawRect(1, 1, w - 2, h - 2, SSD1306_WHITE);
    disp->drawRect(2, 2, w - 4, h - 4, SSD1306_WHITE);

    disp->setTextSize(1);
    disp->setCursor(10, 5);
    disp->println(F("PLATE DETECTED!"));

    // Large plate text
    disp->setTextSize(2);
    int textW = strlen(plateText) * 12;
    int xOff = (w - textW) / 2;
    if (xOff < 0) xOff = 0;
    disp->setCursor(xOff, 18);
    disp->println(plateText);

    // Confidence area
    disp->setTextSize(1);
    disp->setCursor(4, 42);
    disp->print(F("ACCURACY:"));

    // Bar graph
    int barX = 68;
    int barY = 44;
    int barW = 56;
    int barH = 8;
    int fillW = (confidence / 100.0) * barW;

    disp->drawRect(barX, barY, barW, barH, SSD1306_WHITE);
    if (confidence >= 50.0) {
      disp->fillRect(barX, barY, fillW, barH, SSD1306_WHITE);
    } else {
      disp->fillRect(barX, barY, fillW, barH, SSD1306_WHITE);
    }

    disp->setCursor(barX, barY + barH + 2);
    char buf[8];
    snprintf(buf, sizeof(buf), "%.1f%%", confidence);
    disp->println(buf);

    disp->display();
  }

  // Low confidence warning
  void showLowConfidence(const char *plateText, float confidence) {
    disp->clearDisplay();
    disp->drawRect(0, 0, w, h, SSD1306_WHITE);

    disp->setTextSize(1);
    disp->setCursor(8, 4);
    disp->println(F("!! WARNING !!"));
    disp->setCursor(8, 14);
    disp->println(F("Low Confidence"));

    disp->setCursor(8, 28);
    disp->print(F("Read: "));
    disp->setTextSize(2);
    char buf[8];
    snprintf(buf, sizeof(buf), "%.4s", plateText);
    disp->println(buf);

    disp->setTextSize(1);
    disp->setCursor(8, 48);
    disp->print(F("Accuracy: "));
    if (confidence < 30.0) {
      disp->setTextColor(SSD1306_WHITE, SSD1306_WHITE);
    }
    disp->print(confidence);
    disp->setTextColor(SSD1306_WHITE);
    disp->println(F("%"));
    disp->display();
  }

  void showError(const char *msg) {
    disp->clearDisplay();
    disp->setTextSize(1);
    disp->setCursor(0, 10);
    disp->println(F("ERROR"));
    disp->println();
    disp->println(msg);
    disp->display();
  }

  void showIdle(const char *ip) {
    disp->clearDisplay();
    disp->setTextSize(1);
    disp->setCursor(0, 0);
    disp->println(F("=== LPR SYSTEM ==="));
    disp->println();
    disp->println(F("Ready"));
    disp->println();
    disp->setCursor(0, 40);
    disp->print(F("IP: "));
    disp->println(ip);
    disp->setCursor(0, 52);
    disp->println(F("Btn or auto mode"));
    disp->display();
  }
};

#endif
