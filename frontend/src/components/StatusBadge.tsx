import type { CustomerStatus, ShipmentStatus } from "../types";
import { STATUS_BADGE } from "./statusStyles";

type Status = CustomerStatus | ShipmentStatus;

export default function StatusBadge({ status }: { status: Status }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_BADGE[status]}`}><span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />{status}</span>;
}
