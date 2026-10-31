import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import Icon from "../components/Icon";

const schema = z.object({ email: z.string().trim().email("Enter a valid email"), password: z.string().min(1, "Password is required") });
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "admin@example.com", password: "" } });
  if (user) return <Navigate to="/" replace />;
  const onSubmit = async (values: FormValues) => { setServerError(""); try { await login(values.email, values.password); navigate("/", { replace: true }); } catch (e) { setServerError((e as Error).message); } };

  return <div className="flex min-h-screen bg-[#101827]">
    <div className="relative hidden flex-1 overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16"><div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(48,92,210,.55),transparent_32%),radial-gradient(circle_at_80%_80%,rgba(22,132,170,.2),transparent_35%)]" /><div className="relative"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white"><Icon name="package" size={24} /></div><div><p className="font-extrabold text-white">Shipflow</p><p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Operations</p></div></div><div className="mt-28 max-w-xl"><p className="mb-4 text-xs font-bold uppercase tracking-[.18em] text-blue-300">Modern logistics intelligence</p><h1 className="text-5xl font-extrabold leading-[1.08] tracking-[-.04em] text-white xl:text-6xl">Move every shipment with confidence.</h1><p className="mt-6 max-w-md text-base leading-7 text-slate-300">A focused command center for the teams moving your business forward.</p></div></div><div className="relative flex items-center gap-3 text-xs font-semibold text-slate-400"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Secure workspace for logistics teams</div></div>
    <div className="flex w-full items-center justify-center bg-[#f5f7fb] px-5 py-10 sm:px-8 lg:max-w-[540px] lg:px-14"><div className="w-full max-w-sm"><div className="mb-8 flex items-center gap-3 lg:hidden"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white"><Icon name="package" size={21} /></div><div><p className="font-extrabold text-slate-900">Shipflow</p><p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Operations</p></div></div><div className="mb-8"><p className="mb-2 text-xs font-bold uppercase tracking-[.14em] text-blue-600">Welcome back</p><h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Sign in to your workspace</h1><p className="mt-2 text-sm text-slate-500">Continue managing your shipment network.</p></div><form onSubmit={handleSubmit(onSubmit)} className="surface space-y-5 p-6 sm:p-8" noValidate>{serverError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{serverError}</div>}<div><label htmlFor="login-email" className="field-label">Email address</label><input id="login-email" type="email" className="input-field" {...register("email")} />{errors.email && <p className="mt-1.5 text-xs font-semibold text-rose-600">{errors.email.message}</p>}</div><div><label htmlFor="login-password" className="field-label">Password</label><input id="login-password" type="password" className="input-field" {...register("password")} />{errors.password && <p className="mt-1.5 text-xs font-semibold text-rose-600">{errors.password.message}</p>}</div><button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">{isSubmitting ? "Signing in..." : "Sign in"}<Icon name="arrow-right" size={16} /></button></form><p className="mt-6 text-center text-xs text-slate-400">Shipment operations workspace · Admin access</p></div></div>
  </div>;
}
