# Skyline IT — Agent Context

## READ THIS FIRST
This file is loaded at every prompt. It defines how I must operate. If anything changes (user gives a new rule, format preference, or structural constraint), I update this file immediately.

---

## CRITICAL RULES

### 1. Dual-folder sync (MANDATORY)
Every file edit in `Skyline IT/` MUST be mirrored to `Skyline-IT/` at the same relative path.
Skyline-IT is the GitHub-published version. The main Skyline IT is the working copy.
If I create a new file, create it in BOTH folders. If I edit, edit BOTH.

### 2. Check context first
Read this file at the start of every single prompt before doing anything else.

### 3. Mirror edits immediately
After making a change in `Skyline IT/`, immediately make the identical change in `Skyline-IT/`. Do not batch or defer this.

---

## USER PROFILE

- **Name**: S'nqobile Langa Hlatshwayo (NOT Percy — corrected previously)
- **Role**: Founder, IT in Business Systems at Rosebank College, Durban
- **Email**: projectpstg@gmail.com
- **Domain**: www.skylineit.site
- **Established**: 2025
- **Location**: Durban, South Africa
- **Pronouns/reference**: Direct, prefers action over explanation

## COMMUNICATION PREFERENCES

- **Tone**: Direct, concise, no fluff. Get to the point.
- **Format**: Lowercase often used. No need for formal greetings or sign-offs.
- **Length**: Short responses preferred. Don't over-explain unless asked.
- **Corrections**: If told something is wrong, fix it immediately without arguing or questioning — assume they know what they want.
- **Decisions**: When they state something about the project structure (e.g., "X is a product of Y"), accept it literally and update everything to reflect it.

## PROJECT: Skyline IT Website

Single-page holding company website showcasing all subsidiaries. Midnight purple cyber/tech aesthetic.

### Brand Hierarchy
```
Skyline IT (Holding Company)
├── Skyline IT & Cloud            — Digital Services Division (web, apps, e-commerce, SEO, cloud, social)
│   └── VALOW. Website            — Client project: built a full e-commerce site for an independent brand
├── Mzansi Connect                — IoT solutions (smart security, water, fleet, livestock tracking)
│   └── Livestock GPS Tracker     — Flagship IoT prototype (ESP32, GPS, LoRa, Android app)
├── Circuit Forge Technologies    — Electronics engineering (PCB, embedded, firmware, prototyping)
└── StudySync                     — EdTech platform (freemium + institutional licensing)
```

### Key Structural Facts (hard-coded, do not contradict)
1. VALOW. is an independent brand owned by someone else. Skyline IT & Cloud built their website (e-commerce + voting system) as a client project. Skyline IT has a deal with VALOW. to showcase it.
2. Livestock GPS Tracker is a product of Mzansi Connect, NOT Circuit Forge Technologies
3. Skyline IT is the holding company, not a service provider directly
4. All products/brands/projects exist to "promote our work" — they are proof of capability

### Design Language
- **Colours**: Midnight purple (#070011 bg → #8b5cf6 accents), gold (#f59e0b) for highlights
- **Vibe**: Cool, techky, formal but not stiff, cyber but professional
- **Theme elements**: Scanline overlay, orbit animations, glitch text, grid background
- **Logo**: `images/Logo.png` — used in nav, footer, favicon, hero watermark
- **Fonts**: Space Grotesk (body), JetBrains Mono (code/monospace elements)

### Backend (Unified Server)
- Single Express.js server at `/server/index.js` — serves ALL subsidiaries
- Port 3000 | Run via `start-server.bat` or `cd server && npm start`
- API key in `.env` for protected admin endpoints
- Security: helmet, cors, rate limiting, input validation, JWT auth
- API routes:
  - `/api/holding/*` — Holding company (contact, admin)
  - `/api/mzansi/*` — Mzansi Connect (contact, subscribe, admin)
  - `/api/circuit-forge/*` — Circuit Forge (contact, inquiry)
  - `/api/studysync/*` — StudySync (auth, users, groups, sessions, etc.)

## CODE STYLE RULES
- No comments in code unless explicitly asked
- Match existing patterns (don't introduce new libraries/frameworks unasked)
- Single-file HTML approach for the site (CSS + JS embedded)
- Keep font sizes readable (at least 0.88rem for body text)

## HOW TO HANDLE REQUESTS

1. **Clarify if needed** — if unsure what user means, ask a short question
2. **Make the change** — edit files directly
3. **Mirror to Skyline-IT** — same edit in both folders
4. **Verify** — if tests exist or I can quickly check, do so
5. **Be concise** — no long explanations, just confirm what was done

## MIRROR CHECKLIST (run after every change)
- [ ] Did I edit the file in `Skyline IT\`?
- [ ] Did I make the SAME edit in `Skyline-IT\`?
- [ ] If I created a new file, did I create it in both?
- [ ] If I added a new gitignored path, did I add it to BOTH `.gitignore` files?
