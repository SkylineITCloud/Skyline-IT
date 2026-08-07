# License Plate Detector — ESP32-CAM Project

**Circuit Forge Technologies — First Coded Prototype v1.0**

A full-stack license plate detection and OCR system using **ESP32-CAM** (microcontroller) + **Python server**.

## Architecture

```
┌─────────────────┐     Wi-Fi     ┌───────────────┐
│   ESP32-CAM     │ ──────────▶   │  Python Server  │
│   (Firmware)    │ ◀──────────   │  (FastAPI)      │
│                 │   JSON result  │  + OpenCV/Tesseract │
│  • OV2640 Camera│               └───────────────┘
│  • SSD1306 OLED │
│  • Button       │
│  • LED Flash    │
└─────────────────┘
```

## Project Structure

```
license-plate-detector/
├── firmware/
│   ├── esp32-cam/
│   │   └── main.ino          # Main ESP32-CAM firmware
│   ├── lib/
│   │   ├── camera_utils.h     # Camera configuration helpers
│   │   └── display_utils.h    # OLED display helpers
│   └── platformio.ini         # PlatformIO configuration
├── hardware/
│   ├── pinout_reference.md    # Full pinout and wiring reference
│   └── assembly_guide.md      # BOM, wiring schematic, assembly steps
├── server/
│   ├── main.py                # FastAPI OCR server
│   └── requirements.txt       # Python dependencies
└── README.md
```

## Hardware Required

| Component | Purpose |
|---|---|
| ESP32-CAM (AI-Thinker) | Camera + processing |
| OV2640 (included with ESP32-CAM) | 2MP image sensor |
| SSD1306 OLED 128x64 (I2C) | Display results |
| Tactile button | Manual capture trigger |
| LED + 220Ω resistor | Flash illumination |
| FTDI programmer | Flashing firmware |

See `hardware/assembly_guide.md` for full BOM and wiring.

## Setup

### 1. Server (Python)

```bash
cd server
pip install -r requirements.txt
# Install Tesseract OCR: https://github.com/tesseract-ocr/tesseract
python main.py
```

Server runs on `http://0.0.0.0:8000`

### 2. Firmware (ESP32-CAM)

**Using Arduino IDE:**
1. Install ESP32 board support
2. Install libraries: ESPAsyncWebServer, ArduinoJson, Adafruit SSD1306
3. Edit `main.ino` — set Wi-Fi credentials and server IP
4. Select board: `AI Thinker ESP32-CAM`
5. Flash (GPIO0 → GND during connect, remove after)

**Using PlatformIO (recommended):**
```bash
cd firmware
# Edit main.ino with your Wi-Fi/server details
pio run --target upload
```

### 3. Wiring

See `hardware/assembly_guide.md` for full wiring diagram.

Quick reference:
| ESP32-CAM | Connected to |
|---|---|
| GPIO4 | LED (via 220Ω) → GND |
| GPIO13 | Button → GND |
| GPIO14 | OLED SDA |
| GPIO15 | OLED SCL |
| 3.3V | OLED VCC |
| GND | OLED GND, Button, LED |

## Operation

1. Power the ESP32-CAM (5V via FTDI or external supply)
2. Device connects to Wi-Fi and shows IP on OLED
3. **Manual:** Press button → captures photo → sends to server → displays result
4. **Auto mode:** Captures every 10 seconds automatically (for demo)
5. Server processes image with OpenCV plate detection + Tesseract OCR
6. Result (plate number, confidence) sent back to ESP32 and shown on OLED

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check |
| `/api/detect` | POST | Upload image, get plate text |

## Customization

- **Resolution:** Edit `FRAMESIZE_SVGA` in `main.ino` to change camera resolution
- **Auto interval:** Change `AUTO_INTERVAL` in `loop()`
- **Server URL:** Set `SERVER_HOST` in config section
- **OCR tuning:** Edit `custom_config` in `server/main.py` for Tesseract options

---

*Circuit Forge Technologies — A Skyline IT Company*
