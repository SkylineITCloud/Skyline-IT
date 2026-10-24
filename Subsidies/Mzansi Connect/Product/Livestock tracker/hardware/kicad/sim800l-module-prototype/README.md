# SIM800L / NEO-6 / ESP32-C3 module prototype

**REVIEW-1 — 24 October 2026. Not released for fabrication or personal-safety use.** This is an electrically connected carrier reference for the user's selected SIM800L, NEO-6, ESP32-C3, USB-C TP4056 and lithium battery. It is separate from the preserved collar projects and supersedes the earlier component exploration.

## Open and inspect

Open `mzansi-sim800l-prototype.kicad_pro` in KiCad. The schematic contains actual electrical pins, wires and named nets, not a graphical block diagram. The PCB uses official KiCad stock footprints for carrier parts and connectors. External modules connect by **named wires**; their footprint, orientation, antenna area and mounting are not invented here. Two 15-pin MCU headers reproduce official pin numbering, but their placement is not a drop-in socket for the development board.

`generate_project.py` regenerates the electrical schematic, local symbol library, project settings, BOM and pin map. `build_layout.py` requires KiCad's bundled Python and regenerates the initial PCB placement; it does not preserve manual routing. Do not rerun it over a routed revision without saving that work. Generated source is mirrored to both GitHub folder copies.

## Connector contracts

| Carrier | Pins in order | Requirement |
|---|---|---|
| J6 SIM800L | 1 regulated 4.0V, 2 GND, 3 module RXD, 4 module TXD | Exactly four pins. Raw 2.8V UART is translated in both directions. Module must expose its own manual/onboard PWRKEY action; this interface cannot remotely press PWRKEY. A 5V-input SIM800L EVB is incompatible with this 4V contract without revision. |
| J8 NEO-6 | 1 regulated 3.3V, 2 GND, 3 module TXD, 4 module RXD | Exactly four pins. Select a board genuinely supporting a 3.3V supply and 3.3V UART; a breakout with a high-dropout onboard regulator may need a different connection. |
| J7 MCU | Official DevKitM-1 **J1 pins 1–15**, unchanged | The reference is explicitly Espressif ESP32-C3-DevKitM-1 / current N4X variant, not an unspecified SuperMini. |
| J11 MCU | Official DevKitM-1 **J3 pins 1–15**, unchanged | 30 physical header positions in total; this is not the bare ESP32 chip/module pad count. |
| J1 battery | Protected pack positive, protected pack negative | Single cell only, polarity verified. Never connect directly to raw cell pads behind pack protection. |
| J2 charger | TP4056 BAT+, BAT− | USB-C is on the external charger board. Charger must support the selected pack and the charge/run isolation described below. |
| J3 3.3V regulator | VIN, GND, VOUT | External Pololu S13V25F3, item 4980; verify actual wire names, not assumed physical pad order. |
| J4 modem regulator | VIN, GND, VOUT | External Pololu S18V20ALV, item 2572; preset and verify output at 4.0V before connecting modem. |
| J5 mode switch | 1 common, 2 CHARGE, 3 RUN | Harness assignment, not a claim that every switch's common is pin 1. External SPDT centre-off, break-before-make switch, rated for the full battery current. |
| J9 SOS | SOS input, GND | Normally open button; GPIO3 has an external 10k pull-up. |

### MCU assignments

SIM UART: GPIO7 TX → translator → SIM RX, and SIM TX → translator → GPIO6 RX. GPS UART: GPIO5 TX → GPS RX, GPS TX → GPIO4 RX. Firmware must explicitly remap the two hardware UARTs. GPIO1 controls UART output enable, with R5 100k pulling it off by default. GPIO20/21 remain unused because the official board's USB-UART bridge is attached there. GPIO18/19 USB and boot straps GPIO2/8/9 are also unused. GPIO10 drives the indicator through 1k; GPIO0 reads battery voltage through 200k/100k plus 100nF.

At 4.2V, ADC input is nominally 1.4V, approximately 1.419V with worst-case 1% divider tolerance. Select the ESP32-C3 ADC's **12dB attenuation** (legacy API names it 11dB), use calibration and allow about 35ms settling after power-up. Do not reuse the historical GPIO19 ADC assignment.

The historical collar firmware is **not compatible unchanged**. Its UART/pin assignments, automated PWRKEY handling, ADC configuration and message transport need revision for this carrier. No firmware build or flashing result is claimed. A personal-safety implementation must use authenticated device transport and the intended event protocol; legacy public livestock telemetry is not an acceptable substitute.

## Power and charging

J5 connects pack positive either to the charger's BAT+ or to RUN_BAT; it cannot connect both in a stable switch position. The device is off while charging. This implements a deliberately simple charge/run interlock because TP4056 has no system load-sharing output. Grounds stay common through the protected pack terminals. The external switch must be break-before-make; verify the harness with a continuity meter before connecting a cell.

Use only one MCU power method at a time. In this reference it is the regulated 3.3V header supply. Do not connect the development board's USB or 5V source simultaneously. Disconnect the carrier power harness for USB programming. A bypassing USB supply would defeat the intended off-while-charging behavior.

TXU0202DCUR provides opposite fixed directions for UART. VCCA uses 3.3V; VCCB uses a separate TLV75528PDBVR 2.8V rail. OE uses GPIO1 and defaults off through R5. Thus no inaccessible SIM VDD_EXT pad is assumed. U2 has 1µF input/output capacitors; U1 has 100nF on both supply domains. C2/C3 are local modem reservoir capacitors, to be fitted close to J6; the modem itself may need additional local capacitance at the remote end of its harness.

Keep GPIO1/OE low throughout boot, reset, programming and modem power transitions. Firmware must set OE low before configuring the TX output, and enable it only after the operator manually starts the modem and confirms its appropriate ready indication. Set OE low before manual modem shutdown or changing the power mode. The four-pin interface has no VDD_EXT/status signal, so it **cannot automatically detect the modem's internal power state**. A timed UART handshake alone does not remove that limitation. Unattended operation needs a verified power-state interlock or a revised interface; this controlled bench prototype does not claim one.

S18V20ALV's published 2A capability is typical near equal input/output voltage. It is **not a guarantee** of 2A at the lowest battery voltage. Measure at the modem, not only at the regulator. Require 3.4–4.4V through real transmit bursts. If the selected regulator fails that test, change the supply design before any field use. Avoid solderless breadboard power paths.

## Battery requirements

Specify a documented, independently protected **1S Li-ion/LiPo pack**, 3.7V nominal and **4.20V maximum charge**, initially at least **2000mAh**, rated at least **5A continuous** and **8A pulses** with a documented pulse duration and repetition limit covering measurements. Capacity alone does not establish current capability. This is a bench/prototype requirement, not a promise that the pack fits jewellery or delivers a particular runtime.

Use pack protection against overcharge, overdischarge and short circuit, appropriate pack temperature sensing, an appropriately rated fuse and correct connector polarity. Select fuse/time-current behavior against actual inrush and burst measurements; a fuse is not specified solely from its printed current. The external switch, pack wiring and J1/J3/J4/J5 connections must support at least the same 5A continuous/8A pulse path. The carrier's Phoenix MKDS 1,5 power terminal family has a manufacturer nominal rating of 17.5A; PCB copper and wire limits still require review.

Start charging at **no more than 500mA, or the pack manufacturer's lower limit**. Verify actual TP4056 variant, RPROG and measured current rather than assuming a generic resistor formula or the module's factory 1A setting. A grounded TEMP pin disables battery-temperature supervision: a charger board with that arrangement must be revised or replaced with a verified temperature-supervised implementation for the selected cell. A USB-C connector alone does not prove correct CC pull-downs; verify the charger board's USB-C implementation. Do not substitute LiFePO4, 4.35V high-voltage lithium or multiple cells for this pack specification.

At a conservative 3.0V pack and 80% conversion efficiency, a 4.0V/2A modem burst alone requires about 3.33A from the pack, before MCU/GPS consumption. Low-battery thresholds must shut the system down before the regulators leave their operating range, with hardware fault protection independent of firmware. Validate the selected pack's cutoff and regulator behavior; an arbitrary generic pack protector may trip below a regulator's minimum input. No seven-day runtime claim is made.

## Release gates

The PCB's routing state and actual native KiCad results are recorded in `VALIDATION.md`. No Gerbers or assembly order are released. Even a clean software rules check does not validate antenna placement, module authenticity, battery temperature behavior, cellular service or an emergency delivery path.

Before fabrication: approve exact external module variants and harnesses, verify mechanical placement and connector/current ratings, resolve any remaining routing/DRC issues, review copper/return-path current and temperature, and perform the measured power tests. Before wearer trials: verify operator 2G/GPRS availability in intended areas, authenticated device transport, pairing, replay resistance, consent and notification delivery. SIM800L is a 2G module; compatibility with future networks is not assumed.

## Primary sources

- [Espressif DevKitM-1 user guide: exact 15+15 header tables and mutually exclusive power methods](https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32c3/esp32-c3-devkitm-1/user_guide.html).
- [SIMCom SIM800H/SIM800L Hardware Design V2.02, manufacturer document hosted by Electrokit](https://www.electrokit.com/upload/product/41018/41018214/SIM800L-SIMCom.pdf).
- [u-blox NEO-6 data sheet](https://content.u-blox.com/sites/default/files/products/documents/NEO-6_DataSheet_%28GPS.G6-HW-09005%29.pdf).
- [Top Power TP4056 manufacturer data sheet](https://www.toppwr.com/uploadfile/file/20240307/65e993d6379ea.pdf).
- [TI TXU0202 data sheet](https://www.ti.com/lit/ds/symlink/txu0202.pdf) and [TI TLV755P data sheet](https://www.ti.com/lit/ds/symlink/tlv755p.pdf).
- [Pololu S13V25F3](https://www.pololu.com/product/4980) and [S18V20ALV](https://www.pololu.com/product/2572).
- [Phoenix Contact MKDS 1,5/2-5,08](https://www.phoenixcontact.com/en-us/products/printed-circuit-board-terminal-mkds-15-2-508-1715721).
- [Espressif ESP32-C3 ADC reference](https://docs.espressif.com/projects/esp-idf/en/v4.4.5/esp32c3/api-reference/peripherals/adc.html).
