import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { tokenStore } from "../api/client";
import { useAuth } from "../context/useAuth";

interface ShipmentStatusChangedEvent {
  event: "shipment_status_changed";
  shipmentId: string;
  status: string;
}

export default function ShipmentEventsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;

    const token = tokenStore.get();
    if (!token) return;

    let stopped = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    const connect = () => {
      if (stopped) return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(
        `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`
      );

      socket.onopen = () => {
        attempt = 0;
      };

      socket.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data) as ShipmentStatusChangedEvent;
          if (event.event !== "shipment_status_changed") return;

          queryClient.invalidateQueries({ queryKey: ["shipments"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          setToast(`Shipment ${event.shipmentId} is now ${event.status}`);
          if (toastTimer.current) clearTimeout(toastTimer.current);
          toastTimer.current = setTimeout(() => setToast(null), 3000);
        } catch {
          // Ignore malformed messages so one event cannot break the connection.
        }
      };

      socket.onerror = () => socket?.close();
      socket.onclose = () => {
        if (stopped) return;
        const delay = Math.min(500 * 2 ** attempt, 10000);
        attempt += 1;
        reconnectTimer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      socket?.close();
    };
  }, [queryClient, user]);

  return (
    <>
      {children}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded bg-slate-800 px-4 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}
