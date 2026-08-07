# Circuit Forge Technologies

Website, business documentation, and prototype source code for **Circuit Forge Technologies**, a South African electronics engineering company and a Skyline IT subsidiary.

> **From Idea to Innovation.**

## Contents

| Location | Purpose |
| --- | --- |
| [`index.html`](index.html) | Standalone company website |
| [`js/liquid-ether.js`](js/liquid-ether.js) | Website visual effect script |
| [`docs/`](docs/README.md) | Business, planning, and client-document templates |
| [`license-plate-detector/`](license-plate-detector/README.md) | ESP32-CAM licence-plate detection prototype |

## Website

The website is intentionally dependency-free: its styles are embedded in `index.html`, with one local JavaScript asset. To preview it, open `index.html` in a modern browser. Internet access is required only for the Google Fonts referenced by the page.

No build process, package manager, or development server is required.

## Licence Plate Detector Prototype

The prototype captures images on an ESP32-CAM and submits them to a Python/FastAPI server for OpenCV and Tesseract OCR processing. It includes firmware, server code, wiring information, a bill of materials, and installation guidance.

Start with the prototype's [README](license-plate-detector/README.md), then consult its [hardware assembly guide](license-plate-detector/hardware/assembly_guide.md) before wiring or flashing the board.

## Services

- Custom PCB design and design-for-manufacture support
- Embedded systems and microcontroller programming
- Internet Of Things (IoT) solutions and connected-device development
- Hardware prototyping
- End-to-end electronics product development

## Technology

C, C++, Python, MicroPython, Embedded Linux, ESP32, STM32, Arduino, Raspberry Pi, KiCad, and Altium.

## Documentation

The [`docs/`](docs/README.md) directory contains the company planning and client-document set, including a feasibility study, business plan, financial plan, risk assessment, service-level agreement, and project proposal template.

## Repository conventions

- Keep website assets at the repository root or in `js/`.
- Keep business and client-facing documents in `docs/`.
- Keep prototype-specific code and instructions inside the relevant project directory.
- Do not place credentials, Wi-Fi passwords, server IPs, or other secrets in tracked files.

## Company

Circuit Forge Technologies is a subsidiary of [Skyline IT](https://skylineit.site/).

---

This repository does not currently declare a software licence. Add one before distributing or accepting external contributions.
