# Existing hardware audit

24 October 2026. Scope: the parent `Product/Livestock tracker/hardware/pcb` and corresponding firmware inputs. Inspection is evidence about file contents, not a physical device test.

| Finding | Evidence | Required resolution |
|---|---|---|
| Both PCB files are incomplete | Each PCB contains four mounting-hole footprints and zero track segments. The main lists 58 named nets but no electronic component footprints. | Populate exact verified footprints from a corrected schematic, place and route, then run parity checks and DRC. Existing export scripts can export these shells and do not prove completeness. |
| Layer count conflict | Main PCB declares only F.Cu and B.Cu; hardware README and JSON specification claim four layers. | Agree stackup and implement it in the actual PCB before impedance calculations. |
| Radio frequency conflict | BOM says SX1278 868 MHz and firmware sets `LORA_FREQ 868E6`. Semtech specifies SX1278 for 137–525 MHz. | Choose a radio and antenna for the verified intended frequency and applicable operating conditions; do not merely rename the chip. |
| ESP32 footprint is provisional | Custom footprint describes 10+10 prototype pads, uses GPIO names as pad identifiers and explicitly says to verify geometry. | Replace with a manufacturer-verified numbered land pattern and reconcile every schematic pin. |
| Missing custom footprints | Schematic references include `livestock:SX1278-QFN-28`; local `fp` only contains ESP32 and NanoSIM modules. No local fp-lib-table/sym-lib-table is present. | Supply verified footprint libraries and project-local library tables. |
| Firmware pin assignment needs reconciliation | Main config uses GPIO19 as `BATTERY_PIN` and GPIO18 as strap input while describing native USB programming. ESP32-C3 USB uses GPIO18/19; ADC suitability must be checked against the actual module pinout. | Create one validated pin map for schematic, PCB and firmware, accounting for USB, ADC, boot straps and voltage domains. |
| Product scope differs | Legacy board is an 85x55mm collar input with a 5000mAh cell and external solar concept; web now describes wearable safety products. | Define a separate wearable mechanical/power architecture; do not assume the collar fits Pendant/Wristband/Clip. |

All legacy KiCad S-expressions passed a parenthesis/quoted-string structural scan. This does not validate KiCad schema, library resolution, electrical connections, RF behavior or battery safety. No KiCad CLI was found on PATH or under the standard Program Files/KiCad directory. No ERC, DRC, electrical simulation or physical test was run.

## Primary references checked

- [Semtech SX1278 product specifications](https://www.semtech.com/products/wireless-rf/lora-connect/sx1278) — supported 137–525 MHz range. Checked 24 October 2026.
- [SIMCom SIM7080G](https://www.simcom.com/product/SIM7080G) — Cat-M/NB-IoT device, 2.7–4.8V supply and optional GNSS. Coverage and a selected module variant remain deployment decisions.
- [TI BQ25895](https://www.ti.com/product/BQ25895) and [datasheet](https://www.ti.com/lit/ds/symlink/bq25895.pdf) — charger/power-path design reference; a part name alone does not validate cell limits or power layout.
- [Espressif ESP32-C3-MINI-1 datasheet](https://www.espressif.com/sites/default/files/documentation/esp32-c3-mini-1_datasheet_en.pdf) — authoritative module pin numbering and land-pattern source to use for the next revision.
- [KiCad schematic format](https://dev-docs.kicad.org/en/file-formats/sexpr-schematic/) and [PCB format](https://dev-docs.kicad.org/en/file-formats/sexpr-pcb/) — source for the reference file structure.

## Release status

**Not for fabrication.** Existing hardware/firmware remain legacy engineering inputs. The new reference project documents the wearable work without claiming a finished circuit. No parts should be purchased from the historical indicative BOM as an approved production list.
