import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import Plotly from "plotly.js-basic-dist-min";
import { api, ApiError } from "../api/client";
import StatCard from "../components/StatCard";
import type { AnalyticsResult, PlotlyFigure } from "../types";

function PlotlyChart({ figure, testId }: { figure: PlotlyFigure; testId: string }) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chartElement = chartRef.current;
    if (!chartElement) return;

    void Plotly.react(
      chartElement,
      figure.data as Plotly.Data[],
      { ...figure.layout, autosize: true } as Partial<Plotly.Layout>,
      { responsive: true, displayModeBar: false }
    );

    return () => {
      Plotly.purge(chartElement);
    };
  }, [figure]);

  return <div ref={chartRef} data-testid={testId} className="min-h-[320px] w-full" />;
}

export default function AnalyticsPage() {
  const [file, setFile] = useState<File | null>(null);
  const mutation = useMutation<AnalyticsResult, Error, File>({
    mutationFn: async (selectedFile) => {
      const formData = new FormData();
      formData.append("file", selectedFile);
      return api<AnalyticsResult>("/analytics/analyze", {
        method: "POST",
        body: formData,
      });
    },
  });

  const result = mutation.data;
  const errorMessage =
    mutation.error instanceof ApiError ? mutation.error.message : mutation.error?.message;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Sales analytics</h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload a CSV with salesperson, revenue, and region columns.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            mutation.reset();
          }}
        />
        <button
          type="button"
          disabled={!file || mutation.isPending}
          onClick={() => file && mutation.mutate(file)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {mutation.isPending ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {errorMessage && (
        <div className="rounded bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
          {errorMessage}
        </div>
      )}

      {!result && !mutation.isPending && !errorMessage && (
        <p className="text-slate-500">Choose a CSV file to see its analysis.</p>
      )}

      {result && (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Rows analyzed" value={result.summary.rowCount} />
            <StatCard label="Total revenue" value={result.summary.totalRevenue.toFixed(2)} />
            <StatCard label="Average revenue" value={result.summary.averageRevenue.toFixed(2)} />
            <StatCard label="Median revenue" value={result.summary.medianRevenue.toFixed(2)} />
            <StatCard
              label="Top salesperson"
              value={`${result.summary.topSalesperson.name} (${result.summary.topSalesperson.revenue.toFixed(2)})`}
            />
            <StatCard
              label="Top region"
              value={`${result.summary.topRegion.name} (${result.summary.topRegion.revenue.toFixed(2)})`}
            />
          </div>

          {result.warnings.length > 0 && (
            <div className="rounded bg-amber-50 border border-amber-200 text-amber-800 p-3 text-sm">
              {result.warnings.join("; ")}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="font-semibold text-slate-800 mb-3">Revenue by Region</h2>
              <PlotlyChart figure={result.charts.revenueByRegion} testId="revenue-by-region-chart" />
            </section>
            <section className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="font-semibold text-slate-800 mb-3">Top Salespeople</h2>
              <PlotlyChart figure={result.charts.topSalespeople} testId="top-salespeople-chart" />
            </section>
          </div>
        </>
      )}
    </div>
  );
}
