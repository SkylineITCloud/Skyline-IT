# Validation — 24 October 2026

Native KiCad 10.0.6 independent checks completed after the final GPIO1 UART-enable revision.

- Schematic ERC: zero reported violations, exit code 0.
- PCB DRC with --severity-all --schematic-parity --exit-code-violations: zero reported violations, zero unconnected pads, zero footprint/parity errors, exit code 0.
- Actual reports: erc.rpt and drc.rpt. Reports list KiCad default ignored checks; a clean result applies to the configured checks, not every possible check.
- Independent exported-netlist review matched every connected pin against pin-map.json. GPIO1 drives UART_OE, with a 100k pulldown. Official DevKitM-1 15+15 pin numbering and TI IC assignments were checked.
- Native SVG exports of the schematic and front copper/silkscreen were visually inspected. Stock TXU0202 DCU footprint is VSSOP-8 2.3x2mm P0.5mm, tagged Texas_DCU0008A; regulator uses DBV SOT-23-5. Verify exact purchased parts before assembly.
- Two-layer 100x75mm module carrier, 25 footprints, two GND zones. Battery positive/run traces use 2mm minimum and modem feed 1.5mm. These widths and filled planes do not establish measured current/temperature capability.

No physical hardware, thermal, charging, RF, operator service, firmware compatibility or alert-delivery tests were performed. No Gerbers are released. This is a review prototype, not a finished wearable or fabrication approval. Follow README.md battery requirements, charging isolation, manual PWRKEY and UART-enable sequence before bench testing.

Regenerating build_layout.py resets placement and routing. Preserve the delivered routed board. Historical collar firmware is incompatible without a deliberate port to the documented pins and safety protocol.
