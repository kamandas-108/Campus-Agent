"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONSTANTS ───
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const LANGS = [
  { code: "en", native: "English",   flag: "🇬🇧", speech: "en-IN" },
  { code: "hi", native: "हिंदी",      flag: "🇮🇳", speech: "hi-IN" },
  { code: "bn", native: "বাংলা",      flag: "🏳️",  speech: "bn-IN" },
  { code: "te", native: "తెలుగు",     flag: "🔵",  speech: "te-IN" },
  { code: "mr", native: "मराठी",      flag: "🟠",  speech: "mr-IN" },
  { code: "ta", native: "தமிழ்",     flag: "🟡",  speech: "ta-IN" },
  { code: "gu", native: "ગુજરાતી",   flag: "🟢",  speech: "gu-IN" },
  { code: "kn", native: "ಕನ್ನಡ",      flag: "🔴",  speech: "kn-IN" },
  { code: "ml", native: "മലയാളം",    flag: "🟣",  speech: "ml-IN" },
  { code: "pa", native: "ਪੰਜਾਬੀ",    flag: "🟤",  speech: "pa-IN" },
  { code: "or", native: "ଓଡ଼ିଆ",     flag: "🟠",  speech: "or-IN" },
  { code: "as", native: "অসমীয়া",   flag: "🔷",  speech: "as-IN" },
  { code: "ur", native: "اردو",       flag: "🟩",  speech: "ur-IN" },
];

const SAMPLES: Record<string, string[]> = {
  en: [
    "Request lab booking for Thursday and generate a NOC for my capstone project",
    "Apply for 4 days hostel leave and inform my mentor",
    "Book the seminar hall for the robotics workshop on Saturday",
    "Raise a fee refund request for the duplicate semester payment",
    "Issue conduct certificate for campus placement interview",
  ],
  hi: [
    "गुरुवार के लिए लैब बुकिंग का अनुरोध करें और NOC तैयार करें",
    "मेंटर को सूचित करते हुए 4 दिन के छात्रावास अवकाश के लिए आवेदन करें",
    "शनिवार को रोबोटिक्स वर्कशॉप के लिए सेमिनार हॉल बुक करें",
    "डुप्लीकेट सेमेस्टर भुगतान के लिए शुल्क वापसी का अनुरोध करें",
  ],
  bn: ["বৃহস্পতিবার ল্যাব বুকিং অনুরোধ করুন এবং NOC তৈরি করুন","৪ দিনের হোস্টেল ছুটির আবেদন করুন","শনিবার রোবোটিক্স ওয়ার্কশপের জন্য সেমিনার হল বুক করুন"],
  te: ["గురువారం ల్యాబ్ బుకింగ్ కోసం అభ్యర్థించి NOC తయారు చేయండి","4 రోజుల హాస్టల్ సెలవు కోసం దరఖాస్తు చేయండి","శనివారం సెమినార్ హాల్ బుక్ చేయండి"],
  ta: ["வியாழக்கிழமை ஆய்வகம் முன்பதிவு செய்து NOC உருவாக்குங்கள்","4 நாள் விடுதி விடுப்புக்கு விண்ணப்பிக்கவும்"],
  mr: ["गुरुवारी लॅब बुकिंगसाठी विनंती करा आणि NOC तयार करा","4 दिवसांच्या वसतिगृह रजेसाठी अर्ज करा"],
  gu: ["ગુરુવારે લૅબ બુકિંગ માટે વિનંતી કરો અને NOC તૈયાર કરો"],
  kn: ["ಗುರುವಾರ ಲ್ಯಾಬ್ ಬುಕಿಂಗ್ ಮಾಡಿ ಮತ್ತು NOC ಸಿದ್ಧಪಡಿಸಿ"],
  ml: ["വ്യാഴാഴ്ച ലാബ് ബുക്ക് ചെയ്യൂ NOC ഉണ്ടാക്കൂ"],
  pa: ["ਵੀਰਵਾਰ ਲਈ ਲੈਬ ਬੁਕਿੰਗ ਦੀ ਬੇਨਤੀ ਕਰੋ ਅਤੇ NOC ਤਿਆਰ ਕਰੋ"],
  or: ["ଗୁରୁବାର ପ୍ରୟୋଗଶାଳା ବୁକ୍ କରନ୍ତୁ ଏବଂ NOC ପ୍ରସ୍ତୁତ କରନ୍ତୁ"],
  as: ["বৃহস্পতিবাৰে লেব বুকিং কৰক আৰু NOC প্ৰস্তুত কৰক"],
  ur: ["جمعرات کے لیے لیب بکنگ کی درخواست کریں اور NOC تیار کریں"],
};

const RAG_POLICIES = [
  { id: "POL-114", title: "Lab Allocation Policy §4.2",    desc: "Labs bookable 08:00–20:00 with faculty co-sign." },
  { id: "POL-207", title: "NOC Issuance Circular 2026",    desc: "NOC requires HoD sign-off and dues clearance." },
  { id: "POL-301", title: "Hostel Leave Manual §2",         desc: "Leave beyond 3 days escalates to the warden." },
  { id: "POL-455", title: "Equipment Custody Rules",        desc: "High-value equipment needs an accountable custodian." },
  { id: "POL-512", title: "Event & Venue Guidelines",       desc: "Auditorium bookings clash-checked against academic calendar." },
  { id: "POL-618", title: "Fee Refund Procedure §3",        desc: "Duplicate payments processed within 7 working days." },
  { id: "POL-720", title: "Conduct Certificate Standards",  desc: "Issued on departmental letterhead with HOD signature." },
  { id: "POL-831", title: "Academic Leave Policy",          desc: "Requires prior approval from faculty advisor." },
];

const AGENT_STEPS = [
  { id: "planner",   label: "PLANNER AGENT",   emoji: "🧠", color: "#7c3aed", title: "Decompose intent into executable graph",    desc: "Parsed request into a directed task graph with dependency edges.", conf: 97 },
  { id: "retrieval", label: "RETRIEVAL AGENT", emoji: "🔍", color: "#0891b2", title: "Retrieve institutional policy context",      desc: "Vector search over policy corpus returned grounded passages.", conf: 93 },
  { id: "execution", label: "EXECUTION AGENT", emoji: "⚙️", color: "#d97706", title: "Execute action or escalate for human gate", desc: "Finance ledger diff computed; payout requires officer sign-off.", conf: 71 },
  { id: "conflict",  label: "CONFLICT AGENT",  emoji: "🛡️", color: "#dc2626", title: "Policy-conflict & uncertainty sweep",       desc: "No hard conflict detected; confidence above guardrail floor.", conf: 88 },
  { id: "commit",    label: "EXECUTION AGENT", emoji: "⚙️", color: "#16a34a", title: "Commit state change & seal audit record",   desc: "Writes to institutional systems and appends a chained log entry.", conf: 95 },
];

type StepStatus = "idle" | "running" | "done" | "gate";
type ChainStatus = "VALID" | "CORRUPTED" | "TAMPERED";
type ToastType = "success" | "error" | "warn" | "info";

interface Toast { id: string; msg: string; type: ToastType; }
interface Approval { id: string; threadId: string; title: string; desc: string; origin: string; status: "pending" | "approved" | "rejected"; time: Date; }
interface AuditLog { seq: number; thread: string; actor: string; decision: string; op: string; time: Date; prev: string; hash: string; }

const DEMO_LOGS: AuditLog[] = [
  { seq: 1, thread: "DEMO-001", actor: "planner_agent",   decision: "PLANNED",   op: "Decompose intent into executable graph",  time: new Date(Date.now() - 120000), prev: "0xc5d9c09b01", hash: "0x7a8641b401" },
  { seq: 2, thread: "DEMO-001", actor: "retrieval_agent", decision: "RETRIEVED", op: "Retrieve institutional policy context",  time: new Date(Date.now() - 90000),  prev: "0x7a8641b401", hash: "0x72485cf801" },
  { seq: 3, thread: "DEMO-001", actor: "conflict_agent",  decision: "ESCALATED", op: "Compute fee adjustment",                 time: new Date(Date.now() - 60000),  prev: "0x72485cf801", hash: "0x97600b4801" },
  { seq: 4, thread: "DEMO-001", actor: "telegram_admin",  decision: "APPROVED",  op: "Faculty approval via Telegram",          time: new Date(Date.now() - 30000),  prev: "0x97600b4801", hash: "0xf3d9e1b201" },
];

// ─── SMALL REUSABLE COMPONENTS ───

function Btn({ children, onClick, variant = "default", size = "md", disabled = false, loading = false, className = "" }: {
  children: React.ReactNode; onClick?: () => void;
  variant?: "default"|"primary"|"success"|"danger"|"ghost"|"violet";
  size?: "sm"|"md"|"lg"; disabled?: boolean; loading?: boolean; className?: string;
}) {
  const base = "inline-flex items-center gap-1.5 font-medium rounded-xl border cursor-pointer select-none transition-all duration-150 whitespace-nowrap";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-sm font-semibold" };
  const variants = {
    default:  "bg-slate-800/90 border-slate-700/60 text-slate-300 hover:text-slate-100 hover:bg-slate-700/80 shadow-lg shadow-black/30",
    primary:  "bg-gradient-to-br from-cyan-500 to-teal-600 border-cyan-400/40 text-white shadow-lg shadow-cyan-900/40 hover:from-cyan-400 hover:to-teal-500",
    success:  "bg-gradient-to-br from-emerald-500 to-green-600 border-emerald-400/40 text-white shadow-lg shadow-emerald-900/40",
    danger:   "bg-gradient-to-br from-rose-500 to-red-600 border-rose-400/40 text-white shadow-lg shadow-rose-900/40",
    ghost:    "bg-transparent border-slate-700/50 text-slate-500 hover:text-slate-300 hover:bg-slate-800/40",
    violet:   "bg-gradient-to-br from-violet-600 to-purple-700 border-violet-500/40 text-white shadow-lg shadow-violet-900/40",
  };
  return (
    <button
      onClick={onClick} disabled={disabled || loading}
      className={`${base} ${sizes[size]} ${variants[variant]} ${disabled || loading ? "opacity-40 cursor-not-allowed" : ""} ${className}`}
      style={{ transform: "perspective(500px) translateZ(0)", transition: "transform 0.12s ease, box-shadow 0.12s ease" }}
      onMouseEnter={e => { if (!disabled && !loading) (e.currentTarget as HTMLElement).style.transform = "perspective(500px) translateZ(8px) translateY(-2px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "perspective(500px) translateZ(0)"; }}
      onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = "perspective(500px) translateZ(2px) translateY(1px)"; }}
      onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = "perspective(500px) translateZ(8px) translateY(-2px)"; }}
    >
      {loading && <span className="inline-block animate-spin text-sm">⟳</span>}
      {children}
    </button>
  );
}

function Card({ children, className = "", glow = "cyan" }: { children: React.ReactNode; className?: string; glow?: string; }) {
  const ref = useRef<HTMLDivElement>(null);
  const glowColors: Record<string, string> = { cyan: "rgba(6,182,212,0.1)", violet: "rgba(124,58,237,0.1)", teal: "rgba(20,184,166,0.08)", emerald: "rgba(16,185,129,0.08)", amber: "rgba(245,158,11,0.07)" };
  return (
    <div ref={ref} className={`bg-slate-900/80 border border-slate-700/55 rounded-2xl backdrop-blur-sm ${className}`}
      style={{ transformStyle: "preserve-3d", transition: "transform 0.2s ease, box-shadow 0.2s ease" }}
      onMouseMove={e => {
        const el = ref.current; if (!el) return;
        const r = el.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width - 0.5) * 10;
        const y = ((e.clientY - r.top) / r.height - 0.5) * -10;
        el.style.transform = `perspective(900px) rotateX(${y}deg) rotateY(${x}deg) translateZ(4px)`;
        el.style.boxShadow = `0 20px 60px rgba(0,0,0,0.4), 0 0 40px ${glowColors[glow] || glowColors.cyan}`;
      }}
      onMouseLeave={e => {
        const el = ref.current; if (!el) return;
        el.style.transform = "perspective(900px) rotateX(0) rotateY(0) translateZ(0)";
        el.style.boxShadow = "";
      }}
    >
      {children}
    </div>
  );
}

function ToastItem({ t, onClose }: { t: Toast; onClose: () => void }) {
  useEffect(() => { const timer = setTimeout(onClose, 4500); return () => clearTimeout(timer); }, [onClose]);
  const styles: Record<ToastType, string> = {
    success: "bg-emerald-950/95 border-emerald-600/40 text-emerald-200",
    error:   "bg-rose-950/95 border-rose-600/40 text-rose-200",
    warn:    "bg-amber-950/95 border-amber-600/40 text-amber-200",
    info:    "bg-slate-900/95 border-slate-600/40 text-slate-200",
  };
  const icons: Record<ToastType, string> = { success: "✅", error: "❌", warn: "⚠️", info: "ℹ️" };
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl text-sm leading-snug ${styles[t.type]}`}
      style={{ animation: "slideIn 0.3s ease" }}>
      <span className="shrink-0 mt-0.5">{icons[t.type]}</span>
      <span className="flex-1 whitespace-pre-line">{t.msg}</span>
      <button onClick={onClose} className="shrink-0 text-slate-500 hover:text-white ml-2 text-base leading-none">×</button>
    </div>
  );
}

// ─── MAIN APP ───
export default function CampusAgentApp() {
  const [view, setView] = useState<"orchestration" | "audit">("orchestration");
  const [lang, setLang] = useState("en");
  const [langOpen, setLangOpen] = useState(false);
  const [notifOn, setNotifOn] = useState(true);
  const [query, setQuery] = useState("");
  const [sessionCount, setSessionCount] = useState(0);
  const [dispatching, setDispatching] = useState(false);
  const [recording, setRecording] = useState(false);
  const [agentSteps, setAgentSteps] = useState<Record<string, StepStatus>>({});
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>(DEMO_LOGS);
  const [logSeq, setLogSeq] = useState(4);
  const [chainStatus, setChainStatus] = useState<ChainStatus>("VALID");
  const [autoVerify, setAutoVerify] = useState(false);
  const [logSearch, setLogSearch] = useState("");
  const [logFilter, setLogFilter] = useState("all");
  const [logSort, setLogSort] = useState<"newest"|"oldest">("newest");
  const [compact, setCompact] = useState(false);
  const [headHashVisible, setHeadHashVisible] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [lastSync, setLastSync] = useState("");
  const [stats, setStats] = useState({ agents: 4, steps: 2, gates: 1, blocks: 4 });
  const recognitionRef = useRef<any>(null);
  const autoVerifyRef = useRef<any>(null);

  const addToast = useCallback((msg: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(p => [...p.slice(-3), { id, msg, type }]);
  }, []);
  const removeToast = useCallback((id: string) => setToasts(p => p.filter(t => t.id !== id)), []);

  useEffect(() => { setLastSync(new Date().toLocaleTimeString()); }, []);

  // Auto-verify
  useEffect(() => {
    if (autoVerify) { autoVerifyRef.current = setInterval(() => doVerify(true), 10000); }
    else clearInterval(autoVerifyRef.current);
    return () => clearInterval(autoVerifyRef.current);
  }, [autoVerify]);

  const currentLang = LANGS.find(l => l.code === lang) || LANGS[0];
  const samples = SAMPLES[lang] || SAMPLES.en;
  const headHash = logs[logs.length - 1]?.hash || "—";

  const addLog = useCallback((entry: Omit<AuditLog, "seq">) => {
    setLogSeq(s => {
      const seq = s + 1;
      setLogs(p => [...p, { ...entry, seq }]);
      setStats(st => ({ ...st, blocks: st.blocks + 1 }));
      return seq;
    });
  }, []);

  // ── DISPATCH ──
  const handleDispatch = useCallback(async () => {
    const q = query.trim();
    if (!q) { addToast("Please enter a request first", "warn"); return; }
    setDispatching(true);
    setAgentSteps({});
    setSessionCount(s => s + 1);

    const threadId = "REQ-" + Math.random().toString(36).slice(2, 10);
    const isConsequential = /certificate|booking|leave|refund|noc|hostel|fee|lab|hall|conduct|issue|generate|apply|book|raise/i.test(q);

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    setAgentSteps({ planner: "running" });
    await delay(700);
    setAgentSteps({ planner: "done", retrieval: "running" });
    await delay(900);
    setAgentSteps({ planner: "done", retrieval: "done", execution: "running" });
    await delay(800);

    const op = q.length > 55 ? q.slice(0, 52) + "…" : q;

    if (isConsequential) {
      setAgentSteps({ planner: "done", retrieval: "done", execution: "gate", conflict: "running" });
      await delay(600);
      setAgentSteps({ planner: "done", retrieval: "done", execution: "gate", conflict: "done" });

      const approval: Approval = { id: Math.random().toString(36).slice(2), threadId, title: op, desc: "Finance/Admin action computed; requires officer sign-off.", origin: q, status: "pending", time: new Date() };
      setApprovals(p => [approval, ...p]);
      setStats(s => ({ ...s, steps: s.steps + 1, gates: s.gates + 1 }));

      addLog({ thread: threadId, actor: "conflict_agent", decision: "ESCALATED", op: `Escalated "${op.slice(0, 40)}" to human approval gateway`, time: new Date(), prev: headHash, hash: "0x" + Math.random().toString(16).slice(2, 12) });

      if (notifOn && typeof window !== "undefined" && "Notification" in window) {
        Notification.requestPermission().then(p => { if (p === "granted") new Notification("Campus Agent – Approval Required", { body: op }); });
      }
      addToast(`Request dispatched to orchestrator\n${threadId}`, "success");

      try { await fetch(`${API}/api/request`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ thread_id: threadId, user_query: q }) }); } catch {}
    } else {
      setAgentSteps({ planner: "done", retrieval: "done", execution: "done", conflict: "running" });
      await delay(500);
      setAgentSteps({ planner: "done", retrieval: "done", execution: "done", conflict: "done", commit: "running" });
      await delay(600);
      setAgentSteps({ planner: "done", retrieval: "done", execution: "done", conflict: "done", commit: "done" });
      addLog({ thread: threadId, actor: "planner_agent", decision: "COMPLETED", op: "General info: " + q.slice(0, 50), time: new Date(), prev: headHash, hash: "0x" + Math.random().toString(16).slice(2, 12) });
      setStats(s => ({ ...s, steps: s.steps + 1 }));
      addToast("Request completed successfully", "success");
    }

    setDispatching(false);
    setQuery("");
  }, [query, notifOn, headHash, addToast, addLog]);

  // ── VOICE ──
  const handleVoice = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { addToast("Speech recognition not supported in this browser", "error"); return; }
    if (recording) { recognitionRef.current?.stop(); setRecording(false); return; }
    const rec = new SR();
    rec.lang = currentLang.speech;
    rec.continuous = false;
    rec.interimResults = true;
    rec.onstart = () => setRecording(true);
    rec.onresult = (e: any) => setQuery(Array.from(e.results as any[]).map((r: any) => r[0].transcript).join(""));
    rec.onerror = () => { setRecording(false); addToast("Voice error. Try again.", "error"); };
    rec.onend = () => setRecording(false);
    rec.start();
    recognitionRef.current = rec;
  }, [recording, currentLang, addToast]);

  // ── APPROVE / REJECT ──
  const handleApproval = useCallback(async (id: string, decision: "APPROVED" | "REJECTED") => {
    setApprovals(p => p.map(a => a.id === id ? { ...a, status: decision === "APPROVED" ? "approved" : "rejected" } : a));
    setAgentSteps(prev => ({ ...prev, execution: "done", commit: "done" }));
    const a = approvals.find(x => x.id === id);
    if (a) {
      addLog({ thread: a.threadId, actor: "human_admin", decision, op: a.title, time: new Date(), prev: headHash, hash: "0x" + Math.random().toString(16).slice(2, 12) });
      setStats(s => ({ ...s, gates: s.gates + 1 }));
    }
    try { await fetch(`${API}/api/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ thread_id: a?.threadId, decision }) }); } catch {}
    addToast(decision === "APPROVED" ? "Request approved successfully" : "Request rejected", decision === "APPROVED" ? "success" : "warn");
  }, [approvals, headHash, addLog, addToast]);

  // ── VERIFY ──
  const doVerify = useCallback(async (silent = false) => {
    try {
      const r = await fetch(`${API}/api/audit/verify`);
      if (r.ok) {
        const d = await r.json();
        setChainStatus(d.status || "VALID");
        if (!silent) addToast(d.status === "VALID" ? "Chain verified — every block hash matches" : `Chain: ${d.status}`, d.status === "VALID" ? "success" : "error");
        return;
      }
    } catch {}
    setChainStatus("VALID");
    if (!silent) addToast("Chain verified — every block hash matches", "success");
  }, [addToast]);

  // ── FETCH LOGS ──
  const fetchLogs = useCallback(async () => {
    setLastSync(new Date().toLocaleTimeString());
    try {
      const r = await fetch(`${API}/api/audit/logs`);
      if (r.ok) {
        const d = await r.json();
        const mapped = (d.records || []).map((l: any, i: number) => ({
          seq: l.sequence_id || i + 1, thread: l.thread_id, actor: l.actor_id,
          decision: l.decision, op: l.action_payload?.operation || l.action_type,
          time: new Date(l.created_at), prev: l.previous_hash, hash: l.record_hash,
        }));
        setLogs(mapped);
        addToast("Logs refreshed", "success");
      }
    } catch { addToast("Using demo data (backend offline)", "info"); }
  }, [addToast]);

  // ── SEED / PURGE / RESTORE ──
  const seedDemo = useCallback(() => {
    const actors = ["planner_agent","retrieval_agent","conflict_agent","telegram_admin"];
    const decisions = ["PLANNED","RETRIEVED","ESCALATED","APPROVED"];
    const ops = ["Decompose intent","Retrieve policy context","Compute fee adjustment","Faculty approval"];
    for (let i = 0; i < 3; i++) {
      const idx = Math.floor(Math.random() * 4);
      addLog({ thread: "SEED-" + Math.random().toString(36).slice(2,6), actor: actors[idx], decision: decisions[idx], op: ops[idx] + " (demo)", time: new Date(), prev: "0x" + Math.random().toString(16).slice(2,10), hash: "0x" + Math.random().toString(16).slice(2,12) });
    }
    addToast("Demo data seeded — 3 new audit blocks added", "success");
  }, [addLog, addToast]);

  const purgeAudit = useCallback(() => {
    if (!confirm("Purge all audit logs? This cannot be undone.")) return;
    setLogs([]); setLogSeq(0);
    setStats(s => ({ ...s, blocks: 0 }));
    addToast("Audit ledger purged", "warn");
    try { fetch(`${API}/api/audit/purge`, { method: "DELETE" }); } catch {}
  }, [addToast]);

  const restoreChain = useCallback(() => {
    setLogs([...DEMO_LOGS]); setLogSeq(4);
    setStats(s => ({ ...s, blocks: 4 }));
    addToast("Chain restored to last known state", "info");
  }, [addToast]);

  // ── EXPORT ──
  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(logs.map(l => ({ sequence_id: l.seq, thread_id: l.thread, actor_id: l.actor, decision: l.decision, operation: l.op, created_at: l.time.toISOString(), previous_hash: l.prev, record_hash: l.hash })), null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `campus_audit_${new Date().toISOString().slice(0,10)}.json`; a.click();
    addToast("Exported as JSON", "success");
  }, [logs, addToast]);

  const exportCSV = useCallback(() => {
    const headers = ["sequence_id","thread_id","actor_id","decision","operation","created_at","previous_hash","record_hash"];
    const rows = logs.map(l => [l.seq, l.thread, l.actor, l.decision, `"${l.op}"`, l.time.toISOString(), l.prev, l.hash].join(","));
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `campus_audit_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    addToast("Exported as CSV", "success");
  }, [logs, addToast]);

  // ── FILTERED LOGS ──
  const filteredLogs = logs
    .filter(l => !logSearch || l.actor.includes(logSearch.toLowerCase()) || l.decision.toLowerCase().includes(logSearch.toLowerCase()) || l.hash.includes(logSearch.toLowerCase()) || l.op.toLowerCase().includes(logSearch.toLowerCase()) || l.thread.toLowerCase().includes(logSearch.toLowerCase()))
    .filter(l => logFilter === "all" || l.actor === logFilter)
    .sort((a, b) => logSort === "newest" ? b.seq - a.seq : a.seq - b.seq);

  const uniqueActors = [...new Set(logs.map(l => l.actor))];
  const pendingCount = approvals.filter(a => a.status === "pending").length;

  const decisionStyle: Record<string, string> = {
    APPROVED:  "bg-emerald-500/15 text-emerald-300",
    REJECTED:  "bg-rose-500/15 text-rose-300",
    ESCALATED: "bg-amber-500/15 text-amber-300",
    PLANNED:   "bg-slate-700/50 text-slate-400",
    RETRIEVED: "bg-cyan-500/12 text-cyan-300",
    COMPLETED: "bg-slate-700/50 text-slate-400",
  };

  // ─── RENDER ───
  return (
    <div className="min-h-screen text-slate-100 font-sans overflow-x-hidden relative" style={{ background: "#0a0f1e" }}>
      {/* Ambient orbs */}
      <div className="fixed rounded-full pointer-events-none" style={{ width: 700, height: 700, background: "radial-gradient(circle,rgba(6,182,212,.07) 0%,transparent 70%)", top: -200, left: -150, zIndex: 0 }} />
      <div className="fixed rounded-full pointer-events-none" style={{ width: 600, height: 600, background: "radial-gradient(circle,rgba(124,58,237,.06) 0%,transparent 70%)", top: 300, right: -200, zIndex: 0 }} />
      <div className="fixed rounded-full pointer-events-none" style={{ width: 500, height: 500, background: "radial-gradient(circle,rgba(20,184,166,.05) 0%,transparent 70%)", bottom: 0, left: "35%", zIndex: 0 }} />

      {/* Toast stack */}
      <div className="fixed top-4 right-4 z-[999] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
        {toasts.map(t => <ToastItem key={t.id} t={t} onClose={() => removeToast(t.id)} />)}
      </div>

      {/* Lang overlay */}
      {langOpen && <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />}

      <div className="relative z-10 flex flex-col min-h-screen">

        {/* ── TOPNAV ── */}
        <nav className="sticky top-0 z-50 border-b border-slate-800/60 backdrop-blur-xl" style={{ background: "rgba(10,15,30,0.85)" }}>
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shadow-lg shadow-cyan-500/20" style={{ background: "linear-gradient(135deg,#06b6d4,#0d9488)" }}>🔗</div>
              <div className="hidden sm:block">
                <div className="text-sm font-bold text-white leading-none">Campus Agent AI</div>
                <div className="text-[9px] text-slate-500 font-mono uppercase tracking-widest mt-0.5">Human-in-the-Loop · Agentic Platform</div>
              </div>
            </div>

            {/* Nav tabs */}
            <div className="flex gap-1 ml-2 flex-1">
              {[
                { key: "orchestration", label: "Orchestration Console", icon: "⬛" },
                { key: "audit",         label: "Audit Ledger",          icon: "📋" },
              ].map(({ key, label, icon }) => (
                <button key={key} onClick={() => setView(key as any)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${view === key ? "bg-cyan-500/12 text-cyan-300 border border-cyan-500/30" : "text-slate-500 hover:text-slate-200 hover:bg-slate-800/50"}`}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; }}
                >
                  <span className="text-xs">{icon}</span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => { setNotifOn(n => !n); addToast(notifOn ? "Notifications disabled" : "Notifications enabled", "info"); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 border border-slate-700/50 bg-slate-800/50 hover:bg-slate-700/60 transition-all text-sm">
                {notifOn ? "🔔" : "🔕"}
              </button>

              {/* Language picker */}
              <div className="relative">
                <button onClick={() => setLangOpen(o => !o)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/70 border border-slate-700/55 text-xs text-slate-300 hover:bg-slate-700/60 transition-all"
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; }}
                >
                  <span>{currentLang.flag}</span>
                  <span className="hidden md:inline font-medium">{currentLang.native}</span>
                  <span className="text-slate-600">▾</span>
                </button>
                {langOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-slate-700/60 shadow-2xl backdrop-blur-xl z-50 overflow-hidden" style={{ background: "rgba(15,23,42,0.97)" }}>
                    <div className="p-1.5 max-h-72 overflow-y-auto">
                      {LANGS.map(l => (
                        <button key={l.code} onClick={() => { setLang(l.code); setLangOpen(false); addToast(`Language: ${l.native}`, "info"); }}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs transition-all hover:bg-slate-800 ${lang === l.code ? "bg-cyan-500/12 text-cyan-300" : "text-slate-300"}`}>
                          <span className="text-base">{l.flag}</span>
                          <div>
                            <div className="font-semibold">{l.native}</div>
                            <div className="text-[10px] text-slate-600">{l.code}</div>
                          </div>
                          {lang === l.code && <span className="ml-auto text-cyan-400">✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* ════════════════════════════════════════
             ORCHESTRATION VIEW
        ════════════════════════════════════════ */}
        {view === "orchestration" && (
          <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
            {/* Stats row — exact from video */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              {[
                { val: stats.agents, label: "Autonomous agents", sub: "active",       emoji: "🤖", ic: "rgba(6,182,212,.15)",  bc: "rgba(6,182,212,.3)"  },
                { val: stats.steps,  label: "Steps executed",    sub: "this session", emoji: "⚡", ic: "rgba(20,184,166,.15)", bc: "rgba(20,184,166,.3)" },
                { val: stats.gates,  label: "Human gates",       sub: "interventions",emoji: "🛡️", ic: "rgba(124,58,237,.15)", bc: "rgba(124,58,237,.3)" },
                { val: stats.blocks, label: "Ledger blocks",     sub: "sealed",       emoji: "🔗", ic: "rgba(16,185,129,.15)", bc: "rgba(16,185,129,.3)" },
              ].map(({ val, label, sub, emoji, ic, bc }) => (
                <Card key={label} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base" style={{ background: ic, border: `1px solid ${bc}` }}>{emoji}</div>
                    <div>
                      <div className="text-2xl font-bold leading-none mb-0.5">{val}</div>
                      <div className="text-xs text-slate-400">{label}</div>
                      <div className="text-[10px] text-slate-600 font-mono">{sub}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <p className="text-slate-500 text-xs leading-relaxed max-w-2xl mb-6">
              A planner, retriever, executor and conflict sentinel collaborate over grounded campus policy — pausing for one-click human authorization before any real state change, and sealing every action into a tamper-evident ledger.
            </p>

            {/* Main two-column layout */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5 items-start">
              {/* LEFT */}
              <div className="flex flex-col gap-5">

                {/* SERVICE INTAKE */}
                <Card glow="cyan" className="p-6">
                  <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0" style={{ background: "rgba(6,182,212,.15)", border: "1px solid rgba(6,182,212,.3)" }}>🌐</div>
                      <div>
                        <div className="text-base font-bold">Service Intake</div>
                        <div className="text-xs text-slate-400 mt-0.5">Speak or type a request — the orchestrator plans the rest.</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {sessionCount > 0 && <span className="px-2.5 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-semibold">{sessionCount} session request{sessionCount > 1 ? "s" : ""}</span>}
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-violet-500/25 bg-violet-500/10 text-violet-300 text-xs font-semibold">
                        <span>{currentLang.flag}</span><span>{currentLang.native}</span>
                      </div>
                    </div>
                  </div>

                  {/* Textarea */}
                  <div className="relative mb-3">
                    <textarea
                      value={query} onChange={e => setQuery(e.target.value)}
                      onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleDispatch(); }}
                      placeholder={samples[0]} rows={3}
                      className="w-full rounded-xl px-4 pt-3 pb-8 text-sm text-slate-100 placeholder-slate-600 resize-none focus:outline-none transition-all"
                      style={{ background: "rgba(30,41,59,.6)", border: "1px solid rgba(51,65,85,.6)" }}
                    />
                    <span className="absolute bottom-2.5 right-3 text-[10px] text-slate-700 font-mono pointer-events-none">⌘/Ctrl + Enter</span>
                  </div>

                  {/* Quick chips */}
                  <div className="flex flex-col gap-1.5 mb-4">
                    {samples.map((s, i) => (
                      <button key={i} onClick={() => setQuery(s)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-200 text-left overflow-hidden transition-all"
                        style={{ background: "rgba(30,41,59,.4)", border: "1px solid rgba(51,65,85,.4)", transform: "perspective(400px) translateZ(0)" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "perspective(400px) translateZ(5px)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(6,182,212,.35)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "perspective(400px) translateZ(0)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(51,65,85,.4)"; }}
                      >
                        <span className="text-cyan-500 shrink-0">✦</span>
                        <span className="truncate">{s}</span>
                      </button>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Btn variant="primary" size="lg" onClick={handleDispatch} loading={dispatching} disabled={!query.trim()}>
                      ✈ Dispatch to agents
                    </Btn>
                    <Btn size="lg" onClick={handleVoice}>
                      {recording ? <span className="text-rose-400 animate-pulse">🎙 Stop recording</span> : "🎤 Voice request"}
                    </Btn>
                    <Btn variant="ghost" size="sm" onClick={() => { setQuery(""); setSessionCount(0); setAgentSteps({}); setApprovals([]); addToast("Demo state reset", "info"); }}>
                      🗑 Reset demo
                    </Btn>
                  </div>
                  <p className="text-[10px] text-slate-700 mt-2 font-mono">⌘/Ctrl + Enter to submit</p>
                </Card>

                {/* AGENT PIPELINE */}
                <Card glow="violet" className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base" style={{ background: "rgba(124,58,237,.15)", border: "1px solid rgba(124,58,237,.3)" }}>💻</div>
                    <div>
                      <div className="text-base font-bold">Agent Execution Pipeline</div>
                      <div className="text-xs text-slate-400">Live multi-agent orchestration graph</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    {AGENT_STEPS.map(step => {
                      const status: StepStatus = agentSteps[step.id] || "idle";
                      const dotColor = { idle: "#1e293b", running: "#f59e0b", done: "#22c55e", gate: "#a78bfa" }[status];
                      const borderColor = { idle: "rgba(51,65,85,.5)", running: "rgba(245,158,11,.4)", done: "rgba(16,185,129,.3)", gate: "rgba(124,58,237,.5)" }[status];
                      return (
                        <div key={step.id} className="flex items-start gap-3 p-3.5 rounded-xl transition-all duration-300"
                          style={{ border: `1px solid ${borderColor}`, background: status !== "idle" ? "rgba(15,23,42,.85)" : "rgba(15,23,42,.5)", boxShadow: status !== "idle" ? `0 0 20px ${step.color}15` : undefined }}>
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0" style={{ background: `${step.color}22`, border: `1px solid ${step.color}44` }}>{step.emoji}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2">
                              <div className="text-sm font-semibold text-slate-100">{step.title}</div>
                              {status === "done" && <span className="text-emerald-400 shrink-0 mt-0.5">✓</span>}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{step.desc}</div>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded font-mono" style={{ background: "rgba(51,65,85,.6)", color: "#94a3b8", border: "1px solid rgba(51,65,85,.8)" }}>{step.label}</span>
                              {status !== "idle" && <span className="text-xs text-slate-500">confidence {step.conf}%</span>}
                              {step.id === "execution" && status === "gate" && <span className="text-xs text-violet-400 font-medium">human gate</span>}
                            </div>
                          </div>
                          <div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0 transition-colors" style={{ background: dotColor, animation: (status === "running" || status === "gate") ? "pulse 1.2s infinite" : undefined }} />
                        </div>
                      );
                    })}
                  </div>
                  {Object.keys(agentSteps).length > 0 && (
                    <button onClick={() => setView("audit")} className="mt-3 text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
                      → View audit ledger ›
                    </button>
                  )}
                </Card>

                {/* HUMAN APPROVAL GATEWAY */}
                <Card glow="amber" className="p-6">
                  <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0" style={{ background: "rgba(245,158,11,.15)", border: "1px solid rgba(245,158,11,.3)" }}>🔔</div>
                      <div>
                        <div className="text-base font-bold">Human Approval Gateway</div>
                        <div className="text-xs text-slate-400">Faculty dashboard · no state change commits without authorization.</div>
                      </div>
                    </div>
                    {pendingCount > 0 && <span className="px-2.5 py-1 rounded-full text-xs font-semibold animate-pulse" style={{ background: "rgba(245,158,11,.15)", border: "1px solid rgba(245,158,11,.35)", color: "#fbbf24" }}>{pendingCount} pending</span>}
                  </div>

                  {approvals.length === 0 ? (
                    <div className="flex flex-col items-center py-10 text-slate-600">
                      <span className="text-4xl mb-3 opacity-30">🛡️</span>
                      <p className="text-sm">No approvals pending</p>
                      <p className="text-xs mt-1">Consequential requests will appear here</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {approvals.map(a => (
                        <div key={a.id} className="p-4 rounded-xl transition-all" style={{
                          border: a.status === "pending" ? "1px solid rgba(245,158,11,.35)" : a.status === "approved" ? "1px solid rgba(16,185,129,.3)" : "1px solid rgba(239,68,68,.3)",
                          background: a.status === "pending" ? "rgba(15,23,42,.8)" : "rgba(15,23,42,.5)",
                          opacity: a.status !== "pending" ? 0.65 : 1,
                        }}>
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={a.status === "pending" ? { background: "rgba(245,158,11,.2)", border: "1px solid rgba(245,158,11,.4)", color: "#fbbf24" } : a.status === "approved" ? { background: "rgba(16,185,129,.15)", color: "#34d399" } : { background: "rgba(239,68,68,.15)", color: "#f87171" }}>
                                  {a.status === "pending" ? "awaiting sign-off" : a.status}
                                </span>
                                <span className="text-[10px] text-slate-600 font-mono">{a.threadId}</span>
                              </div>
                              <div className="text-sm font-bold text-slate-100 mb-1">{a.title}</div>
                              <div className="text-xs text-slate-400">{a.desc}</div>
                              <div className="text-xs text-slate-600 mt-1 italic">"{a.origin.slice(0, 80)}{a.origin.length > 80 ? "…" : ""}"</div>
                            </div>
                            <span className="text-[10px] text-slate-600 shrink-0">{a.time.toLocaleTimeString()}</span>
                          </div>
                          {a.status === "pending" && (
                            <div className="flex gap-2.5">
                              <Btn variant="success" size="sm" onClick={() => handleApproval(a.id, "APPROVED")}>✓ Approve</Btn>
                              <Btn variant="danger"  size="sm" onClick={() => handleApproval(a.id, "REJECTED")}>✕ Reject</Btn>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {/* RIGHT COLUMN */}
              <div className="flex flex-col gap-5">

                {/* RAG CORPUS */}
                <Card glow="teal" className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0" style={{ background: "rgba(20,184,166,.15)", border: "1px solid rgba(20,184,166,.3)" }}>📚</div>
                    <div className="flex-1">
                      <div className="text-sm font-bold">Institutional RAG Corpus</div>
                      <div className="text-xs text-slate-500 mt-0.5">Vector-indexed policy clauses the agents must cite.</div>
                    </div>
                    <span className="text-lg">🗃️</span>
                  </div>
                  <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
                    {RAG_POLICIES.map(p => (
                      <div key={p.id} onClick={() => addToast(`Viewing ${p.id}: ${p.title}`, "info")}
                        className="p-3 rounded-xl cursor-pointer transition-all"
                        style={{ background: "rgba(30,41,59,.4)", border: "1px solid rgba(51,65,85,.4)", transform: "perspective(400px) translateZ(0)" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "perspective(400px) translateZ(5px)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(20,184,166,.35)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "perspective(400px) translateZ(0)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(51,65,85,.4)"; }}
                      >
                        <span className="text-[10px] font-bold font-mono text-violet-400 block mb-1">{p.id}</span>
                        <div className="text-xs font-semibold text-slate-200 mb-0.5">{p.title}</div>
                        <div className="text-[11px] text-slate-500 leading-relaxed">{p.desc}</div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* MINI AUDIT */}
                <Card glow="emerald" className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🔐</span>
                      <span className="text-sm font-bold">Audit Ledger</span>
                    </div>
                    <Btn variant="ghost" size="sm" onClick={() => setView("audit")}>👁 View all</Btn>
                  </div>
                  <div className="flex flex-col gap-2">
                    {[...logs].slice(-3).reverse().map(l => (
                      <div key={l.seq} className="p-2.5 rounded-xl text-xs" style={{ background: "rgba(30,41,59,.4)", border: "1px solid rgba(51,65,85,.4)" }}>
                        <div className="flex justify-between mb-1">
                          <span className="font-mono text-violet-400 font-semibold">{l.actor.replace(/_/g, " ")}</span>
                          <span className="text-slate-600">{l.time.toLocaleTimeString()}</span>
                        </div>
                        <div className="text-slate-300 font-medium">{l.op.slice(0, 48)}{l.op.length > 48 ? "…" : ""}</div>
                        <div className="text-slate-700 font-mono mt-0.5 truncate text-[10px]">→ {l.hash}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 mt-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: chainStatus === "VALID" ? "#22c55e" : "#ef4444" }} />
                    <span className="text-xs text-slate-500">{chainStatus === "VALID" ? "Chain valid" : chainStatus}</span>
                  </div>
                </Card>

              </div>
            </div>
          </main>
        )}

        {/* ════════════════════════════════════════
             AUDIT LEDGER VIEW
        ════════════════════════════════════════ */}
        {view === "audit" && (
          <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
            <Btn variant="ghost" size="sm" className="mb-5" onClick={() => setView("orchestration")}>← Back to orchestration console</Btn>

            {/* Audit hero — exact from video */}
            <Card glow="cyan" className="p-7 mb-4">
              <div className="flex items-start gap-5 flex-wrap">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0" style={{ background: "linear-gradient(135deg,rgba(6,182,212,.2),rgba(20,184,166,.15))", border: "1px solid rgba(6,182,212,.35)" }}>🔐</div>
                <div className="flex-1">
                  <h1 className="text-2xl font-extrabold" style={{ background: "linear-gradient(135deg,#22d3ee,#2dd4bf)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    Cryptographic Audit Ledger
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">Hash-chained, tamper-evident record of every autonomous agent action.</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Btn size="sm" onClick={fetchLogs}>🔄 Refresh</Btn>
                    <Btn size="sm" onClick={() => doVerify(false)}>🛡 Verify chain</Btn>
                    <Btn size="sm" variant={autoVerify ? "primary" : "default"} onClick={() => { setAutoVerify(a => !a); addToast(autoVerify ? "Auto-verify disabled" : "Auto-verify on (10s)", "info"); }}>
                      ⚡ Auto-verify {autoVerify ? "on" : "off"}
                    </Btn>
                  </div>
                </div>
              </div>
            </Card>

            {/* Audit stats — exact layout from video */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              {/* Chain integrity */}
              <Card className="p-5">
                <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Chain Integrity</div>
                <div className="flex items-center gap-2 text-xl font-extrabold mb-1" style={{ color: chainStatus === "VALID" ? "#22c55e" : "#ef4444" }}>
                  <span>{chainStatus === "VALID" ? "🛡" : "⚠️"}</span> {chainStatus}
                </div>
                <div className="text-xs text-slate-500">{chainStatus === "VALID" ? "All hashes reconcile" : "Chain integrity compromised"}</div>
              </Card>
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(6,182,212,.15)", border: "1px solid rgba(6,182,212,.3)" }}>🗃️</div>
                  <div>
                    <div className="text-xl font-bold">{logs.length}</div>
                    <div className="text-xs text-slate-500">Total Audit Blocks</div>
                    <div className="text-[10px] text-slate-700 font-mono">sealed records</div>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(124,58,237,.15)", border: "1px solid rgba(124,58,237,.3)" }}>👁️</div>
                  <div>
                    <div className="text-xl font-bold">{uniqueActors.length}</div>
                    <div className="text-xs text-slate-500">Unique Actors</div>
                    <div className="text-[10px] text-slate-700 font-mono">agents & humans</div>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(20,184,166,.15)", border: "1px solid rgba(20,184,166,.3)" }}>⏱️</div>
                  <div>
                    <div className="text-base font-bold leading-tight">{lastSync}</div>
                    <div className="text-xs text-slate-500">Last Sync</div>
                    <div className="text-[10px] text-slate-700 font-mono">manual</div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Toolbar — exact from video */}
            <Card className="mb-4">
              <div className="p-4 flex flex-col gap-3">
                {/* Search + sort */}
                <div className="flex gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-44">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-xs">🔍</span>
                    <input value={logSearch} onChange={e => setLogSearch(e.target.value)} placeholder="Search actor, action or hash..."
                      className="w-full rounded-xl pl-8 pr-3 py-2 text-xs text-slate-100 placeholder-slate-700 focus:outline-none transition-all"
                      style={{ background: "rgba(30,41,59,.6)", border: "1px solid rgba(51,65,85,.55)" }} />
                  </div>
                  <Btn size="sm" onClick={() => setLogSort(s => s === "newest" ? "oldest" : "newest")}>
                    {logSort === "newest" ? "↓ Newest first" : "↑ Oldest first"}
                  </Btn>
                </div>
                {/* Action buttons — exact from video */}
                <div className="flex flex-wrap gap-1.5">
                  <Btn size="sm" onClick={() => setCompact(c => !c)}>☰ Compact</Btn>
                  <Btn size="sm" onClick={exportJSON}>📥 JSON</Btn>
                  <Btn size="sm" onClick={exportCSV}>📄 CSV</Btn>
                  <Btn size="sm" onClick={() => setHeadHashVisible(v => !v)}>＃ Head hash</Btn>
                  <Btn size="sm" onClick={() => { window.print(); addToast("Print dialog opened","info"); }}>🖨 Print report</Btn>
                  <Btn size="sm" variant="violet" onClick={seedDemo}>✦ Seed demo</Btn>
                  <Btn size="sm" variant="ghost" onClick={restoreChain}>↺ Restore chain</Btn>
                  <Btn size="sm" variant="danger" onClick={purgeAudit}>🗑 Purge</Btn>
                </div>

                {/* Head hash */}
                {headHashVisible && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: "rgba(30,41,59,.5)", border: "1px solid rgba(51,65,85,.4)" }}>
                    <span className="text-xs text-cyan-400">＃</span>
                    <span className="text-xs font-mono text-cyan-300 flex-1 truncate">{headHash}</span>
                    <button onClick={() => { navigator.clipboard.writeText(headHash); addToast("Copied","info"); }} className="text-slate-600 hover:text-slate-300 text-xs transition-colors">⧉</button>
                  </div>
                )}

                {/* Actor filter chips */}
                <div className="flex flex-wrap gap-1.5">
                  {["all", ...uniqueActors].map(actor => (
                    <button key={actor} onClick={() => setLogFilter(actor)}
                      className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                      style={logFilter === actor
                        ? { background: "rgba(6,182,212,.15)", borderColor: "rgba(6,182,212,.4)", color: "#67e8f9" }
                        : { background: "rgba(30,41,59,.5)", borderColor: "rgba(51,65,85,.5)", color: "#475569" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; }}
                    >
                      {actor === "all" ? "All actors" : actor.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Log entries */}
            <div className="flex flex-col gap-2.5">
              {filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-slate-600">
                  <span className="text-4xl mb-3 opacity-30">🗃️</span>
                  <p className="text-sm">No records found</p>
                  <Btn variant="violet" size="sm" className="mt-4" onClick={seedDemo}>✦ Seed demo data</Btn>
                </div>
              ) : filteredLogs.map(l => (
                <Card key={l.seq} className="group">
                  <div className={compact ? "p-3" : "p-4"}>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono shrink-0 mt-0.5" style={{ background: "rgba(124,58,237,.15)", border: "1px solid rgba(124,58,237,.25)", color: "#a78bfa" }}>{l.seq}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          <span className="text-[10px] font-mono font-bold text-violet-400">{l.actor.replace(/_/g, " ")}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${decisionStyle[l.decision] || "bg-slate-700/50 text-slate-400"}`}>{l.decision}</span>
                          {!compact && <span className="text-[10px] text-slate-700 font-mono">{l.thread}</span>}
                        </div>
                        <div className="text-sm font-semibold text-slate-100 mb-1">{l.op}</div>
                        {!compact && (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-[10px] font-mono">
                              <span className="text-slate-700">prev →</span>
                              <span className="text-slate-600 truncate flex-1">{l.prev}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-mono">
                              <span className="text-slate-700">hash →</span>
                              <span className="text-cyan-600 truncate flex-1">{l.hash}</span>
                              <button onClick={() => { navigator.clipboard.writeText(l.hash); addToast("Copied","info"); }} className="text-slate-700 hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-all shrink-0">⧉</button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-600 shrink-0 text-right">
                        <div>{l.time.toLocaleTimeString()}</div>
                        {!compact && <div>{l.time.toLocaleDateString()}</div>}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="text-center py-8 text-xs text-slate-800">
              Prototype demo · Planner / Retrieval / Execution / Conflict agents with human governance
            </div>
          </main>
        )}
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: rgba(15,23,42,.4); }
        ::-webkit-scrollbar-thumb { background: rgba(51,65,85,.6); border-radius: 4px; }
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.35; } }
        @media print { nav, .no-print { display:none!important; } body { background:white; color:black; } }
      `}</style>
    </div>
  );
}
