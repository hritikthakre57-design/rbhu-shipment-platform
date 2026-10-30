import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { Shipment, ShipmentStatus } from "../types";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import ShipmentForm from "../components/ShipmentForm";
import type { ShipmentFormValues } from "../components/ShipmentForm";

const STATUSES: ShipmentStatus[] = ["Created", "InTransit", "Delivered", "Cancelled"];
const FINAL: ShipmentStatus[] = ["Delivered", "Cancelled"];

export default function ShipmentsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"" | ShipmentStatus>("");
  const [creating, setCreating] = useState(false);
  const [pageError, setPageError] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["shipments", status],
    queryFn: () => api<Shipment[]>(`/shipments${status ? `?status=${status}` : ""}`),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["shipments"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const create = useMutation({
    mutationFn: (values: ShipmentFormValues) =>
      api<Shipment>("/shipments", { method: "POST", body: values }),
    onSuccess: () => {
      refresh();
      setCreating(false);
    },
  });

  const changeStatus = useMutation({
    mutationFn: (v: { id: string; status: ShipmentStatus }) =>
      api<Shipment>(`/shipments/${v.id}/status`, { method: "PATCH", body: { status: v.status } }),
    onSuccess: () => {
      setPageError("");
      refresh();
    },
    onError: (e) => setPageError((e as Error).message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Shipments</h1>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "" | ShipmentStatus)}
            className="border rounded px-3 py-2 text-sm bg-white"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            onClick={() => setCreating(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 text-sm font-medium"
          >
            New shipment
          </button>
        </div>
      </div>

      {pageError && (
        <div className="rounded bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
          {pageError}
        </div>
      )}

      {isLoading && <p className="text-slate-500">Loading shipments...</p>}
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
                <th className="px-4 py-3">Tracking</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Update status</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    No shipments found.
                  </td>
                </tr>
              )}
              {data.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-3 font-medium text-slate-800">{s.trackingNumber}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {s.customer ? `${s.customer.name} (${s.customer.company})` : "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {s.origin} &rarr; {s.destination}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={s.status}
                      disabled={FINAL.includes(s.status) || changeStatus.isPending}
                      onChange={(e) =>
                        changeStatus.mutate({ id: s.id, status: e.target.value as ShipmentStatus })
                      }
                      className="border rounded px-2 py-1 text-sm bg-white disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <Modal title="New shipment" onClose={() => setCreating(false)}>
          <ShipmentForm
            onSubmit={(values) => create.mutateAsync(values)}
            onCancel={() => setCreating(false)}
          />
        </Modal>
      )}
    </div>
  );
}
