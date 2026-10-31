import { createContext, useContext } from "react";

export interface ShipmentNotification {
  id: string;
  shipmentId: string;
  status: string;
  receivedAt: string;
  read: boolean;
}

interface NotificationState {
  notifications: ShipmentNotification[];
  unreadCount: number;
  markAllRead: () => void;
  clearNotifications: () => void;
}

export const NotificationContext = createContext<NotificationState | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within ShipmentEventsProvider");
  return context;
}
