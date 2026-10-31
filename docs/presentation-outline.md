# Presentation outline (10 to 15 minutes)

| # | Topic | Minutes | Key points |
|---|---|---|---|
| 1 | Project overview | 1 | One integrated platform: login, customers, shipments, live notifications, analytics, AI assistant. Not six demos. |
| 2 | Architecture and decisions | 2 | React app, Express API, PostgreSQL, separate Flask service behind the Express proxy. Layers: route, middleware, controller, service, repository. |
| 3 | Technology choices | 1 | Node, Express, TypeScript, Prisma, Zod, React, Vite, TanStack Query, Flask, Pandas, Plotly. Why each, in one line. |
| 4 | Database design | 1.5 | Entities, UUIDs, enums, soft delete, audit fields, indexes, migrations. Known limitation: unique email versus soft delete. |
| 5 | API implementation | 2 | Zod at the edge, services throw typed errors, one error handler, JWT, Swagger at /api-docs, status rules. |
| 6 | Frontend integration | 1.5 | One API client, React Query with cache invalidation, Zod forms, protected routes, responsive layout. |
| 7 | Analytics microservice | 1 | Flask /analyze, Pandas stats, Plotly figure JSON, private service reached only through Express. |
| 8 | AI integration | 1.5 | OpenAI-compatible provider (Groq in dev), history in PostgreSQL, system prompt grounded in platform data, labelled demo fallback. Azure OpenAI switch is configuration. |
| 9 | WebSocket notifications | 1 | Service emits an event after the DB update, ws broadcasts to all clients, JWT checked at connect. Live demo with two browsers. |
| 10 | Security | 1 | JWT, bcrypt, Zod validation, CORS, helmet, no secrets in Git, Key Vault in Azure. |
| 11 | Scalability and Azure | 1 | In-process events reach one instance; use Redis pub/sub or Azure Web PubSub. App Service, Azure DB for PostgreSQL, Entra ID, Key Vault, VNET Integration. Design only. |
| 12 | Tradeoffs and future work | 1 | Honest limits below, then Entra ID, httpOnly cookies, pagination, Kaleido export, deployment. |

## Suggested live demo (3 minutes, inside topics 6 to 9)

1. Log in, show the dashboard.
2. Open two browser windows. Change a shipment status in one and watch the other update.
3. Upload sample_sales.csv on the Analytics page.
4. Ask the Assistant about a tracking number.
5. Open /api-docs.

## Honest notes to state openly

- Local PostgreSQL was used instead of Docker.
- Groq is the AI provider in development because no OpenAI or Azure key was available. The integration is OpenAI-compatible, and a labelled demo mode covers an unreachable provider.
- Authentication is a real JWT flow with a mocked user directory. Entra ID is the production path.
- Azure work is design only; nothing is deployed.
- Tests write to the development database.
- An AI coding agent helped with hardening, the e2e suite, analytics and the chat feature, and every result was re-verified by running the tests.

## Questions to be ready for

- Why a service and repository layer?
- Why soft delete, and what is its limitation?
- How would the WebSocket scale to several instances?
- Why is the JWT in the WebSocket URL, and how would you improve it?
- Why TanStack Query instead of Redux?
- How does the AI keep context, and what happens without a provider?
- What would you do next with another week?