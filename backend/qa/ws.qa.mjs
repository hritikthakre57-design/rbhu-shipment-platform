// Run from the repository root: node backend/qa/ws.qa.mjs
import WebSocket from "ws";

const BASE = "http://localhost:4000";
const stamp = Date.now();
const prefix = `QA-${stamp}`;
const results = [];

function record(id, expected, actual, pass) {
  results.push({ id, expected, actual, pass });
  console.log(`${pass ? "PASS" : "FAIL"} ${id}: ${expected} | ${JSON.stringify(actual)}`);
}

async function request(path, token, body) {
  const response = await fetch(`${BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

function open(url) {
  const socket = new WebSocket(url);
  const messages = [];
  socket.on("message", (data, isBinary) => messages.push({ data: data.toString(), isBinary }));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("WebSocket open timeout")), 5000);
    socket.once("open", () => { clearTimeout(timer); resolve({ socket, messages }); });
    socket.once("error", (error) => { clearTimeout(timer); reject(error); });
  });
}

function rejected(url) {
  const socket = new WebSocket(url);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("expected HTTP 401")), 5000);
    socket.once("unexpected-response", (_request, response) => { clearTimeout(timer); resolve(response.statusCode); });
    socket.once("open", () => { clearTimeout(timer); socket.close(); reject(new Error("bad token accepted")); });
    socket.on("error", () => {});
  });
}

function waitForMessages(clients, count = 1) {
  return new Promise((resolve) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (clients.every((client) => client.messages.length >= count) || Date.now() - started > 5000) {
        clearInterval(timer);
        resolve();
      }
    }, 25);
  });
}

async function login() {
  const response = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "admin@example.com", password: "Admin@123" }) });
  return (await response.json()).token;
}

async function createShipment(token, suffix) {
  const customers = await request("/api/customers", token);
  const response = await fetch(`${BASE}/api/shipments`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ trackingNumber: `${prefix}-${suffix}`, customerId: customers.body[0].id, origin: `${prefix} Origin`, destination: `${prefix} Destination` }) });
  const body = await response.json();
  return { id: body.id, trackingNumber: body.trackingNumber };
}

async function changeStatus(token, id, status) {
  const response = await fetch(`${BASE}/api/shipments/${id}/status`, { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
  return { status: response.status, body: await response.json().catch(() => null) };
}

async function run() {
  const token = await login();
  const wsUrl = `ws://localhost:4000/ws?token=${encodeURIComponent(token)}`;
  const missingTokenStatus = await rejected("ws://localhost:4000/ws");
  record("C01", "missing token returns 401", missingTokenStatus, missingTokenStatus === 401);
  const badTokenStatus = await rejected("ws://localhost:4000/ws?token=bad");
  record("C02", "bad token returns 401", badTokenStatus, badTokenStatus === 401);
  const tampered = `${token.slice(0, -1)}x`;
  const tamperedTokenStatus = await rejected(`ws://localhost:4000/ws?token=${tampered}`);
  record("C03", "tampered token returns 401", tamperedTokenStatus, tamperedTokenStatus === 401);

  const twoShipment = await createShipment(token, "two-clients");
  const two = await Promise.all([open(wsUrl), open(wsUrl)]);
  const changed = await changeStatus(token, twoShipment.id, "InTransit");
  await waitForMessages(two);
  const expected = { event: "shipment_status_changed", shipmentId: twoShipment.id, status: "InTransit" };
  record("C04", "2 clients each receive exactly one exact event", two.map((client) => client.messages), changed.status === 200 && two.every((client) => client.messages.length === 1 && client.messages[0].data === JSON.stringify(expected)));
  two.forEach((client) => client.socket.close());

  const thirtyShipment = await createShipment(token, "thirty-clients");
  const thirty = await Promise.all(Array.from({ length: 30 }, () => open(wsUrl)));
  await changeStatus(token, thirtyShipment.id, "InTransit");
  await waitForMessages(thirty);
  const expectedThirty = { event: "shipment_status_changed", shipmentId: thirtyShipment.id, status: "InTransit" };
  record("C05", "30 clients each receive exactly one exact event", { counts: thirty.map((client) => client.messages.length), valid: thirty.every((client) => client.messages[0]?.data === JSON.stringify(expectedThirty)) }, thirty.every((client) => client.messages.length === 1 && client.messages[0].data === JSON.stringify(expectedThirty)));
  thirty.forEach((client) => client.socket.close());

  const rejectedShipment = await createShipment(token, "rejected-event");
  const rejectedClients = await Promise.all([open(wsUrl), open(wsUrl)]);
  const rejectedChange = await changeStatus(token, rejectedShipment.id, "Created");
  await new Promise((resolve) => setTimeout(resolve, 300));
  record("C06", "rejected same-status change produces no event", { status: rejectedChange.status, messages: rejectedClients.map((client) => client.messages.length) }, rejectedChange.status === 400 && rejectedClients.every((client) => client.messages.length === 0));
  rejectedClients.forEach((client) => client.socket.close());

  const abruptShipment = await createShipment(token, "abrupt-client");
  const abrupt = await Promise.all([open(wsUrl), open(wsUrl)]);
  abrupt[0].socket.terminate();
  await changeStatus(token, abruptShipment.id, "InTransit");
  await waitForMessages([abrupt[1]]);
  record("C07", "abrupt disconnect does not affect another client", abrupt[1].messages, abrupt[1].messages.length === 1);
  abrupt[1].socket.close();

  const malformedShipment = await createShipment(token, "malformed-frame");
  const malformed = await Promise.all([open(wsUrl), open(wsUrl)]);
  malformed[0].socket.send("not-json");
  malformed[0].socket.send(Buffer.alloc(1024));
  malformed[0].socket.send("x".repeat(1024 * 1024));
  await changeStatus(token, malformedShipment.id, "InTransit");
  await waitForMessages([malformed[1]]);
  record("C08", "malformed, binary and large frames do not disconnect others", { messages: malformed[1].messages.length, open: malformed[1].socket.readyState }, malformed[1].messages.length === 1 && malformed[1].socket.readyState === WebSocket.OPEN);
  malformed.forEach((client) => client.socket.close());

  const reconnectShipment = await createShipment(token, "reconnect");
  const reconnectClient = await open(wsUrl);
  reconnectClient.socket.close();
  const reconnected = await open(wsUrl);
  await changeStatus(token, reconnectShipment.id, "InTransit");
  await waitForMessages([reconnected]);
  record("C09", "a new authenticated connection receives events after reconnect", reconnected.messages, reconnected.messages.length === 1);
  reconnected.socket.close();

  const rapidShipment = await createShipment(token, "rapid-order");
  const rapid = await open(wsUrl);
  await changeStatus(token, rapidShipment.id, "InTransit");
  await changeStatus(token, rapidShipment.id, "Delivered");
  await waitForMessages([rapid], 2);
  const rapidEvents = rapid.messages.map((message) => JSON.parse(message.data));
  record("C10", "rapid events arrive in order", rapidEvents, rapidEvents.length === 2 && rapidEvents[0].status === "InTransit" && rapidEvents[1].status === "Delivered");
  rapid.socket.close();

  const failures = results.filter((item) => !item.pass);
  console.log(`\nSUMMARY executed=${results.length} passed=${results.length - failures.length} failed=${failures.length}`);
  console.log(`SHIPMENTS_LEFT_BEHIND ${JSON.stringify([twoShipment.trackingNumber, thirtyShipment.trackingNumber, rejectedShipment.trackingNumber, abruptShipment.trackingNumber, malformedShipment.trackingNumber, reconnectShipment.trackingNumber, rapidShipment.trackingNumber])}`);
  if (failures.length) process.exitCode = 1;
}

run().catch((error) => { console.error(`QA WebSocket runner aborted: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 2; });
