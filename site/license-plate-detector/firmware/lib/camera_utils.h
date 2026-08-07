/*
 * Circuit Forge Technologies
 * Camera utility library for ESP32-CAM
 * Handles resolution presets and image quality optimization
 */

#ifndef CAMERA_UTILS_H
#define CAMERA_UTILS_H

#include <esp_camera.h>

// Resolution presets optimized for license plate detection
typedef enum {
  CAM_RES_LOW    = FRAMESIZE_QVGA,   // 320x240   — fastest, good for test
  CAM_RES_MED    = FRAMESIZE_VGA,    // 640x480   — balanced
  CAM_RES_HIGH   = FRAMESIZE_SVGA,   // 800x600   — recommended
  CAM_RES_FULL   = FRAMESIZE_XGA,    // 1024x768  — highest detail, slower
} CameraResolution;

// Quality presets
typedef enum {
  CAM_QUALITY_HIGH   = 8,   // Best image quality
  CAM_QUALITY_MED    = 12,  // Balanced
  CAM_QUALITY_FAST   = 18,  // Smaller files, faster upload
} CameraQuality;

// Apply a resolution preset to the camera sensor
bool cameraSetResolution(CameraResolution res) {
  sensor_t *s = esp_camera_sensor_get();
  if (!s) return false;
  return s->set_framesize(s, (framesize_t)res) == ESP_OK;
}

// Apply quality setting
bool cameraSetQuality(CameraQuality quality) {
  sensor_t *s = esp_camera_sensor_get();
  if (!s) return false;
  return s->set_quality(s, (int)quality) == ESP_OK;
}

// Get human-readable resolution name
const char *cameraResName(CameraResolution res) {
  switch (res) {
    case CAM_RES_LOW:  return "QVGA (320x240)";
    case CAM_RES_MED:  return "VGA (640x480)";
    case CAM_RES_HIGH: return "SVGA (800x600)";
    case CAM_RES_FULL: return "XGA (1024x768)";
    default:           return "Unknown";
  }
}

#endif
