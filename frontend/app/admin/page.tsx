"use client";
import React, { useEffect, useState, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface AnalyticsData {
  total_requests: number;
  approved_requests: number;
  pending_requests: number;
  rejected_requests: number;
  escalated_requests: number;
  avg_approval_hours: number | null;
  approval_rate: number;
  rejection_rate: number;
  requests_by_type: { type: string; count: number }[];
  requests_by_dept: { dept: string; count: number }[];
  requests_over_time: { date: string; count: number }[];
}

function StatCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  icon: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 ${color} shadow-lg`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-3xl">{icon}</span>
        <span className="text-xs uppercase tracking-widest opacity-70">{label}</span>
      </div>
      <p className="text-4xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
    </div>
  );
}

function BarChart({
  data,
  label,
  colorClass,
}: {
  data: { label: string; count: number }[];
  label: string;
  colorClass: string;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-slate-400 mb-3">{label}</p>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-3">
            <span className="text-xs text-slate-400 w-32 truncate shrink-0">{d.label}</span>
            <div className="flex-1 bg-slate-800 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${colorClass}`}
                style={{ width: `${(d.count / max) * 100}%` }}
              />
            </div>
            <span className="text-xs text-slate-300 w-6 text-right">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const HEIGHT = 80;
  const W_EACH = data.length > 0 ? 100 / data.length : 100;

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-slate-400 mb-3">Requests over time</p>
      {data.length === 0 ? (
        <p className="text-slate-500 text-sm">No data yet.</p>
      ) : (
        <div className="flex items-end gap-1" style={{ height: HEIGHT }}>
          {data.map((d) => {
            const h = Math.max(4, (d.count / max) * HEIGHT);
            return (
              <div key={d.date} className="flex flex-col items-center flex-1 gap-1">
                <span className="text-[10px] text-cyan-300">{d.count}</span>
                <div
                  className="w-full rounded-t bg-gradient-to-t from-cyan-600 to-cyan-400"
                  style={{ height: h }}
                  title={`${d.date}: ${d.count}`}
                />
                <span className="text-[9px] text-slate-500 rotate-45 origin-left">
                  {d.date.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/analytics`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      setData(await res.json());
      setError("");
    } catch (e: any) {
      setError(e.message || "Unknown error");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 30_000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div
      className="min-h-screen text-slate-100 font-sans"
      style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #1a0f2e 100%)" }}
    >
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/70 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📊</span>
            <div>
              <h1 className="text-2xl font-bold text-violet-400">Campus Agent</h1>
              <p className="text-sm text-slate-400">Admin Analytics Dashboard</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={load}
              className="bg-slate-800 border border-slate-700 hover:border-violet-500/50 rounded-lg px-4 py-2 text-sm transition-all"
            >
              🔄 Refresh
            </button>
            <a
              href="/"
              className="bg-slate-800 border border-slate-700 hover:border-violet-500/50 rounded-lg px-4 py-2 text-sm transition-all"
            >
              ← Back
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading && !data && (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <span className="animate-spin mr-3 text-2xl">⟳</span> Loading analytics…
          </div>
        )}
        {error && (
          <div className="bg-rose-900/30 border border-rose-700/50 rounded-xl p-6 text-rose-300 mb-6">
            ❌ {error}
          </div>
        )}
        {data && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <StatCard
                label="Total"
                value={data.total_requests}
                icon="📋"
                color="bg-slate-900/70 border-slate-700/50 text-slate-100"
              />
              <StatCard
                label="Pending"
                value={data.pending_requests}
                icon="⏳"
                color="bg-amber-900/30 border-amber-700/50 text-amber-200"
              />
              <StatCard
                label="Approved"
                value={data.approved_requests}
                sub={`${data.approval_rate}%`}
                icon="✅"
                color="bg-emerald-900/30 border-emerald-700/50 text-emerald-200"
              />
              <StatCard
                label="Rejected"
                value={data.rejected_requests}
                sub={`${data.rejection_rate}%`}
                icon="❌"
                color="bg-rose-900/30 border-rose-700/50 text-rose-200"
              />
              <StatCard
                label="Escalated"
                value={data.escalated_requests}
                icon="🚨"
                color="bg-orange-900/30 border-orange-700/50 text-orange-200"
              />
              <StatCard
                label="Avg. Time"
                value={
                  data.avg_approval_hours != null
                    ? `${data.avg_approval_hours}h`
                    : "—"
                }
                sub="to approval"
                icon="⏱"
                color="bg-blue-900/30 border-blue-700/50 text-blue-200"
              />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* By type */}
              <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl p-6">
                <BarChart
                  label="Requests by type"
                  data={data.requests_by_type.map((d) => ({
                    label: d.type,
                    count: d.count,
                  }))}
                  colorClass="bg-gradient-to-r from-violet-500 to-purple-500"
                />
              </div>

              {/* By department */}
              <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl p-6">
                <BarChart
                  label="Requests by department"
                  data={data.requests_by_dept.map((d) => ({
                    label: d.dept,
                    count: d.count,
                  }))}
                  colorClass="bg-gradient-to-r from-cyan-500 to-blue-500"
                />
              </div>

              {/* Over time */}
              <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl p-6">
                <TimelineChart data={data.requests_over_time} />
              </div>
            </div>

            {/* Status donut (CSS-only) */}
            <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl p-6">
              <p className="text-xs uppercase tracking-widest text-slate-400 mb-4">
                Approval status breakdown
              </p>
              <div className="flex flex-wrap gap-6 items-center">
                {[
                  {
                    label: "Approved",
                    count: data.approved_requests,
                    pct: data.approval_rate,
                    color: "bg-emerald-500",
                  },
                  {
                    label: "Pending",
                    count: data.pending_requests,
                    pct: data.total_requests
                      ? Math.round((data.pending_requests / data.total_requests) * 100)
                      : 0,
                    color: "bg-amber-500",
                  },
                  {
                    label: "Rejected",
                    count: data.rejected_requests,
                    pct: data.rejection_rate,
                    color: "bg-rose-500",
                  },
                  {
                    label: "Escalated",
                    count: data.escalated_requests,
                    pct: data.total_requests
                      ? Math.round((data.escalated_requests / data.total_requests) * 100)
                      : 0,
                    color: "bg-orange-500",
                  },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${s.color}`} />
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {s.count} ({s.pct}%)
                      </p>
                      <p className="text-xs text-slate-400">{s.label}</p>
                    </div>
                  </div>
                ))}
                <div className="flex-1">
                  <div className="flex h-4 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500"
                      style={{ width: `${data.approval_rate}%` }}
                    />
                    <div
                      className="bg-amber-500"
                      style={{
                        width: `${
                          data.total_requests
                            ? (data.pending_requests / data.total_requests) * 100
                            : 0
                        }%`,
                      }}
                    />
                    <div
                      className="bg-rose-500"
                      style={{ width: `${data.rejection_rate}%` }}
                    />
                    <div className="flex-1 bg-slate-700" />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
