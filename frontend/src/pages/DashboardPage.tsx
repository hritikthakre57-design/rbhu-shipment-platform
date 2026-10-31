import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { DashboardStats, ShipmentStatus } from "../types";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import Icon from "../components/Icon";
import { STATUS_BAR } from "../components/statusStyles";

const ORDER: ShipmentStatus[] = ["Created", "InTransit", "Delivered", "Cancelled"];

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardStats>("/dashboard"),
  });

  if (isLoading) return <div className="surface p-8 text-sm text-slate-500">Loading dashboard...</div>;
  if (error || !data) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{(error as Error)?.message ?? "Could not load the dashboard"}</div>;

  const total = data.totalShipments || 1;
  const liveStatuses = [
    { label: "In transit", value: data.byStatus.InTransit ?? 0, icon: <Icon name="truck" size={18} />, tone: "amber" as const },
    { label: "Delivered", value: data.byStatus.Delivered ?? 0, icon: <Icon name="check" size={18} />, tone: "green" as const },
  ];

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-xs font-bold uppercase tracking-[.14em] text-blue-600">Operations overview</p><h1 className="page-heading text-3xl font-extrabold text-slate-900 sm:text-4xl">Dashboard</h1><p className="mt-2 text-sm text-slate-500">Monitor your shipment network and customer activity.</p></div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Live platform data</div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total customers" value={data.totalCustomers} icon={<Icon name="users" size={19} />} tone="blue" />
        <StatCard label="Total shipments" value={data.totalShipments} icon={<Icon name="package" size={19} />} tone="violet" />
        {liveStatuses.map((stat) => <StatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} tone={stat.tone} />)}
      </div>

      <section className="surface overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div><h2 className="text-base font-extrabold text-slate-900">Shipment status distribution</h2><p className="mt-1 text-sm text-slate-500">A live view of your current shipment pipeline.</p></div>
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">{data.totalShipments} shipments</div>
        </div>
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_260px] lg:items-center">
          <div className="space-y-5">
            {ORDER.map((status) => {
              const count = data.byStatus[status] ?? 0;
              return <div key={status}><div className="mb-2 flex items-center justify-between gap-4"><div className="flex items-center gap-2"><StatusBadge status={status} /><span className="text-xs text-slate-400">{Math.round((count / total) * 100)}%</span></div><span className="text-sm font-extrabold text-slate-800">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${STATUS_BAR[status]} transition-all`} style={{ width: `${(count / total) * 100}%` }} /></div></div>;
            })}
          </div>
          <div className="surface-muted p-5"><p className="text-xs font-bold uppercase tracking-[.1em] text-slate-500">Pipeline health</p><p className="mt-3 text-3xl font-extrabold text-slate-900">{Math.round(((data.byStatus.Delivered ?? 0) / total) * 100)}%</p><p className="mt-1 text-sm text-slate-500">of shipments delivered</p><div className="mt-5 flex items-center gap-2 text-xs font-bold text-emerald-700"><span className="rounded-full bg-emerald-100 p-1"><Icon name="arrow-up" size={12} /></span> Keep your network moving</div></div>
        </div>
      </section>
    </div>
  );
}
