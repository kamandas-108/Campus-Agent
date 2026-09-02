"use client";
import React, { useEffect, useState, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const USER_STORAGE_KEY = "campus_agent_user";

interface RequestItem {
  id: string;
  thread_id: string;
  query: string;
  operation?: string;
  status: string;
  created_at: string;
  approved_at?: string;
  reminder_sent?: boolean;
  escalated?: boolean;
  result?: string;
  student_department?: string;
  assigned_faculty_name?: string;
  documents?: { id: string; filename: string; download_url: string }[];
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  const cls =
    s === "APPROVED"
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
      : s === "REJECTED"
      ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
      : "bg-amber-500/20 text-amber-300 border-amber-500/30";
  const icon = s === "APPROVED" ? "✅" : s === "REJECTED" ? "❌" : "⏳";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${cls}`}
    >
      {icon} {s.charAt(0) + s.slice(1).toLowerCase()}
    </span>
  );
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function HistoryPage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [email, setEmail] = useState("");

  const load = useCallback(async (studentEmail: string) => {
    if (!studentEmail) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/api/requests/my?student_email=${encodeURIComponent(studentEmail)}`
      );
      if (!res.ok) throw new Error("Failed to fetch request history");
      const data = await res.json();
      setRequests(data.requests || []);
      setError("");
    } catch (e: any) {
      setError(e.message || "Unknown error");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(USER_STORAGE_KEY);
      if (saved) {
        const user = JSON.parse(saved);
        if (user?.email) {
          setEmail(user.email);
          void load(user.email);
        }
      }
    } catch {
      setError("Could not read session. Please log in again.");
      setLoading(false);
    }
  }, [load]);

  const downloadPdf = async (threadId: string) => {
    try {
      const res = await fetch(`${API}/api/requests/${threadId}/pdf`);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(err?.detail || "PDF generation failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `approval-${threadId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Could not download PDF");
    }
  };

  const visible = requests.filter((r) => {
    if (filter === "all") return true;
    return r.status.toLowerCase() === filter;
  });

  return (
    <div
      className="min-h-screen text-slate-100 font-sans"
      style={{ background: "linear-gradient(135deg, #0f0a1e 0%, #1a0a2e 50%, #0f0a1e 100%)" }}
    >
      {/* Header */}
      <header className="border-b border-purple-500/30 bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-purple-900/40 backdrop-blur-lg sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📜</span>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Campus Agent
              </h1>
              <p className="text-sm text-purple-300">My Request History</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => void load(email)}
              className="bg-slate-800 border border-slate-700 hover:border-cyan-500/50 rounded-lg px-4 py-2 text-sm transition-all"
            >
              🔄 Refresh
            </button>
            <a
              href="/"
              className="bg-slate-800 border border-slate-700 hover:border-violet-500/50 rounded-lg px-4 py-2 text-sm transition-all"
            >
              ← Dashboard
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(["all", "pending", "approved", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                filter === f
                  ? "bg-violet-600/40 border-violet-500/60 text-violet-100"
                  : "bg-slate-900/50 border-slate-700/50 text-slate-400 hover:border-slate-600"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === "all" && ` (${requests.length})`}
              {f !== "all" &&
                ` (${requests.filter((r) => r.status.toLowerCase() === f).length})`}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <span className="animate-spin mr-3 text-2xl">⟳</span> Loading…
          </div>
        )}

        {error && (
          <div className="bg-rose-900/30 border border-rose-700/50 rounded-xl p-6 text-rose-300 mb-6">
            ❌ {error}
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
          <div className="text-center py-24 text-slate-500">
            <p className="text-4xl mb-4">📭</p>
            <p>No {filter === "all" ? "" : filter} requests found.</p>
          </div>
        )}

        <div className="space-y-4">
          {visible.map((req) => (
            <div
              key={req.id}
              className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-900/20 to-indigo-900/10 p-6 hover:border-purple-500/40 transition-all"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg leading-tight mb-1">
                    {req.operation || req.query}
                  </h3>
                  {req.operation && (
                    <p className="text-sm text-slate-400 line-clamp-2">{req.query}</p>
                  )}
                </div>
                <StatusBadge status={req.status} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-400 mb-4">
                <div>
                  <p className="uppercase tracking-wider text-slate-500 mb-0.5">Thread</p>
                  <p className="text-slate-300 font-mono">{req.thread_id}</p>
                </div>
                <div>
                  <p className="uppercase tracking-wider text-slate-500 mb-0.5">Submitted</p>
                  <p className="text-slate-300">{formatDate(req.created_at)}</p>
                </div>
                {req.approved_at && (
                  <div>
                    <p className="uppercase tracking-wider text-slate-500 mb-0.5">Decided</p>
                    <p className="text-slate-300">{formatDate(req.approved_at)}</p>
                  </div>
                )}
                {req.assigned_faculty_name && (
                  <div>
                    <p className="uppercase tracking-wider text-slate-500 mb-0.5">Faculty</p>
                    <p className="text-slate-300">{req.assigned_faculty_name}</p>
                  </div>
                )}
              </div>

              {/* Flags */}
              <div className="flex flex-wrap gap-2 mb-3">
                {req.escalated && (
                  <span className="text-xs bg-orange-500/20 border border-orange-500/30 text-orange-300 rounded px-2 py-1">
                    🚨 Escalated to HOD
                  </span>
                )}
                {req.reminder_sent && !req.escalated && (
                  <span className="text-xs bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded px-2 py-1">
                    ⏰ Reminder sent
                  </span>
                )}
              </div>

              {req.result && (
                <p className="text-sm text-emerald-300/80 mb-3">{req.result}</p>
              )}

              {/* Documents */}
              {req.documents && req.documents.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Documents</p>
                  <div className="flex flex-wrap gap-2">
                    {req.documents.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.download_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-cyan-300 hover:underline bg-slate-800 border border-slate-700 rounded px-2 py-1"
                      >
                        📄 {doc.filename}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {req.status.toUpperCase() === "APPROVED" && (
                  <button
                    onClick={() => void downloadPdf(req.thread_id)}
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-4 py-2 text-xs text-emerald-200 transition-all font-medium"
                  >
                    📥 Download Approval PDF
                  </button>
                )}
                <a
                  href="/"
                  className="rounded-lg border border-slate-700/50 bg-slate-800/50 hover:bg-slate-700/50 px-4 py-2 text-xs text-slate-300 transition-all"
                >
                  View Dashboard
                </a>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
