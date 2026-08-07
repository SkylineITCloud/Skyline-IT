// Circuit Forge Technologies
// ESP32-CAM Pin Configuration Reference

#define PIN_DEFINITIONS

/*
 * ESP32-CAM (AI-Thinker) Pinout
 *
 * ┌─────────────────────────────────────────────┐
 * │  ESP32-CAM (AI-Thinker Module)              │
 * │                                             │
 * │  ┌─────────────┐     ┌──────────────────┐  │
 * │  │   Antenna   │     │   OV2640 Camera  │  │
 * │  │             │     │    (CSI 24-pin)  │  │
 * │  └─────────────┘     └──────────────────┘  │
 * │                                             │
 * │  GPIO0 ── BOOT (pull LOW to flash)          │
 * │  GPIO4 ── LED Flash (HIGH = on)             │
 * │  GPIO13 ── Button Trigger (pull-up, LOW=press)│
 * │  GPIO14 ── OLED SDA                         │
 * │  GPIO15 ── OLED SCL                         │
 * │                                             │
 * │  Pins for OV2640 Camera (internal header)   │
 * │  ┌────┬────┬────┬────┬────┬────┬────┬────┐  │
 * │  │ D0 │ D1 │ D2 │ D3 │ D4 │ D5 │ D6 │ D7 │  │
 * │  │ 5  │ 18 │ 19 │ 21 │ 36 │ 39 │ 34 │ 35 │  │
 * │  ├────┼────┼────┼────┼────┼────┼────┼────┤  │
 * │  │XCK │PCLK│VSYC│HRF │SDA │SCL │PWDN│RST │  │
 * │  │ 0  │ 22 │ 25 │ 23 │ 26 │ 27 │ 32 │ -1 │  │
 * │  └────┴────┴────┴────┴────┴────┴────┴────┘  │
 * └─────────────────────────────────────────────┘
 */

/*
 * CONNECTION DIAGRAM
 * ==================
 *
 * ESP32-CAM ─────────────── SSD1306 OLED
 * GPIO14 (SDA) ──────────── SDA
 * GPIO15 (SCL) ──────────── SCL
 * 3.3V ──────────────────── VCC
 * GND ───────────────────── GND
 *
 * ESP32-CAM ─────────────── BUTTON
 * GPIO13 ────────────────── Pin 1
 * GND ───────────────────── Pin 2
 *
 * ESP32-CAM ─────────────── LED FLASH
 * GPIO4 ─────────────────── Anode (+)
 * 220Ω resistor
 * GND ───────────────────── Cathode (-)
 *
 * ESP32-CAM ─────────────── USB-to-Serial (for programming)
 * U0TXD ────────────────── RXD (FTDI)
 * U0RXD ────────────────── TXD (FTDI)
 * GND ──────────────────── GND (FTDI)
 * 5V ───────────────────── VCC (FTDI)
 *
 * IMPORTANT: 
 * - GPIO0 must be LOW during boot to enter flash mode
 * - GPIO0 must be HIGH or floating for normal operation
 * - FTDI must be set to 5V
 * - Current draw can exceed 500mA with camera + flash
 */

/*
 * RECOMMENDED WIRING
 * ==================
 * 
 * 1. Connect FTDI to ESP32-CAM:
 *    FTDI 5V  → ESP32-CAM 5V
 *    FTDI GND → ESP32-CAM GND
 *    FTDI TX  → ESP32-CAM U0RXD
 *    FTDI RX  → ESP32-CAM U0TXD
 *    FTDI 3.3V → NOT connected (ESP32-CAM has regulator)
 *
 * 2. Connect OLED (I2C, address 0x3C):
 *    ESP32 GPIO14 → OLED SDA
 *    ESP32 GPIO15 → OLED SCL
 *    ESP32 3.3V  → OLED VCC
 *    ESP32 GND   → OLED GND
 *
 * 3. Connect Button (optional, for manual capture):
 *    ESP32 GPIO13 → Button one leg
 *    Button other leg → GND
 *    (GPIO13 has internal pull-up enabled in firmware)
 *
 * 4. Connect Flash LED (optional):
 *    ESP32 GPIO4 → 220Ω resistor → LED anode
 *    LED cathode → GND
 */

/*
 * ESP32-CAM PIN TABLE
 * ===================
 *
 * Pin  | Function         | Connection
 * ─────┼──────────────────┼──────────────────────
 *  0   | XCLK / BOOT      | Internal (camera clock)
 *  4   | GPIO4            | LED Flash (output)
 *  5   | CAM D2           | Internal (camera data)
 * 13   | GPIO13           | Trigger Button (input, pull-up)
 * 14   | GPIO14           | OLED SDA
 * 15   | GPIO15           | OLED SCL
 * 18   | CAM D3           | Internal (camera data)
 * 19   | CAM D4           | Internal (camera data)
 * 21   | CAM D5           | Internal (camera data)
 * 22   | CAM PCLK         | Internal (camera pixel clock)
 * 23   | CAM HREF         | Internal (camera hsync)
 * 25   | CAM VSYNC        | Internal (camera vsync)
 * 26   | CAM SDA          | Internal (I2C camera control)
 * 27   | CAM SCL          | Internal (I2C camera control)
 * 32   | CAM PWDN         | Internal (camera power down)
 * 33   | Not broken out   | —
 * 34   | CAM D6           | Internal (camera data)
 * 35   | CAM D7           | Internal (camera data)
 * 36   | CAM D0           | Internal (camera data)
 * 37   | Not broken out   | —
 * 38   | Not broken out   | —
 * 39   | CAM D1           | Internal (camera data)
 *
 * TX0  | UART TX          | FTDI RX
 * RX0  | UART RX          | FTDI TX
 *
 * NOTE: GPIO33, 37, 38 are NOT broken out on AI-Thinker ESP32-CAM
 */
