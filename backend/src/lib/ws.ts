import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { verify } from "jsonwebtoken";
import { env } from "../config/env";
import { logger } from "./logger";
import { appEvents, type ShipmentStatusChangedEvent } from "./events";

type AliveSocket = WebSocket & { isAlive?: boolean };

export function attachWebSocket(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  // Reject bad connections BEFORE the upgrade: /ws?token=<jwt>
  server.on("upgrade", (req, socket, head) => {
    // A client can disconnect while the handshake is being checked. Keep that
    // socket error from becoming an uncaught process-level error.
    socket.on("error", (err) => logger.warn({ err }, "ws upgrade socket error"));

    let url: URL;
    try {
      url = new URL(req.url ?? "", "http://localhost");
    } catch {
      socket.destroy();
      return;
    }
    if (url.pathname !== "/ws") {
      socket.destroy();
      return;
    }
    try {
      verify(url.searchParams.get("token") ?? "", env.JWT_SECRET);
    } catch {
      socket.end("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
      return;
    }

    try {
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
    } catch (err) {
      logger.warn({ err }, "ws upgrade failed");
      socket.destroy();
    }
  });

  wss.on("connection", (ws: AliveSocket) => {
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });
    ws.on("error", (err) => logger.warn({ err }, "ws client error"));
    logger.info({ clients: wss.clients.size }, "ws client connected");
  });

  // Heartbeat: drop clients that stopped answering pings
  const heartbeat = setInterval(() => {
    wss.clients.forEach((client) => {
      const c = client as AliveSocket;
      if (c.isAlive === false) {
        c.terminate();
        return;
      }
      c.isAlive = false;
      try {
        c.ping();
      } catch (err) {
        logger.warn({ err }, "ws heartbeat failed");
        c.terminate();
      }
    });
  }, 30000);

  // The service emits this AFTER the DB update; we only broadcast it
  const onStatusChanged = (evt: ShipmentStatusChangedEvent) => {
    const message = JSON.stringify({
      event: "shipment_status_changed",
      shipmentId: evt.shipmentId,
      status: evt.status,
    });
    wss.clients.forEach((client) => {
      if (client.readyState !== WebSocket.OPEN) return;
      try {
        client.send(message);
      } catch (err) {
        logger.warn({ err }, "ws broadcast failed");
      }
    });
    logger.info({ shipmentId: evt.shipmentId, status: evt.status }, "ws broadcast");
  };
  appEvents.on("shipment_status_changed", onStatusChanged);

  return function closeWebSocket() {
    clearInterval(heartbeat);
    appEvents.off("shipment_status_changed", onStatusChanged);
    wss.clients.forEach((client) => client.terminate());
    wss.close();
  };
}
