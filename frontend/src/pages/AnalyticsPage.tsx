import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import Plotly from "plotly.js-basic-dist-min";
import { api, ApiError } from "../api/client";
import StatCard from "../components/StatCard";
import Icon from "../components/Icon";
import type { AnalyticsResult, PlotlyFigure } from "../types";

function PlotlyChart({ figure, testId }: { figure: PlotlyFigure; testId: string }) {
  const chartRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const chartElement = chartRef.current;
    if (!chartElement) return;
    void Plotly.react(chartElement, figure.data as Plotly.Data[], { ...figure.layout, autosize: true } as Partial<Plotly.Layout>, { responsive: true, displayModeBar: false });
    return () => { Plotly.purge(chartElement); };
  }, [figure]);
  return <div ref={chartRef} data-testid={testId} className="min-h-[300px] w-full" />;
}

export default function AnalyticsPage() {
  const [file, setFile] = useState<File | null>(null);
  const mutation = useMutation<AnalyticsResult, Error, File>({ mutationFn: async (selectedFile) => { const formData = new FormData(); formData.append("file", selectedFile); return api<AnalyticsResult>("/analytics/analyze", { method: "POST", body: formData }); } });
  const result = mutation.data;
  const errorMessage = mutation.error instanceof ApiError ? mutation.error.message : mutation.error?.message;
  return <div className="space-y-7">
    <div><p className="mb-2 text-xs font-bold uppercase tracking-[.14em] text-blue-600">Business intelligence</p><h1 className="page-heading text-3xl font-extrabold text-slate-900">Sales analytics</h1><p className="mt-2 text-sm text-slate-500">Turn shipment sales data into a clear view of performance and opportunity.</p></div>
    <div className="surface overflow-hidden"><div className="flex flex-wrap items-center gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6"><div className="rounded-xl bg-blue-100 p-2.5 text-blue-700"><Icon name="analytics" size={20} /></div><div><h2 className="text-sm font-extrabold text-slate-900">Upload your sales data</h2><p className="text-xs text-slate-500">CSV files should include salesperson, revenue, and region columns.</p></div></div><div className="flex flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-center md:justify-between"><label htmlFor="analytics-file" className="flex min-h-20 flex-1 cursor-pointer items-center gap-4 rounded-xl border border-dashed border-blue-200 bg-blue-50/50 px-4 py-3 transition hover:border-blue-400 hover:bg-blue-50"><span className="rounded-lg bg-white p-2.5 text-blue-600 shadow-sm"><Icon name="upload" size={19} /></span><span className="min-w-0"><span className="block truncate text-sm font-bold text-slate-700">{file ? file.name : "Choose a CSV file"}</span><span className="mt-1 block text-xs text-slate-500">Click to browse your local files</span></span><input id="analytics-file" type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => { setFile(event.target.files?.[0] ?? null); mutation.reset(); }} /></label><button type="button" disabled={!file || mutation.isPending} onClick={() => file && mutation.mutate(file)} className="btn-primary min-h-11 md:min-w-32">{mutation.isPending ? "Analyzing..." : "Analyze"}</button></div></div>
    {errorMessage && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{errorMessage}</div>}
    {!result && !mutation.isPending && !errorMessage && <div className="empty-state"><div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Icon name="analytics" size={20} /></div><p className="font-bold text-slate-700">Your analysis will appear here</p><p className="mt-1 text-sm">Choose a CSV file to see its analysis.</p></div>}
    {result && <><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"><StatCard label="Rows analyzed" value={result.summary.rowCount} icon={<Icon name="check" size={18} />} tone="blue" /><StatCard label="Total revenue" value={result.summary.totalRevenue.toFixed(2)} icon={<Icon name="analytics" size={18} />} tone="violet" /><StatCard label="Average revenue" value={result.summary.averageRevenue.toFixed(2)} icon={<Icon name="arrow-up" size={18} />} tone="green" /><StatCard label="Median revenue" value={result.summary.medianRevenue.toFixed(2)} tone="amber" /><StatCard label="Top salesperson" value={result.summary.topSalesperson.name} tone="blue" /><StatCard label="Top region" value={result.summary.topRegion.name} tone="violet" /></div>{result.warnings.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><span className="font-bold">Data notes:</span> {result.warnings.join("; ")}</div>}<div className="grid min-w-0 gap-5 lg:grid-cols-2"><section className="surface min-w-0 overflow-hidden p-4 sm:p-5"><div className="mb-3"><h2 className="font-extrabold text-slate-900">Revenue by Region</h2><p className="mt-1 text-xs text-slate-500">Geographic revenue distribution</p></div><PlotlyChart figure={result.charts.revenueByRegion} testId="revenue-by-region-chart" /></section><section className="surface min-w-0 overflow-hidden p-4 sm:p-5"><div className="mb-3"><h2 className="font-extrabold text-slate-900">Top Salespeople</h2><p className="mt-1 text-xs text-slate-500">Revenue contribution by owner</p></div><PlotlyChart figure={result.charts.topSalespeople} testId="top-salespeople-chart" /></section></div></>}
  </div>;
}
