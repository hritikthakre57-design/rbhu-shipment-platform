import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { Customer, CustomerStatus } from "../types";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import CustomerForm from "../components/CustomerForm";
import type { CustomerFormValues } from "../components/CustomerForm";
import Icon from "../components/Icon";

export default function CustomersPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"" | CustomerStatus>("");
  const [editing, setEditing] = useState<Customer | "new" | null>(null);
  const [pageError, setPageError] = useState("");
  const { data, isLoading, error } = useQuery({ queryKey: ["customers", status], queryFn: () => api<Customer[]>(`/customers${status ? `?status=${status}` : ""}`) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["customers"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); };
  const save = useMutation({ mutationFn: (values: CustomerFormValues) => editing && editing !== "new" ? api<Customer>(`/customers/${editing.id}`, { method: "PATCH", body: values }) : api<Customer>("/customers", { method: "POST", body: values }), onSuccess: () => { refresh(); setEditing(null); } });
  const remove = useMutation({ mutationFn: (id: string) => api<void>(`/customers/${id}`, { method: "DELETE" }), onSuccess: refresh, onError: (e) => setPageError((e as Error).message) });
  const onDelete = (c: Customer) => { if (window.confirm(`Delete customer "${c.name}"?`)) { setPageError(""); remove.mutate(c.id); } };

  return <div className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.14em] text-blue-600">Relationship management</p><h1 className="page-heading text-3xl font-extrabold text-slate-900">Customers</h1><p className="mt-2 text-sm text-slate-500">Manage the partners and businesses in your shipment network.</p></div><button onClick={() => setEditing("new")} className="btn-primary"><Icon name="plus" size={17} /> Add customer</button></div>
    <div className="surface flex flex-wrap items-center justify-between gap-4 p-4"><div className="flex items-center gap-3 text-sm font-bold text-slate-700"><span className="rounded-lg bg-blue-50 p-2 text-blue-600"><Icon name="customers" size={17} /></span>{data ? `${data.length} customers` : "Customer directory"}</div><label className="flex items-center gap-3 text-xs font-bold text-slate-500">Filter status<select aria-label="Filter customer status" value={status} onChange={(e) => setStatus(e.target.value as "" | CustomerStatus)} className="input-field w-auto min-w-36 py-2 text-sm font-semibold"><option value="">All statuses</option><option value="Active">Active</option><option value="Inactive">Inactive</option></select></label></div>
    {pageError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{pageError}</div>}
    {isLoading && <div className="surface p-8 text-sm text-slate-500">Loading customers...</div>}
    {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{(error as Error).message}</div>}
    {data && <div className="table-shell"><table className="data-table"><thead><tr><th>Name</th><th>Email</th><th>Company</th><th>Status</th><th className="text-right">Actions</th></tr></thead><tbody>{data.length === 0 && <tr><td colSpan={5}><div className="empty-state m-3">No customers found.</div></td></tr>}{data.map((c) => <tr key={c.id}><td><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-xs font-extrabold text-blue-700">{c.name.slice(0, 1).toUpperCase()}</div><span>{c.name}</span></div></td><td>{c.email}</td><td>{c.company}</td><td><StatusBadge status={c.status} /></td><td className="text-right"><button onClick={() => setEditing(c)} className="mr-4 font-bold text-blue-600 hover:text-blue-800">Edit</button><button onClick={() => onDelete(c)} className="font-bold text-rose-600 hover:text-rose-800">Delete</button></td></tr>)}</tbody></table></div>}
    {editing && <Modal title={editing === "new" ? "Add customer" : "Edit customer"} onClose={() => setEditing(null)}><CustomerForm initial={editing === "new" ? undefined : editing} onSubmit={(values) => save.mutateAsync(values)} onCancel={() => setEditing(null)} /></Modal>}
  </div>;
}
