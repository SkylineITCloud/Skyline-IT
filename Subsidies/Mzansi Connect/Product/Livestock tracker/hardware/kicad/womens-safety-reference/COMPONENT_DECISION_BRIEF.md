# Wearable hardware decision brief

24 October 2026. Confirmed target: women's safety **Pendant, Wristband and Clip**. This proposal is for review, not an approved BOM, electrical design or purchase list.

## Architecture decision

| Option | Event path | Trade-off |
|---|---|---|
| Standalone cellular and GNSS | Wearable → operator → authenticated backend | Can attempt delivery without a nearby phone; needs verified operator service, SIM, antennas and peak-power validation. Indoor location may be unavailable. |
| Bluetooth phone accessory | Wearable → paired phone app → backend | Supports exploring a smaller wrist unit; remote delivery depends on phone presence, permissions, app operation, battery and connectivity. Location comes from the phone. |

**Recommendation:** test standalone cellular first if independence from a phone is the intended promise. Approve a phone-dependent alternative explicitly if jewellery size takes priority. A shared standalone PCB might serve all three forms, but the wrist pod would be substantially larger than a Bluetooth button. No architecture is selected silently.

## Candidate bench hardware

These are alternatives or test fixtures, not a wiring list. Follow each board's power instructions; do not combine charger outputs on one cell.

| Purpose | Exact candidate | Evaluation reason |
|---|---|---|
| Cellular and GNSS bench | [Nordic nRF9151 DK](https://www.nordicsemi.com/Products/Development-hardware/nRF9151-DK) | LTE-M/NB-IoT, GNSS antenna, SIM options and onboard debugger. This development kit is not a wearable board. |
| Later custom standalone core | [Nordic nRF9151](https://www.nordicsemi.com/Products/nRF9151) | Integrates application processor, cellular modem and GNSS. [Nominal package](https://docs.nordicsemi.com/r/bundle/ps_nrf9151/page/mec_spec.html): 12.1 × 11.1 × 1.2mm. That is the component size, not the product size. Freeze the exact orderable variant and reference design before electrical work. |
| Phone-dependent comparison | [Adafruit Feather nRF52840 Express, product 4062](https://www.adafruit.com/product/4062) | BLE board with USB and battery charging; 51 × 23 × 7.2mm before headers. No standalone cellular service. A smaller custom BLE PCB would be needed for the proposed wrist form. |
| Vibration feedback | [Adafruit DRV2605L breakout, product 2305](https://www.adafruit.com/product/2305) | Bench evaluation of haptics; select the motor separately. [TI DRV2605L](https://www.ti.com/product/DRV2605L) supports ERM and LRA actuators. |
| Custom charger investigation | [TI BQ25180EVM / BQ25180](https://www.ti.com/product/BQ25180) | Single-cell charger and power path with configurable current and temperature monitoring. Verify configured SYS voltage, cell limits, thermal design and modem rail requirements together. A charger alone does not constitute the complete battery protection design. |

The existing SIM7080G is an alternative engineering input, not selected here. No LoRa link is required merely to send standalone wearer alerts to the backend. No two-way calling capability is supplied by this proposal.

## Provisional mechanical and battery exploration

These are **design starting envelopes**, inferred for discussion; they are not verified CAD fits. Development kits above will not necessarily fit. Allow antenna keep-outs, plastics, seals, button travel, cell expansion, wiring and attachment mechanics.

| Form | Initial enclosure exploration | Initial battery investigation |
|---|---|---|
| Pendant | 55 × 40 × 16mm standalone | Protected 500mAh single-cell pack, subject to measured peak-load suitability. |
| Clip | 55 × 40 × 18mm including initial clip allowance | Same standalone electronics and battery investigation as Pendant. |
| Wristband | About 55 × 40 × 16mm standalone pod, or 40 × 30 × 12mm phone-dependent pod; strap additional | Standalone: investigate 500mAh. BLE: investigate 150–300mAh. Comfort and antenna tests decide whether a shared PCB is acceptable. |

For scale, [Adafruit pack 1578](https://www.adafruit.com/product/1578) is a protected 500mAh 3.7V pack. [Pack 1317](https://www.adafruit.com/product/1317) is 150mAh and approximately 19.75 × 26.02 × 3.8mm. These are reference examples, not approved production cells. The smaller pack's published charge limit is 150mA; reconcile actual charger defaults with the selected cell. Neither example establishes adequate cellular pulse capability or the required temperature sensing. Select a documented production cell after measuring the load profile.

No runtime promise follows from capacity alone. Measure registration, failed-network retries, location fixes, transmissions, idle states and haptics under the intended reporting profile, with energy reserved for emergency attempts. Do not publish a seven-day claim before verification.

## Decisions before electrical design

1. Confirm phone independence and a usable operator/SIM in actual South African deployment areas. Global radio-band support is not proof of local service.
2. Demonstrate physical SOS input to authenticated, replay-protected server receipt with synthetic records. Keep activation, receipt, contact acknowledgement and closure distinct.
3. Measure peak current, rail droop, charge temperature and energy. Document cell and charger settings and fault recovery.
4. Approve enclosure envelope, charging interface, actuator, SOS/cancel behavior and whether calling is required.
5. Freeze exact parts and reference revisions; then create electrical schematics, verified libraries, fitted mechanical models and routed PCBs. Complete KiCad checks and measured prototypes before fabrication release.

Manufacturer sources consulted on 24 October 2026. Recommendations, size envelopes and capacity targets are engineering proposals; manufacturers do not endorse the Mzansi product or guarantee its performance. No cost claim is made.
