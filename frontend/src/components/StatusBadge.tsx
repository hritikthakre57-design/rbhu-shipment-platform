import type { CustomerStatus, ShipmentStatus } from "../types";
import { STATUS_BADGE } from "./statusStyles";

type Status = CustomerStatus | ShipmentStatus;

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[status]}`}>
      {status}
    </span>
  );
}
