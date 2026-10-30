import type { CustomerStatus, ShipmentStatus } from "../types";

type Status = CustomerStatus | ShipmentStatus;

export const STATUS_BADGE: Record<Status, string> = {
  Active: "bg-green-100 text-green-700",
  Inactive: "bg-slate-200 text-slate-600",
  Created: "bg-blue-100 text-blue-700",
  InTransit: "bg-amber-100 text-amber-700",
  Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
};

export const STATUS_BAR: Record<ShipmentStatus, string> = {
  Created: "bg-blue-500",
  InTransit: "bg-amber-500",
  Delivered: "bg-green-500",
  Cancelled: "bg-red-500",
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[status]}`}>
      {status}
    </span>
  );
}