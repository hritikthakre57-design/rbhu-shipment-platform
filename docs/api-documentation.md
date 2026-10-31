# API documentation

The machine-readable contract is [backend/openapi.yaml](../backend/openapi.yaml). When the application is running, Swagger UI is available at:

- Docker: http://localhost:4000/api-docs
- Local frontend proxy: http://localhost:8080/api-docs

## Base URLs and authentication

| Environment | Base URL |
|---|---|
| Docker API | `http://localhost:4000` |
| Browser through Nginx | `http://localhost:8080` |

Login and the health check do not require a token. Send the returned JWT on all other `/api` requests:

```http
Authorization: Bearer <token>
```

The seeded local account is `admin@example.com` / `Admin@123`.

## Endpoint summary

| Method | Path | Auth | Purpose |
|---|---|---:|---|
| GET | `/health` | No | API liveness check |
| POST | `/api/auth/login` | No | Exchange credentials for a JWT |
| GET | `/api/customers` | Yes | List active customers; optional `status` filter |
| POST | `/api/customers` | Yes | Create a customer |
| GET | `/api/customers/:id` | Yes | Read a customer |
| PATCH | `/api/customers/:id` | Yes | Update one or more customer fields |
| DELETE | `/api/customers/:id` | Yes | Soft-delete a customer |
| GET | `/api/shipments` | Yes | List shipments; optional `status` filter |
| POST | `/api/shipments` | Yes | Create a shipment |
| GET | `/api/shipments/:id` | Yes | Read shipment details |
| PATCH | `/api/shipments/:id/status` | Yes | Change shipment status and emit an event |
| GET | `/api/dashboard` | Yes | Return customer/shipment totals |
| POST | `/api/analytics/analyze` | Yes | Analyze a CSV upload |
| POST | `/api/chat` | Yes | Send a chat message |
| GET | `/api/chat/:conversationId` | Yes | Read an owned conversation |

## Common request examples

### Login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin@123"}'
```

Response shape:

```json
{
  "token": "<jwt>",
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "name": "Admin User",
    "role": "admin"
  }
}
```

### List customers

```bash
curl http://localhost:4000/api/customers?status=Active \
  -H "Authorization: Bearer <token>"
```

### Create a shipment

```bash
curl -X POST http://localhost:4000/api/shipments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"trackingNumber":"TRK-3001","customerId":"<customer-uuid>","origin":"Mumbai","destination":"Pune"}'
```

### Change shipment status

```bash
curl -X PATCH http://localhost:4000/api/shipments/<shipment-uuid>/status \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status":"InTransit"}'
```

Valid statuses are `Created`, `InTransit`, `Delivered`, and `Cancelled`. `Delivered` and `Cancelled` are final states. A successful status change broadcasts:

```json
{
  "event": "shipment_status_changed",
  "shipmentId": "uuid",
  "status": "InTransit"
}
```

### Analyze a CSV

The multipart field is named `file`. Files must be `.csv`, at most 5 MB, and contain `salesperson`, `revenue`, and `region` columns.

```bash
curl -X POST http://localhost:4000/api/analytics/analyze \
  -H "Authorization: Bearer <token>" \
  -F "file=@analytics-service/sample_sales.csv"
```

The response contains `summary`, two Plotly-compatible `charts`, and any row-cleaning `warnings`.

### Chat

```bash
curl -X POST http://localhost:4000/api/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"What is the status of TRK-1002?"}'
```

If `OPENAI_API_KEY` is configured and the provider succeeds, the response has `mode: "ai"`. Otherwise it has `mode: "mock"` and returns a deterministic demo response.

## Validation and errors

Errors use one consistent shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {"field":"email","message":"Invalid email address"}
    ]
  }
}
```

Common status codes:

| Status | Meaning |
|---:|---|
| 200 | Successful read/update/action |
| 201 | Resource created |
| 204 | Customer soft-deleted |
| 400 | Invalid input or invalid domain transition |
| 401 | Missing/invalid credentials or JWT |
| 404 | Route, customer, shipment, or conversation not found |
| 409 | Duplicate customer email or tracking number |
| 413 | CSV exceeds 5 MB |
| 502 | Analytics service unavailable |
| 500 | Unexpected server error |

## WebSocket API

Connect to `/ws?token=<jwt>` using the same host as the browser. For Docker through the frontend, the URL is:

```text
ws://localhost:8080/ws?token=<jwt>
```

The server sends `shipment_status_changed` events after a successful status update. Clients should reconnect and refetch shipment/dashboard data after a disconnect.
