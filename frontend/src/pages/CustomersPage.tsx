import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { Customer, CustomerStatus } from "../types";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import CustomerForm from "../components/CustomerForm";
import type { CustomerFormValues } from "../components/CustomerForm";

export default function CustomersPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"" | CustomerStatus>("");
  const [editing, setEditing] = useState<Customer | "new" | null>(null);
  const [pageError, setPageError] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["customers", status],
    queryFn: () => api<Customer[]>(`/customers${status ? `?status=${status}` : ""}`),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["customers"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const save = useMutation({
    mutationFn: (values: CustomerFormValues) =>
      editing && editing !== "new"
        ? api<Customer>(`/customers/${editing.id}`, { method: "PATCH", body: values })
        : api<Customer>("/customers", { method: "POST", body: values }),
    onSuccess: () => {
      refresh();
      setEditing(null);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api<void>(`/customers/${id}`, { method: "DELETE" }),
    onSuccess: refresh,
    onError: (e) => setPageError((e as Error).message),
  });

  const onDelete = (c: Customer) => {
    if (window.confirm(`Delete customer "${c.name}"?`)) {
      setPageError("");
      remove.mutate(c.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "" | CustomerStatus)}
            className="border rounded px-3 py-2 text-sm bg-white"
          >
            <option value="">All statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <button
            onClick={() => setEditing("new")}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 text-sm font-medium"
          >
            Add customer
          </button>
        </div>
      </div>

      {pageError && (
        <div className="rounded bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
          {pageError}
        </div>
      )}

      {isLoading && <p className="text-slate-500">Loading customers...</p>}
      {error && (
        <div className="rounded bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
          {(error as Error).message}
        </div>
      )}

      {data && (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    No customers found.
                  </td>
                </tr>
              )}
              {data.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-3 text-slate-600">{c.email}</td>
                  <td className="px-4 py-3 text-slate-600">{c.company}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => setEditing(c)}
                      className="text-blue-600 hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button onClick={() => onDelete(c)} className="text-red-600 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal
          title={editing === "new" ? "Add customer" : "Edit customer"}
          onClose={() => setEditing(null)}
        >
          <CustomerForm
            initial={editing === "new" ? undefined : editing}
            onSubmit={(values) => save.mutateAsync(values)}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  );
}
