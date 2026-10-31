import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ApiError } from "../api/client";
import type { Customer } from "../types";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email"),
  company: z.string().trim().min(1, "Company is required").max(100),
  status: z.enum(["Active", "Inactive"]),
});

export type CustomerFormValues = z.infer<typeof schema>;

interface Props {
  initial?: Customer;
  onSubmit: (values: CustomerFormValues) => Promise<unknown>;
  onCancel: () => void;
}

const inputClass = "input-field text-sm";

export default function CustomerForm({ initial, onSubmit, onCancel }: Props) {
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      email: initial?.email ?? "",
      company: initial?.company ?? "",
      status: initial?.status ?? "Active",
    },
  });

  const submit = async (values: CustomerFormValues) => {
    setServerError("");
    try {
      await onSubmit(values);
    } catch (e) {
      if (e instanceof ApiError && e.details?.length) {
        for (const d of e.details) {
          if (d.field in values) {
            setError(d.field as keyof CustomerFormValues, { message: d.message });
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
        <label htmlFor="customer-name" className="field-label">Name</label>
        <input id="customer-name" className={inputClass} {...register("name")} />
        {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="customer-email" className="field-label">Email</label>
        <input id="customer-email" type="email" className={inputClass} {...register("email")} />
        {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="customer-company" className="field-label">Company</label>
        <input id="customer-company" className={inputClass} {...register("company")} />
        {errors.company && <p className="text-xs text-red-600 mt-1">{errors.company.message}</p>}
      </div>

      <div>
        <label htmlFor="customer-status" className="field-label">Status</label>
        <select id="customer-status" className={inputClass} {...register("status")}>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
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
          {isSubmitting ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
