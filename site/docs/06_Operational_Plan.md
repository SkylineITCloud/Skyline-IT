# Operational Plan — Circuit Forge Technologies

---

## 1. Operational Model

Circuit Forge Technologies operates as a project-based engineering services firm. Each engagement follows a structured lifecycle from inquiry to delivery and support. Operations are designed to be lean, scalable, and quality-focused.

---

## 2. Service Delivery Lifecycle

### Phase 1: Discovery & Scoping
```
Client Inquiry → Requirements Questionnaire → Discovery Call
    → Technical Assessment → Proposal Generation → Quote Presentation
```
**Duration:** 1-3 business days  
**Output:** Signed proposal + 50% deposit invoice

### Phase 2: Design & Development
```
Project Kickoff → Requirements Finalization → Design/Development
    → Internal Review → Client Milestone Review → Revision (if needed)
```
**Duration:** 5-30 business days (varies by service)  
**Output:** Design files, firmware, or prototype

### Phase 3: Testing & Validation
```
Functional Testing → Performance Testing → Environmental (if applicable)
    → Client Acceptance Testing → Sign-off
```
**Duration:** 2-7 business days  
**Output:** Test report + acceptance sign-off

### Phase 4: Delivery & Support
```
Final Delivery → Documentation → 30-Day Support Period → Close-out
```
**Duration:** 30 days support included  
**Output:** All deliverables + project documentation

---

## 3. Quality Assurance Process

| Stage | Check | Responsibility |
|---|---|---|
| Schematic Review | Component selection, connections, datasheet verification | Lead Engineer |
| PCB Layout Review | Trace width, clearance, grounding, DFM rules | Lead Engineer |
| Firmware Review | Code structure, memory usage, edge cases | Lead Engineer |
| Prototype Testing | Functional test against requirements | Lead Engineer |
| Final Inspection | All deliverables match scope | Founder/PM |

### Design Rules (PCB)
- Minimum trace width: 6 mil (0.15mm)
- Minimum clearance: 6 mil (0.15mm)
- Minimum drill size: 0.3mm
- Standard stackup: 2-layer or 4-layer FR4
- Copper weight: 1oz (standard), 2oz (power)
- Surface finish: HASL (standard), ENIG (premium)

---

## 4. Tools & Infrastructure

| Function | Tool | Type |
|---|---|---|
| Schematic Capture | KiCad | Open-source |
| PCB Layout | KiCad | Open-source |
| Circuit Simulation | LTSpice | Freeware |
| Firmware IDE | VS Code + PlatformIO | Free |
| STM32 Development | STM32CubeIDE | Free |
| Version Control | Git + GitHub | Free |
| Project Management | Trello / Notion | Freemium |
| Communication | Slack / WhatsApp | Freemium |
| File Sharing | Google Drive / Dropbox | Freemium |
| CAD (3D) | Fusion 360 (personal) | Freemium |
| Accounting | Wave / Xero | Freemium |

---

## 5. Lab & Equipment

### Phase 1 Equipment (Months 1-6)
| Item | Purpose |
|---|---|
| Digital Oscilloscope (100MHz) | Signal analysis, debugging |
| Soldering Station | PCB assembly, rework |
| Hot Air Rework Station | SMD soldering/desoldering |
| Bench Power Supply (30V/5A) | Circuit powering |
| Digital Multimeter | Voltage, current, resistance |
| Logic Analyzer | Digital signal debugging |
| USB-UART Adapter | Serial communication |
| Programmers (ST-Link, J-Link, USBasp) | MCU programming |
| Breadboards & Jumper Wires | Prototyping |
| Basic Component Kit | Resistors, caps, LEDs, transistors |

### Phase 2 Additions (Months 7-12)
| Item | Estimated Cost |
|---|---|
| Signal Generator | R3,000 |
| DC Electronic Load | R2,500 |
| Precision Multimeter | R4,000 |
| Microscope (stereo) | R3,500 |
| Reflow Oven (T-962) | R4,000 |
| ESD-safe Workstation | R2,000 |

---

## 6. Client Management

### Onboarding Process
1. Send welcome package (NDA, scope confirmation, payment terms)
2. Schedule kickoff meeting
3. Create project workspace (shared folder, Trello board)
4. Establish communication channels
5. Review timeline and milestones

### Communication Protocol
- **Daily:** Quick async update (WhatsApp/Slack) during active phases
- **Weekly:** Formal progress report via email
- **Milestone:** Review meeting (video call or in-person)
- **Emergency:** Phone call for critical issues

### Invoicing & Payments
| Milestone | Payment |
|---|---|
| Project Start | 50% deposit |
| Design Review | 25% (for larger projects) |
| Final Delivery | 25% (or 50% final) |
| Payment Terms | 7 days from invoice (NET-7) |

---

## 7. Supply Chain & Procurement

### PCB Fabrication Partners
| Partner | Location | Lead Time | Quality |
|---|---|---|---|
| JLCPCB | China | 5-7 days | Standard |
| PCBWay | China | 5-10 days | Standard-Premium |
| Aisler | EU | 7-10 days | Premium |
| Local SA Fabricator | South Africa | 10-14 days | Standard (quality varies) |

### Component Suppliers
| Supplier | Notes |
|---|---|
| RS Components SA | Local distributor, fast delivery |
| Mouser Electronics | Global, extensive stock |
| Digi-Key | Global, fast shipping |
| Micro Robotics (SA) | Local Arduino/Raspberry Pi distributor |
| Netram (SA) | Local maker components |

**Policy:** Maintain minimum buffer stock of common components (ESP32, STM32, ATmega328, passives, connectors). Order project-specific components at project kickoff.

---

## 8. Project Management

### Tools
| Tool | Purpose |
|---|---|
| Trello | Task tracking (Kanban boards) |
| Google Calendar | Milestone scheduling |
| Google Drive | File storage and sharing |
| GitHub | Code repository and version control |
| Toggl | Time tracking |

### Project Documentation Requirements
Each project must have:
- [ ] Project brief (scope, requirements, constraints)
- [ ] Technical specification document
- [ ] Schematic files (native + PDF)
- [ ] PCB layout files (native + Gerber)
- [ ] Firmware source code (with comments)
- [ ] BOM (with part numbers, suppliers, costs)
- [ ] Assembly instructions (if applicable)
- [ ] Test report
- [ ] User guide (if applicable)

---

## 9. Legal & Compliance

### Required Documentation
- NDA (Mutual and One-way templates)
- Service Agreement / Contract
- Statement of Work (SOW) template
- Terms & Conditions
- Privacy Policy (website)
- IP Assignment clause (in service agreement)

### Regulatory Compliance (Per Project)
| Standard | Applicable To |
|---|---|
| ICASA | RF products in South Africa |
| CE | Products sold in EU market |
| FCC | Products sold in US market |
| RoHS | All products (lead-free compliance) |
| EMC Directive | Electronic products with emissions |

---

## 10. Scaling Plan

| Phase | Period | Staff | Revenue/Month |
|---|---|---|---|
| Bootstrap | Months 1-6 | 1 founder + freelancers | R34,000 |
| Growth | Months 7-12 | 1 founder + 1 junior + freelancers | R80,000 |
| Scale | Year 2 | 3 FTEs + interns | R100,000+ |
| Expand | Year 3 | 5-7 staff + lab expansion | R200,000+ |

---

*Circuit Forge Technologies — A Skyline IT Company*
