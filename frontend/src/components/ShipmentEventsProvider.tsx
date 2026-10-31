import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { tokenStore } from "../api/client";
import { useAuth } from "../context/useAuth";
import { NotificationContext, type ShipmentNotification } from "../context/NotificationContext";
import type { AuthUser } from "../types";

interface ShipmentStatusChangedEvent {
  event: "shipment_status_changed";
  shipmentId: string;
  status: string;
}

export default function ShipmentEventsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return <ShipmentEventsSession key={user?.id ?? "logged-out"} user={user}>{children}</ShipmentEventsSession>;
}

function ShipmentEventsSession({ children, user }: { children: ReactNode; user: AuthUser | null }) {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<ShipmentNotification[]>([]);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notificationState = useMemo(() => ({
    notifications,
    unreadCount: notifications.filter((notification) => !notification.read).length,
    markAllRead: () => setNotifications((current) => current.map((notification) => ({ ...notification, read: true }))),
    clearNotifications: () => setNotifications([]),
  }), [notifications]);

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

          setNotifications((current) => [
            {
              id: `${event.shipmentId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              shipmentId: event.shipmentId,
              status: event.status,
              receivedAt: new Date().toISOString(),
              read: false,
            },
            ...current,
          ].slice(0, 20));
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
    <NotificationContext.Provider value={notificationState}>
      {children}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded bg-slate-800 px-4 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </NotificationContext.Provider>
  );
}
