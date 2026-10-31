interface Props {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  tone?: "blue" | "violet" | "amber" | "green";
}

export default function StatCard({ label, value, icon, tone = "blue" }: Props) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    violet: "bg-violet-50 text-violet-700",
    amber: "bg-amber-50 text-amber-700",
    green: "bg-emerald-50 text-emerald-700",
  };

  return (
    <div className="surface relative p-5 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[.08em] text-slate-500">{label}</p>
      {icon && <div className={`absolute right-5 top-5 rounded-xl p-2.5 ${tones[tone]}`}>{icon}</div>}
      <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 text-xs text-slate-400">Updated from live platform data</p>
    </div>
  );
}
