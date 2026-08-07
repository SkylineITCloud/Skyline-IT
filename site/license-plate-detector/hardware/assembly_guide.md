# Hardware Assembly Guide — License Plate Detector
## Circuit Forge Technologies — Prototype v1.0

---

## Bill of Materials (BOM)

| # | Component | Quantity | Approx Cost (ZAR) | Notes |
|---|---|---|---|---|
| 1 | ESP32-CAM (AI-Thinker) | 1 | R180 | OV2640 camera included |
| 2 | SSD1306 OLED 128x64 (I2C) | 1 | R65 | 0.96", white or blue |
| 3 | Tactile Push Button | 1 | R5 | Momentary, normally open |
| 4 | 5V Power Supply / FTDI | 1 | R50 | For programming and power |
| 5 | 220Ω Resistor | 1 | R1 | For LED current limiting |
| 6 | Jumper Wires (M-F) | 10 | R15 | For connections |
| 7 | LED (optional flash) | 1 | R3 | White/bright LED |
| 8 | USB Cable (micro) | 1 | R30 | For power (if using dev board variant) |
| 9 | Breadboard | 1 | R25 | For prototyping |
| 10 | Dupont connectors | 1 set | R20 | |

**Total approx:** R394 ($22 USD)

---

## Wiring Schematic (Text)

```
                    ┌─────────────────────────────────────┐
                    │         ESP32-CAM (AI-Thinker)      │
                    │                                     │
                    │  ┌─────────────────────────────┐    │
                    │  │      OV2640 Camera          │    │
                    │  │  (connected via internal     │    │
                    │  │   ribbon cable header)       │    │
                    │  └─────────────────────────────┘    │
                    │                                     │
                    │  GPIO4 ────┬── 220Ω ────[LED]── GND│
                    │             │                       │
                    │  GPIO13 ────┼─────[Button]── GND    │
                    │             │                       │
                    │  GPIO14 ────┼────────── OLED SDA    │
                    │  GPIO15 ────┼────────── OLED SCL    │
                    │  3.3V  ─────┼────────── OLED VCC    │
                    │  GND   ─────┼────────── OLED GND    │
                    │             │                       │
                    │  U0TXD ─────┼────────── FTDI RX     │
                    │  U0RXD ─────┼────────── FTDI TX     │
                    │  GND   ─────┼────────── FTDI GND    │
                    │  5V    ─────┼────────── FTDI 5V     │
                    │             │                       │
                    └─────────────┼───────────────────────┘
                                  │
                    ┌─────────────┴──────────────┐
                    │       FTDI Programmer       │
                    │   (USB-to-Serial, 5V mode)  │
                    └────────────────────────────┘
```

---

## Step-by-Step Assembly

### Step 1: Prepare ESP32-CAM
- The camera module is connected via a ribbon cable to the ESP32 board
- Ensure the ribbon is seated correctly (contacts facing the board)
- The latch should click closed

### Step 2: Connect OLED Display
| ESP32-CAM Pin | OLED Pin |
|---|---|
| GPIO14 | SDA |
| GPIO15 | SCL |
| 3.3V | VCC |
| GND | GND |

### Step 3: Connect Trigger Button
| ESP32-CAM Pin | Button |
|---|---|
| GPIO13 | One terminal |
| GND | Other terminal |

*(GPIO13 has internal pull-up — no external resistor needed)*

### Step 4: Connect Flash LED (Optional)
| ESP32-CAM Pin | LED |
|---|---|
| GPIO4 | 220Ω Resistor → Anode (+) |
| GND | Cathode (-) |

### Step 5: Connect FTDI Programmer
| FTDI | ESP32-CAM |
|---|---|
| 5V | 5V |
| GND | GND |
| TX | U0RXD |
| RX | U0TXD |

**For flashing:**
- Connect GPIO0 to GND **before powering on**
- Remove GPIO0→GND connection after flashing

---

## Power Requirements

| Component | Voltage | Current |
|---|---|---|
| ESP32-CAM (idle) | 5V (via regulator) | ~80mA |
| ESP32-CAM (active + camera) | 5V | ~180mA |
| With flash LED | 5V | ~280mA |
| With OLED | 5V | +20mA |
| **Total (peak)** | **5V** | **~300mA** |

> Use a 5V/1A minimum power supply. Phone chargers work well.
> Do NOT power via FTDI while using flash LED (FTDI provides limited 5V current).

---

## Enclosure Notes (Optional)

For permanent installation:
- 3D-print a case with camera window
- Mount with plate-facing orientation
- Add weather sealing for outdoor use
- Consider IR-cut filter removal for night operation

---

*Circuit Forge Technologies — A Skyline IT Company*
