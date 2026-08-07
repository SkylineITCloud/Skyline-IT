# VALOW.

VALOW. is a visual brand landing page with a product-interest voting system. Visitors can vote for T-Shirts, Hoodies, Sweaters, or Trackpants; a lightweight Express server stores the results and provides a live admin dashboard.

## What is included

- **Storefront** - the full-screen brand and product experience in `index.html`.
- **Vote service** - an Express API that records votes and voting history.
- **Admin dashboard** - a live view of totals, product demand, and recent votes.
- **Brand assets** - product, logo, brand imagery, and the project presentation.

## Requirements

- [Node.js](https://nodejs.org/) 18 or later (includes npm)
- Windows PowerShell or Command Prompt for the included launchers

## Run locally

From the project root, use either of the following:

```powershell
.\Start-Server.ps1
```

or:

```powershell
.\start-server.bat
```

The server starts on port `3456` and serves:

| Page | Address |
| --- | --- |
| Admin dashboard | `http://localhost:3456/` or `http://localhost:3456/admin` |
| Storefront | `http://localhost:3456/site/index.html` |

The launcher starts the server in a separate terminal window. Close that window to stop it.

### Manual start

If you prefer to run it directly, install the server dependencies once and start it:

```powershell
Set-Location .\server
npm install
npm start
```

`npm install` is only required after cloning or when dependencies are missing. The existing `package-lock.json` pins the dependency tree.

## How voting works

The storefront tries to send each vote to the local service. If the service is unavailable, such as when opening `index.html` directly, the page saves votes in the browser's local storage and syncs them when it can reach the service again.

The server only accepts these product names:

- T-Shirts
- Hoodies
- Sweaters
- Trackpants

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/votes` | Get vote totals by product. |
| `POST` | `/api/vote` | Add one vote. Send JSON such as `{ "product": "Hoodies" }`. |
| `GET` | `/api/admin/stats` | Get total votes and ranked product statistics. |
| `GET` | `/api/admin/history` | Get up to the 200 latest recorded votes. |

Example:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3456/api/vote `
  -ContentType 'application/json' `
  -Body '{"product":"Hoodies"}'
```

## Project structure

```text
.
+-- index.html                 # Storefront
+-- Start-Server.ps1           # PowerShell launcher
+-- start-server.bat           # Command Prompt launcher
+-- assets/
|   +-- images/                # Logo, brand, and product images
|   +-- pptx/                  # VALOW presentation
+-- server/
    +-- server.js              # Express application and API
    +-- package.json           # Server dependencies and commands
    +-- public/index.html      # Admin dashboard
    +-- data/                  # Runtime vote totals and history
```

## Data and deployment notes

Vote data is stored as JSON files in `server/data/`:

- `votes.json` contains cumulative totals.
- `history.json` contains individual vote records and timestamps.

Those files are application data, not source code. Back them up before moving or redeploying the project if existing vote results matter. The admin dashboard and API currently have no authentication; keep the service on a trusted network or add access control before publishing it publicly.

## Assets

The presentation is available at `assets/pptx/VALOW-presentation.pptx`. Storefront imagery is under `assets/images/`.
