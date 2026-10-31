import type { CustomerStatus, ShipmentStatus } from "../types";

type Status = CustomerStatus | ShipmentStatus;

export const STATUS_BADGE: Record<Status, string> = {
  Active: "bg-emerald-50 text-emerald-700",
  Inactive: "bg-slate-100 text-slate-600",
  Created: "bg-blue-50 text-blue-700",
  InTransit: "bg-amber-50 text-amber-700",
  Delivered: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-rose-50 text-rose-700",
};

export const STATUS_BAR: Record<ShipmentStatus, string> = {
  Created: "bg-blue-500",
  InTransit: "bg-amber-500",
  Delivered: "bg-green-500",
  Cancelled: "bg-red-500",
};
