/*
 * Circuit Forge Technologies — License Plate Detector
 * ESP32-CAM Firmware v1.1
 * 
 * Features:
 *   - Captures image via OV2640 camera
 *   - Sends to server for plate detection + OCR
 *   - Only accepts results with confidence >= 50%
 *   - Highlights plate with accuracy on OLED
 *   - Low confidence results shown as warning, not stored
 *   - Auto mode + button trigger
 *   - LED flash for illumination
 */

#include <Arduino.h>
#include <WiFi.h>
#include <esp_camera.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

/* ─── CONFIGURATION ─── */
// Wi-Fi
const char *WIFI_SSID = "YOUR_SSID";
const char *WIFI_PASS = "YOUR_PASSWORD";

// Server
const char *SERVER_HOST = "192.168.1.100";
const uint16_t SERVER_PORT = 8000;
const char *DETECT_ENDPOINT = "/api/detect";

// Confidence threshold (must match server)
const float CONFIDENCE_THRESHOLD = 50.0;

// Pins
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// GPIOs
#define LED_FLASH          4
#define BUTTON_TRIGGER    13
#define OLED_SDA          14
#define OLED_SCL          15

/* ─── DISPLAY ─── */
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

/* ─── STATES ─── */
enum DeviceState {
  STATE_INIT,
  STATE_WIFI_CONNECTING,
  STATE_IDLE,
  STATE_CAPTURING,
  STATE_PROCESSING,
  STATE_RESULT_HIGH,      // Confidence >= 50%
  STATE_RESULT_LOW,       // Confidence < 50%
  STATE_ERROR
};
DeviceState currentState = STATE_INIT;

/* ─── RESULT DATA ─── */
struct DetectionResult {
  bool success;
  bool aboveThreshold;
  char plateText[16];
  float confidence;
  int charCount;
};
DetectionResult lastResult;
bool hasResult = false;

/* ─── PROTOTYPES ─── */
bool initCamera();
void connectWiFi();
bool captureImage(uint8_t **outBuf, size_t *outLen);
bool sendToServer(uint8_t *jpgBuf, size_t jpgLen, DetectionResult *result);
void displayState(const char *line1, const char *line2 = nullptr, const char *line3 = nullptr);
void displayResultHigh(const DetectionResult &res);
void displayResultLow(const DetectionResult &res);
void displayPlateHighlight(const DetectionResult &res);
void triggerCapture();

/* ─── SETUP ─── */
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n\n=== Circuit Forge License Plate Detector v1.1 ===");

  pinMode(LED_FLASH, OUTPUT);
  digitalWrite(LED_FLASH, LOW);
  pinMode(BUTTON_TRIGGER, INPUT_PULLUP);

  Wire.begin(OLED_SDA, OLED_SCL);
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED init failed");
  }
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  displayState("Circuit Forge", "License Plate", "Detector v1.1");
  delay(1500);

  displayState("Initializing", "Camera...");
  if (!initCamera()) {
    displayState("ERROR", "Camera failed");
    Serial.println("Camera init failed!");
    return;
  }
  Serial.println("Camera OK");
  delay(500);

  displayState("Connecting", "Wi-Fi...");
  connectWiFi();
  displayState("Wi-Fi OK", WiFi.localIP().toString().c_str());
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
  delay(1000);

  displayState("SYSTEM READY", "Press button", "or auto mode");
  currentState = STATE_IDLE;
}

/* ─── MAIN LOOP ─── */
void loop() {
  static unsigned long lastAutoCapture = 0;
  const unsigned long AUTO_INTERVAL = 10000;

  switch (currentState) {
    case STATE_IDLE:
      if (digitalRead(BUTTON_TRIGGER) == LOW) {
        delay(50);
        if (digitalRead(BUTTON_TRIGGER) == LOW) {
          triggerCapture();
        }
      }
      if (millis() - lastAutoCapture > AUTO_INTERVAL) {
        lastAutoCapture = millis();
        triggerCapture();
      }
      break;

    case STATE_CAPTURING:
      {
        uint8_t *jpgBuf = nullptr;
        size_t jpgLen = 0;

        displayState("CAPTURING", "Hold still...");
        digitalWrite(LED_FLASH, HIGH);
        delay(100);

        if (captureImage(&jpgBuf, &jpgLen)) {
          Serial.printf("Captured %d bytes\n", jpgLen);
          digitalWrite(LED_FLASH, LOW);

          displayState("PROCESSING", "Sending to server...");
          DetectionResult result;
          if (sendToServer(jpgBuf, jpgLen, &result)) {
            lastResult = result;
            hasResult = true;

            if (result.aboveThreshold && result.confidence >= CONFIDENCE_THRESHOLD) {
              currentState = STATE_RESULT_HIGH;
              Serial.printf("HIGH CONFIDENCE: %s (%.1f%%)\n", result.plateText, result.confidence);
            } else {
              currentState = STATE_RESULT_LOW;
              Serial.printf("LOW CONFIDENCE: %s (%.1f%%) — BELOW 50%% THRESHOLD\n", result.plateText, result.confidence);
            }
          } else {
            currentState = STATE_ERROR;
          }
        } else {
          digitalWrite(LED_FLASH, LOW);
          currentState = STATE_ERROR;
        }

        if (jpgBuf) free(jpgBuf);
      }
      break;

    case STATE_PROCESSING:
      break;

    case STATE_RESULT_HIGH:
      // Show highlighted plate with accuracy — 10 seconds
      displayResultHigh(lastResult);
      delay(10000);
      displayState("SYSTEM READY", "Press button", "or auto mode");
      currentState = STATE_IDLE;
      break;

    case STATE_RESULT_LOW:
      // Show low confidence warning with accuracy — 4 seconds
      displayResultLow(lastResult);
      delay(4000);
      displayState("SYSTEM READY", "Press button", "or auto mode");
      currentState = STATE_IDLE;
      break;

    case STATE_ERROR:
      displayState("ERROR", "Check server", "Retrying...");
      delay(3000);
      displayState("SYSTEM READY", "Press button", "or auto mode");
      currentState = STATE_IDLE;
      break;

    default:
      break;
  }
}

/* ─── CAMERA INIT ─── */
bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = FRAMESIZE_SVGA;
  config.jpeg_quality = 12;
  config.fb_count = 1;

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed: 0x%x\n", err);
    return false;
  }

  sensor_t *s = esp_camera_sensor_get();
  s->set_brightness(s, 0);
  s->set_contrast(s, 0);
  s->set_saturation(s, 0);
  s->set_special_effect(s, 0);
  s->set_whitebal(s, 1);
  s->set_awb_gain(s, 1);
  s->set_wb_mode(s, 0);
  s->set_exposure_ctrl(s, 1);
  s->set_aec2(s, 0);
  s->set_ae_level(s, 0);
  s->set_aec_value(s, 300);
  s->set_gain_ctrl(s, 1);
  s->set_agc_gain(s, 0);
  s->set_gainceiling(s, (gainceiling_t)0);
  s->set_bpc(s, 0);
  s->set_wpc(s, 1);
  s->set_raw_gma(s, 1);
  s->set_lenc(s, 1);
  s->set_hmirror(s, 0);
  s->set_vflip(s, 0);
  s->set_dcw(s, 1);
  s->set_colorbar(s, 0);

  return true;
}

/* ─── WIFI ─── */
void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi failed! Restarting...");
    delay(2000);
    ESP.restart();
  }
}

/* ─── CAPTURE IMAGE ─── */
bool captureImage(uint8_t **outBuf, size_t *outLen) {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    return false;
  }

  *outBuf = (uint8_t *)malloc(fb->len);
  if (!*outBuf) {
    esp_camera_fb_return(fb);
    return false;
  }

  memcpy(*outBuf, fb->buf, fb->len);
  *outLen = fb->len;
  esp_camera_fb_return(fb);
  return true;
}

/* ─── SEND TO SERVER ─── */
bool sendToServer(uint8_t *jpgBuf, size_t jpgLen, DetectionResult *result) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi not connected");
    return false;
  }

  HTTPClient http;
  String url = String("http://") + SERVER_HOST + ":" + SERVER_PORT + DETECT_ENDPOINT;
  http.begin(url);

  String boundary = "----Boundary" + String(random(10000, 99999));
  String contentType = "multipart/form-data; boundary=" + boundary;
  http.addHeader("Content-Type", contentType);

  String head = "--" + boundary + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"capture.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n";
  String tail = "\r\n--" + boundary + "--\r\n";

  size_t bodyLen = head.length() + jpgLen + tail.length();
  uint8_t *body = (uint8_t *)malloc(bodyLen);
  if (!body) return false;

  memcpy(body, head.c_str(), head.length());
  memcpy(body + head.length(), jpgBuf, jpgLen);
  memcpy(body + head.length() + jpgLen, tail.c_str(), tail.length());

  http.setTimeout(15000);
  int httpCode = http.POST(body, bodyLen);
  free(body);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("HTTP %d: %s\n", httpCode, response.c_str());

    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, response);
    if (!err) {
      result->success = doc["success"] | false;
      result->aboveThreshold = doc["above_threshold"] | false;
      strlcpy(result->plateText, doc["plate_text"] | "N/A", sizeof(result->plateText));
      result->confidence = doc["confidence"] | 0.0f;
      result->charCount = doc["char_count"] | 0;
      http.end();
      return true; // Return true even for low confidence so we can show the result
    }
  } else {
    Serial.printf("HTTP error: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
  return false;
}

/* ─── DISPLAY: General Status ─── */
void displayState(const char *line1, const char *line2, const char *line3) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println(F("=== LPR SYSTEM ==="));
  display.println();

  display.setCursor(0, 20);
  display.println(line1);
  if (line2) { display.setCursor(0, 34); display.println(line2); }
  if (line3) { display.setCursor(0, 48); display.println(line3); }
  display.display();
}

/* ─── DISPLAY: High Confidence Result — HIGHLIGHTED ─── */
void displayResultHigh(const DetectionResult &res) {
  // Draw a bright highlighted frame border
  display.clearDisplay();

  // Draw border — 2 rectangles for highlight effect
  display.drawRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, SSD1306_WHITE);
  display.drawRect(1, 1, SCREEN_WIDTH - 2, SCREEN_HEIGHT - 2, SSD1306_WHITE);
  display.drawRect(2, 2, SCREEN_WIDTH - 4, SCREEN_HEIGHT - 4, SSD1306_WHITE);

  // Title
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(14, 6);
  display.println(F("PLATE DETECTED!"));

  // Plate number — LARGE text (size 2)
  display.setTextSize(2);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(6, 18);

  char plateBuf[12];
  snprintf(plateBuf, sizeof(plateBuf), "%.6s", res.plateText);
  // Center the text based on length
  int textW = strlen(plateBuf) * 12; // approx 12px per char at size 2
  int xOff = (SCREEN_WIDTH - textW) / 2;
  if (xOff < 0) xOff = 0;
  display.setCursor(xOff, 18);
  display.println(plateBuf);

  // Accuracy — prominently shown
  display.setTextSize(1);
  display.setCursor(4, 42);
  display.print(F("ACCURACY:"));

  // Draw accuracy as a bar
  int barX = 68;
  int barY = 44;
  int barW = 56;
  int barH = 8;
  int fillW = (res.confidence / 100.0) * barW;

  display.drawRect(barX, barY, barW, barH, SSD1306_WHITE);
  display.fillRect(barX, barY, fillW, barH, SSD1306_WHITE);

  // Percentage text
  display.setCursor(barX, barY + barH + 2);
  char confStr[8];
  snprintf(confStr, sizeof(confStr), "%.1f%%", res.confidence);
  display.print(confStr);

  display.display();
}

/* ─── DISPLAY: Low Confidence Result ─── */
void displayResultLow(const DetectionResult &res) {
  display.clearDisplay();

  // Dashed warning border
  display.drawRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, SSD1306_WHITE);

  // Warning icon
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(8, 4);
  display.println(F("!! WARNING !!"));

  display.setCursor(8, 14);
  display.println(F("Low Confidence"));

  // Show what was read
  display.setCursor(8, 28);
  display.setTextSize(1);
  display.print(F("Read: "));
  display.setTextSize(2);
  char buf[8];
  snprintf(buf, sizeof(buf), "%.4s", res.plateText);
  display.println(buf);

  // Show accuracy
  display.setTextSize(1);
  display.setCursor(8, 48);
  display.print(F("Accuracy: "));

  // If below 30% show red (inverted), otherwise show normal
  if (res.confidence < 30.0) {
    display.setTextColor(SSD1306_WHITE, SSD1306_WHITE); // inverted
  }
  display.print(res.confidence);
  display.setTextColor(SSD1306_WHITE);
  display.println(F("%"));

  display.display();
}
