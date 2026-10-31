import type { ReactNode } from "react";

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({ title, onClose, children }: Props) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-[2px]" role="presentation">
      <div className="w-full max-w-md rounded-2xl border border-white/60 bg-white p-5 shadow-2xl sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
