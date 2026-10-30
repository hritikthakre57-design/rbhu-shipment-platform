interface Props {
  label: string;
  value: number | string;
}

export default function StatCard({ label, value }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
    </div>
  );
}