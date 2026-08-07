# StudySync

StudySync is a collaborative study platform for university students. It helps students find compatible study groups, plan sessions, manage shared tasks, stay focused with a Pomodoro timer, and keep each other motivated.

## Highlights

- Secure account registration and sign-in with JWT-based authentication
- Course and study-method matching for study groups
- Group sessions, attendance, and weekly planning
- Shared task board with drag-and-drop ordering and reactions
- Group chat, shout-outs, mentions, and notifications
- Pomodoro tracking, study streaks, and a leaderboard
- User preferences for dark mode, do-not-disturb, and notifications
- Admin tools for managing users

## Technology

| Area | Tools |
| --- | --- |
| Frontend | HTML, CSS, vanilla JavaScript |
| Backend | Node.js and Express |
| Data | SQLite via `sql.js` |
| Security | Helmet, bcrypt, JWT, and rate limiting |
| Deployment | Docker and Docker Compose |

## Project layout

```text
Study Sync/
+-- backend/                 # Express API and database layer
|   +-- src/
|   |   +-- middleware/      # Authentication and error handling
|   |   +-- routes/          # Feature-specific API endpoints
|   +-- Dockerfile
|   +-- package.json
+-- frontend/                # Single-page web client
|   +-- css/
|   +-- js/
|   +-- index.html
+-- docs/                    # Product, business, and technical documents
+-- data/                    # Local database storage (ignored by Git)
+-- docker-compose.yml
+-- start.ps1
```

## Run with Docker

Docker is the simplest way to run the complete application, including the frontend.

### Prerequisites

- Docker Desktop with Docker Compose
- A JWT secret (use a long, random value)

### Start

```powershell
$env:JWT_SECRET = "replace-with-a-long-random-secret"
docker compose up --build
```

Open [http://localhost:4000](http://localhost:4000). Stop the application with `Ctrl+C`; add `-d` to run it in the background.

## Run locally

### Prerequisites

- Node.js 20 or later
- npm

### API development server

```powershell
cd backend
npm install
npm run dev
```

The API listens on `http://localhost:4000`. For a persistent local JWT secret, create a root `.env` file using the variables below, then start with `./start.ps1` from the project root.

```dotenv
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
PORT=4000
CORS_ORIGIN=http://localhost:4000
NODE_ENV=development
```

`start.ps1` creates this file automatically if it is missing. The browser client is served by the API only when `NODE_ENV=production`; use Docker to exercise the complete application locally.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `JWT_SECRET` | Random per process in development | Secret used to sign login tokens. Required in production. |
| `JWT_EXPIRES_IN` | `7d` | Lifetime of issued JWTs. |
| `PORT` | `4000` | HTTP port for the API. |
| `CORS_ORIGIN` | `*` in development | Allowed browser origin or comma-separated origins. |
| `DB_PATH` | `data/studysync.db` | SQLite database file location. |
| `NODE_ENV` | `development` | Enables production safeguards and static frontend serving when set to `production`. |

Never commit `.env` files or production secrets. The project's `.gitignore` already excludes them.

## API overview

All API routes are prefixed with `/api`. Except for registration and sign-in, endpoints require an `Authorization: Bearer <token>` header.

| Area | Base route | Main actions |
| --- | --- | --- |
| Authentication | `/api/auth` | Register, log in, inspect current user |
| Users | `/api/users` | Profile, preferences, heartbeat, leaderboard, account deletion |
| Groups | `/api/groups` | Discover, create, join, leave, inspect groups |
| Sessions | `/api/sessions` | List, schedule, attend study sessions |
| Tasks | `/api/tasks` | Create, update, reorder, and delete shared tasks |
| Messages | `/api/messages` | Retrieve chat, post messages and shout-outs |
| Pomodoro | `/api/pomodoro` | Record completed timers and view stats |
| Notifications | `/api/notifications` | List and mark notifications read |
| Administration | `/api/admin` | Manage users and online status |

Consult the route files in `backend/src/routes/` for request bodies and response details.

## Documentation

The project documentation is indexed in [docs/README.md](docs/README.md). It includes the feasibility study, business plan, product requirements, pricing, go-to-market plan, risk assessment, technical architecture, user personas, draft privacy/terms, and investor pitch outline.

## Security notes

- Set a strong, unique `JWT_SECRET` in every production environment.
- Passwords are hashed with bcrypt.
- API and authentication routes are rate-limited.
- Review the draft legal documents with qualified counsel before a public launch.

## License

No license has been specified for this repository. Add a license before distributing or accepting external contributions.
