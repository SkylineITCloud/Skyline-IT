# Technical Architecture Document: StudySync

**Version:** 2.0  
**Last Updated:** June 23, 2026  

---

## 1. System Overview

StudySync follows a **client-server architecture** with a single-page application (SPA) frontend and RESTful API backend. The system is designed for simplicity in Phase 1, with a clear migration path to a distributed architecture in Phase 3.

```
┌──────────────────────┐     HTTP/HTTPS      ┌──────────────────────┐
│    Frontend (SPA)    │ ◄──────────────────► │   Backend (API)      │
│  Vanilla JS + HTML5  │     JSON + JWT       │  Node.js + Express   │
│                      │                      │                      │
│  ┌────────────────┐  │                      │  ┌────────────────┐  │
│  │  api.js         │  │                      │  │  Routes/       │  │
│  │  (fetch client) │◄─┤                      ├─►│  auth.js,      │  │
│  └────────────────┘  │                      │  │  groups.js,    │  │
│         │            │                      │  │  ...            │  │
│  ┌────────────────┐  │                      │  └───────┬────────┘  │
│  │  app.js         │  │                      │          │           │
│  │  (UI logic)     │  │                      │  ┌───────▼────────┐  │
│  └────────────────┘  │                      │  │    db.js        │  │
│         │            │                      │  │  (sql.js)      │  │
│  ┌────────────────┐  │                      │  └───────┬────────┘  │
│  │  index.html     │  │                      │          │           │
│  │  (DOM)          │  │                      │  ┌───────▼────────┐  │
│  └────────────────┘  │                      │  │   SQLite DB     │  │
│                      │                      │  │  (file-based)   │  │
└──────────────────────┘                      │  └────────────────┘  │
                                              └──────────────────────┘
```

---

## 2. Frontend Architecture

### 2.1 Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| HTML5 | — | Document structure, semantic markup |
| CSS3 | — | Styling, responsive design, custom properties |
| Vanilla JavaScript | ES2020+ | Application logic, DOM manipulation, async/await |
| Font Awesome | 6.5.0 | Icons |
| Google Fonts (DM Sans + Fraunces) | — | Typography |
| SortableJS | 1.15.0 | Drag-and-drop task reordering |
| canvas-confetti | 1.9.2 | Celebration animations |

### 2.2 Module Structure

```
frontend/
├── index.html          # Single-page application shell
├── css/
│   └── styles.css      # All styles (2,400+ lines)
└── js/
    ├── api.js          # API client: fetch wrapper, auth management
    └── app.js          # Application logic: event handlers, state, UI
```

### 2.3 State Management

StudySync uses a simple **global state pattern** via closure variables in `app.js`:

| Variable | Type | Purpose |
|----------|------|---------|
| `currentUser` | Object | Authenticated user data (from `api.js`) |
| `pomodoroInterval` | Number | Timer interval reference |
| `pomodoroRunning` | Boolean | Timer state |
| `pomodoroSeconds` | Number | Current countdown value |
| `pomodoroSettings` | Object | Focus/break durations |
| `calendarWeekOffset` | Number | Current week view offset |
| `calendarEvents` | Array | Scheduled session events |
| `myGroups` | Array | User's group list |
| `myGroup` | Object | Currently active group |

### 2.4 API Client (`api.js`)

The API client is a **thin wrapper** around the Fetch API:

```javascript
// Pattern for all API calls
async function apiRequest(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
  const res = await fetch('/api' + path, { method, headers, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
```

**Key design decisions:**
- JWT token stored in `localStorage` for persistence
- Token automatically attached to all requests
- Global error handling via thrown exceptions
- 30+ typed convenience functions for all endpoints

---

## 3. Backend Architecture

### 3.1 Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 20+ | JavaScript runtime |
| Express | 4.21+ | HTTP server and routing |
| sql.js | 1.11+ | SQLite implementation (pure JavaScript) |
| jsonwebtoken | 9.x | JWT signing and verification |
| bcrypt | 5.x | Password hashing (12 rounds) |
| uuid | 10.x | Unique ID generation |
| helmet | 8.x | Security headers |
| cors | 2.8+ | Cross-origin resource sharing |
| express-rate-limit | 7.x | Request throttling |
| express-validator | 7.x | Input validation |

### 3.2 Request Lifecycle

```
Client Request
    │
    ▼
Helmet Middleware (security headers)
    │
    ▼
CORS Middleware (origin validation)
    │
    ▼
Rate Limiter (200 req/15min global, 20 req/15min auth)
    │
    ▼
JSON Body Parser (1MB limit)
    │
    ▼
Auth Middleware (JWT verification) ──► 401 if invalid
    │
    ▼
Route Handler (validation + business logic)
    │
    ▼
Database (sql.js via db.js abstraction)
    │
    ▼
Error Handler ──► JSON response
```

### 3.3 Route Structure

| Module | Base Path | Auth Required | Description |
|--------|-----------|---------------|-------------|
| `auth.js` | `/api/auth` | No (register/login), Yes (me) | Authentication, registration, session |
| `users.js` | `/api/users` | Yes | Profile CRUD, settings, leaderboard, account deletion |
| `groups.js` | `/api/groups` | Yes | Group discovery, CRUD, join/leave |
| `sessions.js` | `/api/sessions` | Yes | Study session CRUD, attendance |
| `tasks.js` | `/api/tasks` | Yes | Task CRUD, completion, reactions |
| `messages.js` | `/api/messages` | Yes | Chat messages, shout-outs |
| `pomodoro.js` | `/api/pomodoro` | Yes | Pomodoro session logging, stats |
| `notifications.js` | `/api/notifications` | Yes | Notifications CRUD, read status |

---

## 4. Database Design

### 4.1 Entity Relationship Diagram

```
┌──────────┐    1:N    ┌─────────────┐    1:N    ┌──────────────┐
│  users   │◄─────────►│ group_members│◄─────────►│   groups_    │
└────┬─────┘           └─────────────┘            └──────┬───────┘
     │                                                   │
     │ 1:N                                               │ 1:N
     ▼                                                   ▼
┌──────────┐                                     ┌──────────────┐
│ pomodoro │                                     │   tasks      │
│_sessions │                                     └──────────────┘
└──────────┘                                              │
     │                                                     │ 1:N
     │ 1:N                                                 ▼
     ▼                                              ┌──────────────┐
┌──────────┐    1:N    ┌─────────────┐              │   sessions   │
│  users   │◄─────────►│ session_    │◄─────────────┤              │
│          │           │ attendees   │              └──────────────┘
└──────────┘           └─────────────┘                       │
     │                                                        │ 1:N
     │ 1:N                                                    ▼
     ▼                                                  ┌──────────────┐
┌──────────┐    1:N    ┌─────────────┐                 │   messages   │
│  users   │◄─────────►│ notificat-  │                 └──────────────┘
│          │           │ ions        │
└──────────┘           └─────────────┘
```

### 4.2 Table Specifications

| Table | Rows | Key Indexes | Size Estimate |
|-------|------|-------------|---------------|
| users | User accounts | email (UNIQUE), id (PK) | ~500B/user |
| groups_ | Study groups | id (PK), created_by | ~200B/group |
| group_members | Membership links | (group_id, user_id) UNIQUE | ~100B/member |
| sessions | Scheduled sessions | group_id, session_date | ~200B/session |
| session_attendees | Attendance records | (session_id, user_id) UNIQUE | ~100B/record |
| tasks | Group tasks | group_id, assigned_to | ~250B/task |
| messages | Chat messages | group_id, created_at | ~500B/message |
| pomodoro_sessions | Timer completions | user_id | ~100B/session |
| notifications | User notifications | user_id, read | ~300B/notification |

### 4.3 Data Access Layer (`db.js`)

The database abstraction layer wraps sql.js in a more convenient API:

```javascript
// Query wrapper — returns array of objects
function q(sql, params = []) { ... }

// Single-row query — returns one object or null
function qOne(sql, params = []) { ... }

// Write operation — executes SQL, persists to disk
function qRun(sql, params = []) { ... }

// Persist in-memory database to disk
function saveDb() { ... }
```

**Key safety features:**
- WAL (Write-Ahead Logging) via pragma
- Foreign key enforcement
- Auto-save after every write
- Parameterized queries prevent SQL injection

---

## 5. Security Architecture

### 5.1 Authentication Flow

```
1. User submits email + password
2. Server queries user by email
3. Server compares password hash with bcrypt
4. Server signs JWT with { sub: userId, email, name }
5. Client stores JWT in localStorage
6. Client attaches JWT as Bearer token to all subsequent requests
7. Auth middleware verifies JWT on every protected route
8. Token expires after configurable period (default: 7 days)
```

### 5.2 Password Security

- **Algorithm:** bcrypt
- **Rounds:** 12 (computational cost ~250ms per hash)
- **Salt:** Automatic per-password
- **Storage:** Hash only; plaintext never logged or stored

### 5.3 JWT Configuration

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Algorithm | HS256 | Symmetric, fast for single-server deployment |
| Secret | Environment variable | Not in codebase |
| Expiry | 7 days | Balance between security and UX |
| Payload | sub, email, name | Minimal; no sensitive data |

---

## 6. Deployment Architecture

### 6.1 Current (Phase 1)

```
                          ┌──────────────────────────┐
                          │     Single Server        │
                          │                          │
User ──► DNS ──► ┌──────┐ │  ┌──────────────────┐   │
                 │ CDN  │─┼─►│  Node.js (Express) │   │
                 │(opt.)│ │  │  ┌──────┐ ┌──────┐ │   │
                 └──────┘ │  │  │ API  │ │Static│ │   │
                          │  │  │Routes│ │Files │ │   │
                          │  │  └──┬───┘ └──────┘ │   │
                          │  │     │               │   │
                          │  │  ┌──▼──────────┐   │   │
                          │  │  │  SQLite DB   │   │   │
                          │  │  │  (file-based)│   │   │
                          │  │  └─────────────┘   │   │
                          │  └──────────────────┘   │
                          └──────────────────────────┘
```

### 6.2 Future (Phase 3 — Horizontal Scale)

```
                        ┌──────────┐
                        │  CDN     │
                        │(Cloudflare│
                        └────┬─────┘
                             │
                   ┌─────────▼─────────┐
                   │   Load Balancer   │
                   └─────────┬─────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
   │  Node App 1  │   │  Node App 2  │   │  Node App 3  │
   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                    ┌────────▼────────┐
                    │   PostgreSQL    │
                    │  (Primary +     │
                    │   Read Replica) │
                    └─────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Redis Cache   │
                    │ (Session,      │
                    │  Rate Limit)   │
                    └─────────────────┘
```

---

## 7. Performance Considerations

### 7.1 Current Benchmarks

| Operation | Avg Time | Notes |
|-----------|----------|-------|
| API response (auth) | 350ms | bcrypt adds ~250ms |
| API response (query) | <50ms | Indexed queries |
| Database export/save | <100ms | sql.js Buffer export |
| Frontend page load | 1.2s | First meaningful paint |
| Chat message round-trip | 200ms | Polling adds latency |

### 7.2 Bottlenecks

| Bottleneck | Impact | Solution |
|------------|--------|----------|
| bcrypt on login | +250ms latency | Acceptable; cache frequent user lookups |
| SQLite file lock | +500ms under concurrent writes | WAL mode mitigates; migrate to PostgreSQL |
| No connection pooling | +50ms per request | Native SQLite has no pool; PostgreSQL needed |
| jsonwebtoken decode | +5ms per request | Negligible; optimize via verification caching |

---

## 8. Monitoring & Observability

### 8.1 Current

- **Logging:** `console.log` / `console.error` (stdout/stderr)
- **Error tracking:** Centralized error handler with stack traces
- **Health:** Express error middleware catches unhandled errors

### 8.2 Planned (Phase 2)

| Tool | Purpose | Cost |
|------|---------|------|
| Sentry | Error tracking and performance monitoring | Free tier |
| Grafana + Prometheus | Metrics dashboard, alerting | Self-hosted (free) |
| UptimeRobot | Uptime monitoring | Free tier |
| Structured logging (pino) | JSON log output, log aggregation | Free |
