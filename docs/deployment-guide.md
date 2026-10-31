# Deployment guide

This guide covers the supported local Docker deployment and the production deployment path. The detailed Azure design is in [azure-deployment.md](azure-deployment.md).

## 1. Local Docker deployment

### Prerequisites

- Docker Desktop with Docker Compose v2
- At least 4 GB of memory available to Docker
- Ports `8080` and `4000` available on the host

### Configure environment

The Compose file has development-safe defaults. For local use, create a root `.env` file when you need custom values:

```dotenv
POSTGRES_DB=shipment_platform
POSTGRES_USER=shipment
POSTGRES_PASSWORD=change-me
DATABASE_URL=postgresql://shipment:change-me@db:5432/shipment_platform?schema=public
JWT_SECRET=use-a-random-secret-at-least-16-characters
OPENAI_API_KEY=
```

If `POSTGRES_USER`, `POSTGRES_PASSWORD`, or `POSTGRES_DB` are changed, keep `DATABASE_URL` consistent. Do not commit `.env`.

### Start and verify

```powershell
docker compose up --build -d
docker compose ps
Invoke-RestMethod http://localhost:4000/health
```

Open http://localhost:8080. On first startup the backend waits for PostgreSQL and analytics, runs `prisma migrate deploy`, and executes the idempotent seed. The seeded demo account is `admin@example.com` / `Admin@123`.

Useful commands:

```powershell
docker compose logs -f backend
docker compose restart backend
docker compose down
```

`docker compose down` preserves the `postgres_data` volume. To intentionally delete local database data, use `docker compose down -v`.

## 2. Container topology

| Service | Image/build | Port | Storage |
|---|---|---:|---|
| `frontend` | `frontend/Dockerfile` | Host `8080` -> container `80` | None; static bundle |
| `backend` | `backend/Dockerfile` | Host `4000` -> container `4000` | None; Prisma connects to DB |
| `analytics` | `analytics-service/Dockerfile` | Internal `5001` | None |
| `db` | `postgres:16-alpine` | Internal `5432` | `postgres_data` named volume |

The frontend proxies `/api`, `/api-docs`, and `/ws` to `backend`. Analytics is intentionally not published to the host.

## 3. Production baseline

For a single-host deployment, use a private Docker network, a managed or separately backed-up PostgreSQL instance, TLS termination at a reverse proxy, and a secret manager. Before production:

1. Replace the default PostgreSQL password and JWT secret.
2. Set `NODE_ENV=production` and a production `CORS_ORIGIN`.
3. Configure `OPENAI_BASE_URL`, `AI_MODEL`, and `OPENAI_API_KEY` only through a secret manager.
4. Pin image versions and scan images/dependencies in CI.
5. Keep PostgreSQL off the public internet and enable encrypted backups.
6. Put the frontend behind HTTPS so WebSocket clients use `wss://`.
7. Run migrations as a release step with `npx prisma migrate deploy`; do not edit production schema manually.
8. Monitor `/health`, HTTP 5xx rates, latency, database connectivity, and analytics failures.

## 4. Azure deployment path

The repository's Azure design uses:

- Azure Front Door + WAF for public HTTPS ingress.
- Linux App Service for the Node API/frontend and private Flask analytics service.
- Azure Database for PostgreSQL Flexible Server with private access.
- Key Vault with managed identity for secrets.
- Application Insights and Log Analytics for observability.
- Redis, Azure Web PubSub, or SignalR for WebSocket fan-out when running multiple API instances.

Recommended release sequence:

```text
commit -> CI tests/build -> deploy staging -> run migrations -> health/smoke test -> slot swap -> monitor -> rollback if needed
```

Use expand-and-contract database migrations so the old and new application versions can coexist during a rolling or slot deployment. The production identity model should use Microsoft Entra ID rather than the local seeded JWT account; see [azure-deployment.md](azure-deployment.md) for the security, network, CI/CD, scaling, and cost design.

## 5. Backup and recovery

- Back up PostgreSQL independently of container lifecycle.
- Test restoring a backup into a separate environment.
- Keep migration files in source control.
- Treat the local `postgres_data` volume as development data, not a production backup.
- Document the secret rotation and JWT invalidation procedure.
