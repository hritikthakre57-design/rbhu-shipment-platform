import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { Shipment, ShipmentStatus } from "../types";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import ShipmentForm from "../components/ShipmentForm";
import type { ShipmentFormValues } from "../components/ShipmentForm";
import Icon from "../components/Icon";

const STATUSES: ShipmentStatus[] = ["Created", "InTransit", "Delivered", "Cancelled"];
const FINAL: ShipmentStatus[] = ["Delivered", "Cancelled"];

export default function ShipmentsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"" | ShipmentStatus>("");
  const [creating, setCreating] = useState(false);
  const [pageError, setPageError] = useState("");
  const { data, isLoading, error } = useQuery({ queryKey: ["shipments", status], queryFn: () => api<Shipment[]>(`/shipments${status ? `?status=${status}` : ""}`) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["shipments"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); };
  const create = useMutation({ mutationFn: (values: ShipmentFormValues) => api<Shipment>("/shipments", { method: "POST", body: values }), onSuccess: () => { refresh(); setCreating(false); } });
  const changeStatus = useMutation({ mutationFn: (v: { id: string; status: ShipmentStatus }) => api<Shipment>(`/shipments/${v.id}/status`, { method: "PATCH", body: { status: v.status } }), onSuccess: () => { setPageError(""); refresh(); }, onError: (e) => setPageError((e as Error).message) });

  return <div className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.14em] text-blue-600">Logistics control center</p><h1 className="page-heading text-3xl font-extrabold text-slate-900">Shipments</h1><p className="mt-2 text-sm text-slate-500">Track every movement from origin to final delivery.</p></div><button onClick={() => setCreating(true)} className="btn-primary"><Icon name="plus" size={17} /> New shipment</button></div>
    <div className="surface flex flex-wrap items-center justify-between gap-4 p-4"><div className="flex items-center gap-3 text-sm font-bold text-slate-700"><span className="rounded-lg bg-violet-50 p-2 text-violet-600"><Icon name="shipments" size={17} /></span>{data ? `${data.length} shipments` : "Shipment register"}</div><label className="flex items-center gap-3 text-xs font-bold text-slate-500">Filter status<select aria-label="Filter shipment status" value={status} onChange={(e) => setStatus(e.target.value as "" | ShipmentStatus)} className="input-field w-auto min-w-36 py-2 text-sm font-semibold"><option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></label></div>
    {pageError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{pageError}</div>}
    {isLoading && <div className="surface p-8 text-sm text-slate-500">Loading shipments...</div>}
    {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{(error as Error).message}</div>}
    {data && <div className="table-shell"><table className="data-table"><thead><tr><th>Tracking</th><th>Customer</th><th>Route</th><th>Status</th><th>Update status</th></tr></thead><tbody>{data.length === 0 && <tr><td colSpan={5}><div className="empty-state m-3">No shipments found.</div></td></tr>}{data.map((s) => <tr key={s.id}><td><div className="flex items-center gap-3"><div className="rounded-lg bg-slate-100 p-2 text-slate-500"><Icon name="package" size={16} /></div><span className="font-extrabold tracking-tight text-slate-900">{s.trackingNumber}</span></div></td><td>{s.customer ? <div><p className="font-bold text-slate-700">{s.customer.name}</p><p className="mt-0.5 text-xs text-slate-400">{s.customer.company}</p></div> : "-"}</td><td><span className="whitespace-nowrap text-slate-600">{s.origin} <span className="px-1 text-slate-300">→</span> {s.destination}</span></td><td><StatusBadge status={s.status} /></td><td><select aria-label={`Update status for ${s.trackingNumber}`} value={s.status} disabled={FINAL.includes(s.status) || changeStatus.isPending} onChange={(e) => changeStatus.mutate({ id: s.id, status: e.target.value as ShipmentStatus })} className="input-field w-auto min-w-32 py-2 text-xs font-bold disabled:bg-slate-100 disabled:text-slate-400">{STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}</select></td></tr>)}</tbody></table></div>}
    {creating && <Modal title="New shipment" onClose={() => setCreating(false)}><ShipmentForm onSubmit={(values) => create.mutateAsync(values)} onCancel={() => setCreating(false)} /></Modal>}
  </div>;
}
