# QA Test Report

## Summary

- Scope: black-box API, WebSocket, security smoke checks, analytics proxy, AI assistant, and Chromium UI checks.
- Environment: Windows/PowerShell; frontend `http://localhost:5173`; backend `http://localhost:4000`; analytics `http://127.0.0.1:5001`; date 2026-10-31. All services were already running; none were started, stopped, or restarted.
- Totals: 109 scripted records executed; 102 passed; 4 failed; 3 observations; 0 blocked. Remaining charter items not represented by a scripted record are listed under Not tested.
- No application code, existing tests, environment files, secrets, or dependencies were changed.

## Test matrix

| ID | Area | Scenario | Expected | Actual | Result |
|---|---|---|---|---|---|
| A01-A09 | Auth | Valid/invalid credentials, normalization, malformed/oversized input, JWT tampering and algorithm cases | Valid login succeeds; invalid input/token is a clean 4xx/401 envelope | 200 for valid login and normalized email; invalid credentials 401; malformed/oversized inputs 400; token cases 401 | Pass |
| A10-01..13 | Auth | Every protected OpenAPI route without a token | 401 | All 13 returned 401 | Pass |
| A11-A12 | Security/error handling | Helmet headers, CORS, unknown route/method, malformed JSON/content type, large query | No x-powered-by; safe envelope; no disallowed ACAO; no 5xx | All checks passed; no stack, SQL, path, or version leakage observed | Pass |
| A13-A17 | Customers/security | Create, HTML/Unicode/RTL data, duplicate email, length/status validation | Accepted data remains data; invalid input rejected | 201/200 for valid data; HTML was returned as data; duplicate 409; invalid fields 400 | Pass |
| A18a | Customers | PATCH /api/customers/:id with {} | 400 validation error | 200; customer unchanged | Fail |
| A18b | Customers | PATCH /api/customers/:id with { "unknown": "x" } | 400 validation error | 200; customer unchanged | Fail |
| A18c-A20 | Customers | Null field, duplicate email on update, delete twice, access after delete | 400/409/204/404 as applicable | All matched expected results | Pass |
| O01 | Customers | Reuse a soft-deleted customer email | Documented limitation: 409 | 409 | Observation |
| A21-A22 | Customers | Filters, malformed UUID, uppercase UUID | Valid filter 200; invalid clean 4xx | Filters and malformed UUID passed; uppercase UUID returned 404 without 500 | Observation for uppercase UUID |
| A23-A26 | Shipments | Create validation, duplicate/case-only tracking, status rules | Clean validation/conflict responses and documented transitions | All required checks passed; case-only tracking was accepted as a distinct row | Pass / Observation |
| A27-A30 | Concurrency/dashboard | Ten-way duplicate creates, ten-way status updates, dashboard/list reconciliation | Exactly one create; no 500; counts agree | One 201 plus nine 409 for duplicate tracking/email; status updates all 200; counts matched | Pass |
| B01-B03 | Security/AI | XSS-as-data, prompt injection, response secrecy | No execution or secret leakage | No secret/passwordHash leakage; prompt injection refused; HTML stayed data | Pass |
| C01-C10 | WebSocket | 401 handshake rejection, 2/30 clients, rejected changes, disconnects, malformed/binary/large frames, reconnect/order | Exact event delivery; no process crash or cross-client disruption | 10/10 passed; exact {event, shipmentId, status} event delivered; invalid handshakes 401 | Pass |
| D01-D09 | Analytics | Valid/malformed CSV, header normalization, invalid rows, wrong extension/missing file/auth | Correct 200/400/401 behavior and warnings | All scripted cases passed | Pass |
| E01-E07 | Assistant | New/follow-up/known and unknown tracking/totals/prompt injection/length/history | Grounded reply, validation, ordered history | All scripted cases passed; unknown tracking was not invented | Pass |
| UI-01 | Browser | Login, dashboard numbers, protected navigation, logout | Main flow works | Passed | Pass |
| UI-02 | Browser | Create/edit/delete a unique customer | One row, edited value, cleanup | Passed; customer removed through UI | Pass |
| UI-03 | Browser | Assistant persistence and New chat | Conversation survives reload; New chat clears it; no console warnings | Conversation survived; React key warning observed | Fail |
| UI-04 | Browser | Analytics success and intercepted 500 | Charts render; user-visible error | Both passed | Pass |
| UI-05 | Browser | 375x667, 768x1024, 1440x900 overflow smoke check | No horizontal overflow | Dashboard at 375px had 94px overflow | Fail |

## Defects

### 1. Customer PATCH accepts an empty or unknown-only body — Medium

Steps:

1. Log in and create any QA customer.
2. Send PATCH /api/customers/<id> with Content-Type: application/json and body {}.
3. Repeat with body { "unknown": "x" }.

Expected: HTTP 400 with a validation error because no editable field was supplied and unknown fields are not valid input.

Actual: HTTP 200 in both cases, returning the unchanged customer.

Evidence: A18a and A18b: status:200 where the expected status was 400.

Suggested fix: validate the parsed PATCH body with a schema that rejects unknown keys and requires at least one supplied editable field before calling the service.

### 2. Dashboard navigation overflows horizontally at 375px — Medium

Steps:

1. Open the frontend at 375x667 in Chromium.
2. Log in.
3. Inspect the Dashboard document width or swipe horizontally.

Expected: no horizontal page overflow; all navigation remains reachable within the viewport.

Actual: document.documentElement.scrollWidth - window.innerWidth was 94px. The NAV measured 453px wide; the Analytics and Assistant links extended beyond the 375px viewport.

Evidence: UI-05 failed at / with Received: 94; the overflowing element was the header NAV.

Suggested fix: make the header navigation wrap or collapse at narrow breakpoints, and verify all primary links remain reachable without page-level horizontal scrolling.

### 3. Assistant renders a React missing-key console error — Low

Steps:

1. Log in and open Assistant.
2. Send What is the status of TRK-1001?.
3. Observe the browser console.

Expected: no console errors or warnings during the normal assistant flow.

Actual: React emitted Each child in a list should have a unique "key" prop, identifying AssistantPage.

Evidence: UI-03 failed with the exact console message above; the conversation itself remained usable.

Suggested fix: give each rendered assistant message a stable unique key, including locally appended user messages.

## Observations

- Customer soft delete is intentional; the unique email remains unavailable and reuse returned 409 (O01).
- Uppercase customer UUID path compatibility is not supported: a valid ID with uppercase hex returned 404, cleanly (A22b). This was recorded as an observation, not a defect.
- Tracking numbers are case-sensitive in practice: a lower-case variant of a QA tracking number was accepted as a second shipment (O02). Confirm whether business rules intend case-insensitive uniqueness.
- Delivered and Cancelled are final; same-status changes return 400; shipments have no delete route; list endpoints have no pagination; there is no rate limiting; JWT is stored in localStorage; WebSocket events broadcast to all connected clients; AI has a documented demo fallback.
- /api-docs was not included in the executed API record output; it is documented as public and was not treated as a failure.

## Not tested or blocked

No service was blocked. The following charter items were not completed within the time-box: the complete every-from/every-to shipment transition matrix; analytics PNG, BOM, empty/duplicate/unicode, and just-under/over-5MB file cases; a second-user conversation IDOR check (no user-creation route was available); UI direct protected-route/garbage-token checks, double-submit checks for every form, modal Esc/outside/focus/Tab behavior, offline/timeout simulations, two-context live-update browser flow, full back/forward coverage, keyboard-only accessibility, accessible-label audit, page titles, and a formal documentation/OpenAPI reconciliation.

## Data left behind in the dev database

All created customers were soft-deleted. Shipments cannot be deleted through the API, so these QA shipments remain by design:

```text
QA-1793429695807-parallel-shipment
QA-1793429695807-parallel-status
QA-1793429695807-primary
qa-1793429695807-primary
QA-1793429710448-abrupt-client
QA-1793429710448-malformed-frame
QA-1793429710448-rapid-order
QA-1793429710448-reconnect
QA-1793429710448-rejected-event
QA-1793429710448-thirty-clients
QA-1793429710448-two-clients
QA-1793429892039-abrupt-client
QA-1793429892039-malformed-frame
QA-1793429892039-rapid-order
QA-1793429892039-reconnect
QA-1793429892039-rejected-event
QA-1793429892039-thirty-clients
QA-1793429892039-two-clients
QA-1793429916464-parallel-shipment
QA-1793429916464-parallel-status
QA-1793429916464-primary
qa-1793429916464-primary
```

The QA chat runs also created conversations; no conversation-delete API was available, so those are retained. Seed customers and seed shipments were not modified.

## Reproduction commands and real result tails

Run from the repository root unless noted:

```text
node backend/qa/api.qa.mjs
SUMMARY executed=94 passed=89 failed=2 observations=3
SHIPMENTS_LEFT_BEHIND ["QA-1793429916464-primary","qa-1793429916464-primary","QA-1793429916464-parallel-shipment","QA-1793429916464-parallel-status"]

node backend/qa/ws.qa.mjs
SUMMARY executed=10 passed=10 failed=0
SHIPMENTS_LEFT_BEHIND ["QA-1793429892039-two-clients", ... , "QA-1793429892039-rapid-order"]

cd frontend
npx.cmd playwright test -c playwright.qa.config.ts
2 failed
3 passed (10.8s)
```

Chromium verification also ran successfully with cd frontend; npx.cmd playwright install chromium. Failure screenshots and traces are under frontend/qa-artifacts/.
