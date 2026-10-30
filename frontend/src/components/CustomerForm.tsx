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

const inputClass = "w-full border rounded px-3 py-2 text-sm";

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
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      {serverError && (
        <div className="rounded bg-red-50 border border-red-200 text-red-700 text-sm p-2">
          {serverError}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
        <input className={inputClass} {...register("name")} />
        {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <input type="email" className={inputClass} {...register("email")} />
        {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
        <input className={inputClass} {...register("company")} />
        {errors.company && <p className="text-xs text-red-600 mt-1">{errors.company.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
        <select className={inputClass} {...register("status")}>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
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
          {isSubmitting ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
