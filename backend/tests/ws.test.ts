import http from "node:http";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import WebSocket from "ws";
import { app } from "../src/app";
import { attachWebSocket } from "../src/lib/ws";

let server: Server;
let closeWebSocket: () => void;
let wsUrl: string;
let authHeader: { Authorization: string };

function listenOnRandomPort(target: Server) {
  return new Promise<number>((resolve, reject) => {
    target.once("error", reject);
    target.listen(0, "127.0.0.1", () => {
      target.off("error", reject);
      const address = target.address();
      if (!address || typeof address === "string") {
        reject(new Error("Could not determine test server port"));
        return;
      }
      resolve(address.port);
    });
  });
}

function openClient(url: string) {
  const client = new WebSocket(url);
  return new Promise<WebSocket>((resolve, reject) => {
    const timer = setTimeout(() => {
      client.close();
      reject(new Error("WebSocket did not open in time"));
    }, 3000);
    client.once("open", () => {
      clearTimeout(timer);
      resolve(client);
    });
    client.once("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function nextMessage(client: WebSocket) {
  return new Promise<{ event: string; shipmentId: string; status: string }>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("WebSocket message timed out")), 3000);
    client.once("message", (data) => {
      clearTimeout(timer);
      resolve(JSON.parse(data.toString()));
    });
    client.once("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function rejectedStatus(url: string) {
  const client = new WebSocket(url);
  return new Promise<number>((resolve, reject) => {
    const timer = setTimeout(() => {
      client.close();
      reject(new Error("Bad WebSocket token was not rejected"));
    }, 3000);
    client.once("unexpected-response", (_req, res) => {
      clearTimeout(timer);
      resolve(res.statusCode);
    });
    client.once("open", () => {
      clearTimeout(timer);
      client.close();
      reject(new Error("Bad WebSocket token was accepted"));
    });
    // The HTTP rejection is asserted through unexpected-response.
    client.once("error", () => undefined);
  });
}

beforeAll(async () => {
  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@example.com", password: "Admin@123" });
  expect(login.status).toBe(200);
  authHeader = { Authorization: `Bearer ${login.body.token}` };

  server = http.createServer(app);
  closeWebSocket = attachWebSocket(server);
  const port = await listenOnRandomPort(server);
  wsUrl = `ws://127.0.0.1:${port}/ws?token=${encodeURIComponent(login.body.token)}`;
});

afterAll(async () => {
  closeWebSocket();
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

describe("WebSocket shipment notifications", () => {
  it("broadcasts a status change to all connected clients", async () => {
    const customers = await request(app).get("/api/customers").set(authHeader);
    const created = await request(app)
      .post("/api/shipments")
      .set(authHeader)
      .send({
        trackingNumber: `WS-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        customerId: customers.body[0].id,
        origin: "Mumbai",
        destination: "Pune",
      });
    expect(created.status).toBe(201);

    const first = await openClient(wsUrl);
    const second = await openClient(wsUrl);
    const firstMessage = nextMessage(first);
    const secondMessage = nextMessage(second);

    const moved = await request(app)
      .patch(`/api/shipments/${created.body.id}/status`)
      .set(authHeader)
      .send({ status: "InTransit" });
    expect(moved.status).toBe(200);

    const expected = {
      event: "shipment_status_changed",
      shipmentId: created.body.id,
      status: "InTransit",
    };
    expect(await firstMessage).toEqual(expected);
    expect(await secondMessage).toEqual(expected);
    first.close();
    second.close();
  });

  it("returns 401 for a bad token and keeps the server alive", async () => {
    const status = await rejectedStatus(wsUrl.replace(/token=.*$/, "token=bad-token"));
    expect(status).toBe(401);

    const health = await request(app).get("/health");
    expect(health.status).toBe(200);
  });
});
