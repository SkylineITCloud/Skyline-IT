# Women’s safety KiCad reference

24 October 2026 — DRAFT-0. Open `womens-safety-reference.kicad_pro`, then its schematic, in KiCad 7 or later.

This is an editable **functional architecture sheet**, not a completed electrical schematic. The block outlines and connecting lines are graphical items; there are no electrical nets, component symbols, footprints or selected parts. It is deliberately separate from the historical collar files. No PCB or fabrication outputs are supplied because wearable size, radio, battery and component selection have not been confirmed. Creating an arbitrary board would imply engineering decisions that have not been made.

## Historical decisions, superseded by the selected module prototype

1. **Resolved:** target the women's safety Pendant, Wristband and Clip. Whether all three share one PCB remains an engineering decision.
2. Must the wearable send alerts without a phone, or may it depend on a paired phone? Which cellular operator/SIM and verified coverage are intended?
3. Required enclosure dimensions, charging interface, protected cell specification, daily reporting profile and runtime target.
4. SOS actuation/cancel behavior and wearer feedback. Is two-way calling required?
5. Prototype quantity, assembly method and target device cost. Published selling price does not establish a feasible hardware BOM.

Then produce a pin-level schematic and verified library tables, power/current budget, exact manufacturer BOM, placement/routing with agreed stackup, ERC/DRC and schematic/PCB parity reports, antenna review and measured prototype validation. Until then the files must not be described as a working safety device or manufacture-ready.

## Validation performed

The new project JSON parses. The schematic S-expression parses structurally, UUIDs are unique and block coordinates fit A4. Initial PATH/Program Files discovery missed a per-user KiCad installation. KiCad 10.0.6 was subsequently found; native validation of the selected electrical design is recorded in `../sim800l-module-prototype/VALIDATION.md`. This historical graphical sheet is not the electrical design. A graphical architecture has no electrical connectivity to validate with ERC.

See `HARDWARE_AUDIT.md` for findings in the existing collar source and primary references. See `COMPONENT_DECISION_BRIEF.md` for concrete prototype candidates and provisional size/battery planning.

The user subsequently selected SIM800L, NEO-6, ESP32-C3, TP4056 USB-C and lithium power, with four-pin SIM/GPS connectors. Continue in [the selected module prototype](../sim800l-module-prototype/README.md). The earlier block diagram is retained as planning history.
