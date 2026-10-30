import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api, ApiError } from "../api/client";
import type { Customer } from "../types";

const schema = z.object({
  trackingNumber: z.string().trim().min(3, "Tracking number needs at least 3 characters").max(50),
  customerId: z.string().min(1, "Select a customer"),
  origin: z.string().trim().min(1, "Origin is required").max(100),
  destination: z.string().trim().min(1, "Destination is required").max(100),
});

export type ShipmentFormValues = z.infer<typeof schema>;

interface Props {
  onSubmit: (values: ShipmentFormValues) => Promise<unknown>;
  onCancel: () => void;
}

const inputClass = "w-full border rounded px-3 py-2 text-sm";

export default function ShipmentForm({ onSubmit, onCancel }: Props) {
  const [serverError, setServerError] = useState("");

  const customers = useQuery({
    queryKey: ["customers", "Active"],
    queryFn: () => api<Customer[]>("/customers?status=Active"),
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ShipmentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { trackingNumber: "", customerId: "", origin: "", destination: "" },
  });

  const submit = async (values: ShipmentFormValues) => {
    setServerError("");
    try {
      await onSubmit(values);
    } catch (e) {
      if (e instanceof ApiError && e.details?.length) {
        for (const d of e.details) {
          if (d.field in values) {
            setError(d.field as keyof ShipmentFormValues, { message: d.message });
          }
        }
      }
      setServerError((e as Error).message);
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      {serverError && (
        <div className="rounded bg-red-50 border border-red-200 text-red-700 text-sm p-2">
          {serverError}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Tracking number</label>
        <input className={inputClass} placeholder="TRK-2001" {...register("trackingNumber")} />
        {errors.trackingNumber && (
          <p className="text-xs text-red-600 mt-1">{errors.trackingNumber.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Customer</label>
        <select className={inputClass} {...register("customerId")}>
          <option value="">
            {customers.isLoading ? "Loading customers..." : "Select a customer"}
          </option>
          {customers.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.company})
            </option>
          ))}
        </select>
        {customers.error && (
          <p className="text-xs text-red-600 mt-1">Could not load customers</p>
        )}
        {errors.customerId && (
          <p className="text-xs text-red-600 mt-1">{errors.customerId.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Origin</label>
        <input className={inputClass} {...register("origin")} />
        {errors.origin && <p className="text-xs text-red-600 mt-1">{errors.origin.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Destination</label>
        <input className={inputClass} {...register("destination")} />
        {errors.destination && (
          <p className="text-xs text-red-600 mt-1">{errors.destination.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded border text-slate-700 hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
        >
          {isSubmitting ? "Creating..." : "Create shipment"}
        </button>
      </div>
    </form>
  );
}
