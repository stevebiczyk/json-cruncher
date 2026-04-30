"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { NumericMetric, ProcessedData } from "@/lib/types/data.types";

interface DataVisualizerProps {
  data: ProcessedData | null;
  isBusy: boolean;
}

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en", {
    notation: Math.abs(value) >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(value) < 10 ? 2 : 0,
  }).format(value);

const formatBytes = (bytes: number) =>
  new Intl.NumberFormat("en", {
    maximumFractionDigits: 1,
  }).format(bytes / 1024 / 1024);

function EmptyState({ isBusy }: { isBusy: boolean }) {
  return (
    <div className="mx-auto flex min-h-80 w-full max-w-6xl items-center justify-center px-5 py-10 lg:px-8">
      <div className="w-full rounded-lg border border-slate-200 bg-white p-8 text-center">
        <p className="text-lg font-semibold text-slate-950">
          {isBusy ? "Crunching data" : "No file analyzed yet"}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          {isBusy
            ? "The worker is parsing and summarizing the JSON file."
            : "Results will appear here after upload."}
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className={`mb-4 h-1.5 w-10 rounded-full ${accent}`} />
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function NumericTable({ metrics }: { metrics: NumericMetric[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-950">Numeric Fields</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Field</th>
              <th className="px-5 py-3 font-medium">Count</th>
              <th className="px-5 py-3 font-medium">Sum</th>
              <th className="px-5 py-3 font-medium">Average</th>
              <th className="px-5 py-3 font-medium">Min</th>
              <th className="px-5 py-3 font-medium">Max</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {metrics.map((metric) => (
              <tr key={metric.field}>
                <td className="px-5 py-3 font-medium text-slate-950">
                  {metric.field}
                </td>
                <td className="px-5 py-3">{formatNumber(metric.count)}</td>
                <td className="px-5 py-3">{formatNumber(metric.sum)}</td>
                <td className="px-5 py-3">{formatNumber(metric.average)}</td>
                <td className="px-5 py-3">{formatNumber(metric.min)}</td>
                <td className="px-5 py-3">{formatNumber(metric.max)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DataVisualizer({ data, isBusy }: DataVisualizerProps) {
  if (!data) {
    return <EmptyState isBusy={isBusy} />;
  }

  const fieldBreakdown = [
    { name: "Numeric", count: data.numericFieldCount },
    { name: "Text", count: data.stringFieldCount },
    { name: "Boolean", count: data.booleanFieldCount },
    { name: "Empty", count: data.nullishFieldCount },
  ].filter((item) => item.count > 0);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 lg:px-8">
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-slate-500">{data.fileName}</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            Analysis Results
          </h2>
        </div>
        <p className="text-sm text-slate-500">
          {formatBytes(data.fileSizeBytes)} MB · {data.sourceShape} ·{" "}
          {data.processingTimeMs} ms
        </p>
      </div>

      {data.warnings.length > 0 ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {data.warnings.join(" ")}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Records"
          value={formatNumber(data.totalRecords)}
          accent="bg-emerald-500"
        />
        <MetricCard
          label="Fields Scanned"
          value={formatNumber(data.totalFields)}
          accent="bg-sky-500"
        />
        <MetricCard
          label="Numeric Fields"
          value={formatNumber(data.numericMetrics.length)}
          accent="bg-amber-500"
        />
        <MetricCard
          label="Processing Time"
          value={`${formatNumber(data.processingTimeMs)} ms`}
          accent="bg-rose-500"
        />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-950">
              {data.primaryNumericField
                ? `${data.primaryNumericField} Distribution`
                : "Numeric Distribution"}
            </h2>
          </div>
          <div className="h-80">
            {data.histogram.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.histogram}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#475569", fontSize: 12 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis tick={{ fill: "#475569", fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                No numeric values found.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-950">
              {data.primaryCategoryField
                ? `Top ${data.primaryCategoryField} Values`
                : "Top Values"}
            </h2>
          </div>
          <div className="h-80">
            {data.topItems.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topItems} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#475569", fontSize: 12 }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={110}
                    tick={{ fill: "#475569", fontSize: 12 }}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0ea5e9" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                No repeated values found.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-950">Field Mix</h2>
          <div className="mt-5 space-y-4">
            {fieldBreakdown.map((field) => (
              <div key={field.name}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{field.name}</span>
                  <span className="text-slate-500">{formatNumber(field.count)}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-slate-800"
                    style={{
                      width: `${Math.max(
                        4,
                        (field.count / Math.max(1, data.totalFields)) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <NumericTable metrics={data.numericMetrics} />
      </section>
    </main>
  );
}
