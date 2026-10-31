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

const inputClass = "input-field text-sm";

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
    <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
      {serverError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {serverError}
        </div>
      )}

      <div>
        <label htmlFor="shipment-tracking" className="field-label">Tracking number</label>
        <input id="shipment-tracking" className={inputClass} placeholder="TRK-2001" {...register("trackingNumber")} />
        {errors.trackingNumber && (
          <p className="text-xs text-red-600 mt-1">{errors.trackingNumber.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="shipment-customer" className="field-label">Customer</label>
        <select id="shipment-customer" className={inputClass} {...register("customerId")}>
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
        <label htmlFor="shipment-origin" className="field-label">Origin</label>
        <input id="shipment-origin" className={inputClass} {...register("origin")} />
        {errors.origin && <p className="text-xs text-red-600 mt-1">{errors.origin.message}</p>}
      </div>

      <div>
        <label htmlFor="shipment-destination" className="field-label">Destination</label>
        <input id="shipment-destination" className={inputClass} {...register("destination")} />
        {errors.destination && (
          <p className="text-xs text-red-600 mt-1">{errors.destination.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Creating..." : "Create shipment"}
        </button>
      </div>
    </form>
  );
}
