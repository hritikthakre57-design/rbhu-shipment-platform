import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { DashboardStats, ShipmentStatus } from "../types";
import StatCard from "../components/StatCard";
import { STATUS_BAR } from "../components/statusStyles";

const ORDER: ShipmentStatus[] = ["Created", "InTransit", "Delivered", "Cancelled"];

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardStats>("/dashboard"),
  });

  if (isLoading) return <p className="text-slate-500">Loading dashboard...</p>;
  if (error || !data) {
    return (
      <div className="rounded bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
        {(error as Error)?.message ?? "Could not load the dashboard"}
      </div>
    );
  }

  const total = data.totalShipments || 1;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <StatCard label="Total customers" value={data.totalCustomers} />
        <StatCard label="Total shipments" value={data.totalShipments} />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Shipment status distribution</h2>
        <div className="space-y-3">
          {ORDER.map((status) => {
            const count = data.byStatus[status] ?? 0;
            return (
              <div key={status}>
                <div className="flex justify-between text-sm text-slate-600 mb-1">
                  <span>{status}</span>
                  <span>{count}</span>
                </div>
                <div className="h-3 bg-slate-100 rounded">
                  <div
                    className={`h-3 rounded ${STATUS_BAR[status]}`}
                    style={{ width: `${(count / total) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
