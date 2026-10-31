# Customer and Shipment Management Platform

A full-stack platform where an employee logs in, manages customers and shipments, receives real-time shipment notifications, uploads sales CSVs for analytics, and chats with an AI assistant. Built for the RBHU ETG Full Stack Engineer technical assessment.

## Architecture

Backend layers: route -> middleware (JWT, Zod validation) -> controller (HTTP only) -> service (business rules) -> repository (Prisma only) -> PostgreSQL. One central error handler returns `{ "error": { "code", "message", "details?" } }`.

## Modules

| Module | What it does |
|---|---|
| Customer and Shipment API | CRUD, soft delete for customers, status rules for shipments, dashboard stats, Swagger docs |
| React frontend | Login, dashboard, customers, shipments, analytics, assistant |
| Sales analytics (Flask) | `POST /analyze` with a CSV (salesperson, revenue, region): summary stats and two Plotly charts |
| AI assistant | `POST /api/chat` with stored conversation history and platform context |
| Real-time notifications | WebSocket broadcast to all clients when a shipment status changes |
| Azure deployment design | Documentation only, see docs/azure-deployment.md |

## Prerequisites

- Node.js 20+ (developed on Node 24) and npm
- Python 3.10+ (developed on 3.14)
- PostgreSQL running locally (Docker is optional and not required)
- Git

## Setup (Windows PowerShell)

1. Create an empty PostgreSQL database named `shipment_platform`.
2. Backend:

Backend layers: route -> middleware (JWT, Zod validation) -> controller (HTTP only) -> service (business rules) -> repository (Prisma only) -> PostgreSQL. One central error handler returns `{ "error": { "code", "message", "details?" } }`.

## Modules

| Module | What it does |
|---|---|
| Customer and Shipment API | CRUD, soft delete for customers, status rules for shipments, dashboard stats, Swagger docs |
| React frontend | Login, dashboard, customers, shipments, analytics, assistant |
| Sales analytics (Flask) | `POST /analyze` with a CSV (salesperson, revenue, region): summary stats and two Plotly charts |
| AI assistant | `POST /api/chat` with stored conversation history and platform context |
| Real-time notifications | WebSocket broadcast to all clients when a shipment status changes |
| Azure deployment design | Documentation only, see docs/azure-deployment.md |

## Prerequisites

- Node.js 20+ (developed on Node 24) and npm
- Python 3.10+ (developed on 3.14)
- PostgreSQL running locally (Docker is optional and not required)
- Git

## Setup (Windows PowerShell)

1. Create an empty PostgreSQL database named `shipment_platform`.
2. Backend:

Backend layers: route -> middleware (JWT, Zod validation) -> controller (HTTP only) -> service (business rules) -> repository (Prisma only) -> PostgreSQL. One central error handler returns `{ "error": { "code", "message", "details?" } }`.

## Modules

| Module | What it does |
|---|---|
| Customer and Shipment API | CRUD, soft delete for customers, status rules for shipments, dashboard stats, Swagger docs |
| React frontend | Login, dashboard, customers, shipments, analytics, assistant |
| Sales analytics (Flask) | `POST /analyze` with a CSV (salesperson, revenue, region): summary stats and two Plotly charts |
| AI assistant | `POST /api/chat` with stored conversation history and platform context |
| Real-time notifications | WebSocket broadcast to all clients when a shipment status changes |
| Azure deployment design | Documentation only, see docs/azure-deployment.md |

## Prerequisites

- Node.js 20+ (developed on Node 24) and npm
- Python 3.10+ (developed on 3.14)
- PostgreSQL running locally (Docker is optional and not required)
- Git

## Setup (Windows PowerShell)

1. Create an empty PostgreSQL database named `shipment_platform`.
2. Backend:
Edit `backend/.env`: set the database password in `DATABASE_URL` and a `JWT_SECRET` of at least 16 characters. Then:
3. Frontend:
4. Analytics service:

## Run

Use three terminals:
Open http://localhost:5173. Swagger UI is at http://localhost:4000/api-docs.

Demo login (development only, created by the seed): `admin@example.com` / `Admin@123`.

## Environment variables (backend/.env)

| Variable | Purpose | Secret |
|---|---|---|
| DATABASE_URL | PostgreSQL connection string | Yes |
| NODE_ENV | development, test or production | No |
| PORT | API port (default 4000) | No |
| JWT_SECRET | Signing key for JWT, at least 16 characters | Yes |
| JWT_EXPIRES_IN | Token lifetime, default 1h | No |
| CORS_ORIGIN | Allowed browser origin(s), comma separated | No |
| LOG_LEVEL | pino log level | No |
| ANALYTICS_URL | Flask service URL, default http://127.0.0.1:5001 | No |
| OPENAI_API_KEY | API key for the OpenAI-compatible provider (a Groq key in development) | Yes |
| OPENAI_BASE_URL | Provider endpoint. Groq: https://api.groq.com/openai/v1 | No |
| AI_MODEL | Model name, for example openai/gpt-oss-20b on Groq | No |
| CHAT_HISTORY_LIMIT | Number of past messages sent to the model (default 10) | No |

No secret is committed: `.env` is git-ignored and `backend/.env.example` holds placeholders. In Azure the secrets live in Key Vault and App Service reads them through a managed identity.

## API overview

All routes except login require `Authorization: Bearer <token>`.

| Method and path | Purpose |
|---|---|
| POST /api/auth/login | Returns a JWT and the user |
| GET, POST /api/customers | List (optional ?status=) and create |
| GET, PATCH, DELETE /api/customers/:id | Read, partial update, soft delete |
| GET, POST /api/shipments | List (optional ?status=) and create |
| GET /api/shipments/:id | Shipment details |
| PATCH /api/shipments/:id/status | Change status (emits the notification event) |
| GET /api/dashboard | Totals and status distribution |
| POST /api/analytics/analyze | Upload a CSV, proxied to Flask |
| POST /api/chat | Ask the assistant (optional conversationId) |
| GET /api/chat/:conversationId | Conversation history |
| GET /health | Health check (no auth) |

WebSocket: connect to `/ws?token=<jwt>`. Every connected client receives
`{ "event": "shipment_status_changed", "shipmentId": "...", "status": "..." }`.

## Tests

## Documentation

- docs/azure-deployment.md: Azure architecture, security, deployment strategy, CI/CD, scaling