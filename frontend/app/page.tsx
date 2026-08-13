"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ShieldCheck, ShieldAlert, Lock, RefreshCw, Database,
  Send, Mic, MicOff, RotateCcw, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Clock, Zap, Brain, Search,
  Shield, GitBranch, Download, Printer, Trash2, Shuffle,
  BarChart3, Users, Activity, FileText, AlertTriangle,
  Globe, Languages, Volume2, VolumeX, Copy, Filter,
  SortDesc, MoreHorizontal, Play, Pause, Settings,
  BookOpen, Hash, Terminal, Eye, EyeOff, Bell, BellOff,
  Network, Cpu, HardDrive, ArrowRight, Info, Star,
  CheckSquare, Loader2, Fingerprint, X, ChevronDown
} from "lucide-react";

// ─────────────────────────────────────────────
// CONSTANTS & TYPES
// ─────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const LANGS: { code: string; name: string; native: string; flag: string }[] = [
  { code: "en", name: "English",    native: "English",    flag: "🇬🇧" },
  { code: "hi", name: "Hindi",      native: "हिंदी",       flag: "🇮🇳" },
  { code: "bn", name: "Bengali",    native: "বাংলা",       flag: "🇧🇩" },
  { code: "te", name: "Telugu",     native: "తెలుగు",      flag: "🔵" },
  { code: "mr", name: "Marathi",    native: "मराठी",       flag: "🟠" },
  { code: "ta", name: "Tamil",      native: "தமிழ்",      flag: "🟡" },
  { code: "gu", name: "Gujarati",   native: "ગુજરાતી",    flag: "🟢" },
  { code: "kn", name: "Kannada",    native: "ಕನ್ನಡ",       flag: "🔴" },
  { code: "ml", name: "Malayalam",  native: "മലയാളം",     flag: "🟣" },
  { code: "pa", name: "Punjabi",    native: "ਪੰਜਾਬੀ",     flag: "🟤" },
  { code: "or", name: "Odia",       native: "ଓଡ଼ିଆ",      flag: "🟠" },
  { code: "as", name: "Assamese",   native: "অসমীয়া",    flag: "🔷" },
  { code: "ur", name: "Urdu",       native: "اردو",        flag: "🟩" },
];

const SAMPLE_QUERIES: Record<string, string[]> = {
  en: [
    "Request lab booking for Thursday and generate a NOC for my capstone project",
    "Apply for 4 days hostel leave and inform my mentor",
    "Book the seminar hall for the robotics workshop on Saturday",
    "Raise a fee refund request for the duplicate semester payment",
    "Issue conduct certificate for campus placement interview",
  ],
  hi: [
    "गुरुवार के लिए लैब बुकिंग का अनुरोध करें और मेरे कैपस्टोन प्रोजेक्ट के लिए एनओसी तैयार करें",
    "4 दिन के छात्रावास अवकाश के लिए आवेदन करें और मेरे मेंटर को सूचित करें",
    "शनिवार को रोबोटिक्स वर्कशॉप के लिए सेमिनार हॉल बुक करें",
    "डुप्लीकेट सेमेस्टर भुगतान के लिए शुल्क वापसी का अनुरोध करें",
    "कैंपस प्लेसमेंट इंटरव्यू के लिए आचरण प्रमाण पत्र जारी करें",
  ],
  bn: [
    "বৃহস্পতিবার ল্যাব বুকিং অনুরোধ করুন এবং ক্যাপস্টোন প্রজেক্টের জন্য এনওসি তৈরি করুন",
    "৪ দিনের হোস্টেল ছুটির আবেদন করুন এবং মেন্টরকে জানান",
    "শনিবার রোবোটিক্স ওয়ার্কশপের জন্য সেমিনার হল বুক করুন",
    "ডুপ্লিকেট সেমিস্টার পেমেন্টের জন্য ফি ফেরতের অনুরোধ করুন",
  ],
  te: [
    "గురువారం ల్యాబ్ బుకింగ్ కోసం అభ్యర్థించండి మరియు నా ప్రాజెక్ట్‌కు NOC తయారు చేయండి",
    "4 రోజుల హాస్టల్ సెలవు కోసం దరఖాస్తు చేయండి మరియు మెంటర్‌కు తెలియజేయండి",
    "శనివారం రోబోటిక్స్ వర్క్‌షాప్ కోసం సెమినార్ హాల్ బుక్ చేయండి",
  ],
  ta: [
    "வியாழக்கிழமை ஆய்வகம் முன்பதிவு செய்யுங்கள் மற்றும் திட்டத்திற்கு NOC உருவாக்குங்கள்",
    "4 நாள் விடுதி விடுப்புக்கு விண்ணப்பிக்கவும் மற்றும் வழிகாட்டிக்கு தெரிவிக்கவும்",
  ],
  mr: [
    "गुरुवारी लॅब बुकिंगसाठी विनंती करा आणि प्रकल्पासाठी NOC तयार करा",
    "4 दिवसांच्या वसतिगृह रजेसाठी अर्ज करा आणि मार्गदर्शकाला कळवा",
  ],
};

const AGENT_STEPS = [
  { id: "planner",   label: "Planner Agent",    icon: Brain,      color: "#7c3aed", desc: "Decompose intent into executable graph" },
  { id: "retrieval", label: "Retrieval Agent",   icon: Search,     color: "#0891b2", desc: "Retrieve institutional policy context" },
  { id: "execution", label: "Execution Agent",   icon: Zap,        color: "#d97706", desc: "Execute or escalate for human gate" },
  { id: "conflict",  label: "Conflict Agent",    icon: Shield,     color: "#dc2626", desc: "Policy-conflict & uncertainty sweep" },
  { id: "commit",    label: "Commit & Seal",     icon: GitBranch,  color: "#16a34a", desc: "Commit state change & seal audit record" },
];

const RAG_POLICIES = [
  { id: "POL-114", title: "Lab Allocation Policy §4.2",    desc: "Labs bookable 08:00–20:00 with faculty co-sign." },
  { id: "POL-207", title: "NOC Issuance Circular 2026",    desc: "NOC requires HoD sign-off and dues clearance." },
  { id: "POL-301", title: "Hostel Leave Manual §2",         desc: "Leave beyond 3 days escalates to the warden." },
  { id: "POL-455", title: "Equipment Custody Rules",        desc: "High-value equipment needs an accountable custodian." },
  { id: "POL-512", title: "Event & Venue Guidelines",       desc: "Auditorium bookings clash-checked against academic calendar." },
  { id: "POL-618", title: "Fee Refund Procedure §3",        desc: "Duplicate payments processed within 7 working days." },
  { id: "POL-720", title: "Conduct Certificate Standards",  desc: "Issued on departmental letterhead with HOD signature." },
  { id: "POL-831", title: "Academic Leave Policy",          desc: "Academic leave requires prior approval from faculty advisor." },
];

const ACTOR_LABELS: Record<string, string> = {
  planner_agent: "planner agent",
  retrieval_agent: "retrieval agent",
  execution_agent: "execution agent",
  conflict_agent: "conflict agent",
  "telegram_admin": "telegram admin",
};

// Multilingual UI labels
const UI_TEXT: Record<string, Record<string, string>> = {
  en: {
    appTitle: "Campus Agent AI",
    appSub: "Human-in-the-Loop Agentic Service Platform",
    navOrch: "Orchestration Console",
    navAudit: "Audit Ledger",
    serviceIntake: "Service Intake",
    serviceIntakeSub: "Speak or type your request — the orchestrator plans the rest.",
    dispatch: "Dispatch to Agents",
    voiceRequest: "Voice Request",
    resetDemo: "Reset demo",
    approvalGateway: "Human Approval Gateway",
    approvalSub: "Faculty dashboard · no state change commits without authorization.",
    ragCorpus: "Institutional RAG Corpus",
    ragSub: "Vector-indexed policy clauses the agents must cite.",
    agentPipeline: "Agent Execution Pipeline",
    auditLedger: "Auditable Log Ledger",
    auditSub: "Every agent action sealed into a hash-chained record.",
    chainIntegrity: "Chain Integrity",
    totalBlocks: "Total Audit Blocks",
    uniqueActors: "Unique Actors",
    lastSync: "Last Sync",
    refresh: "Refresh",
    verifyChain: "Verify chain",
    seedDemo: "Seed demo",
    restoreChain: "Restore chain",
    purge: "Purge",
    headHash: "Head hash",
    printReport: "Print report",
    exportJSON: "Export JSON",
    exportCSV: "Export CSV",
    compact: "Compact",
    sealedRecords: "sealed records",
    agentsHumans: "agents & humans",
    manual: "manual",
    allActors: "All actors",
    approve: "Approve",
    reject: "Reject",
    awaitingSignOff: "awaiting sign-off",
    searchPlaceholder: "Search actor, action or hash...",
    newestFirst: "Newest first",
    language: "Language",
    autoVerify: "Auto-verify",
    backToConsole: "← Back to orchestration console",
    viewLedger: "→ View audit ledger",
    steps: "Steps executed",
    humanGates: "Human gates",
    ledgerBlocks: "Ledger blocks",
    autonomousAgents: "Autonomous agents",
    sessionRequests: "session request",
    stopVoice: "Stop recording",
  },
  hi: {
    appTitle: "कैम्पस एजेंट AI",
    appSub: "मानव-नियंत्रण आधारित एजेंटिक सेवा प्लेटफ़ॉर्म",
    navOrch: "ऑर्केस्ट्रेशन कंसोल",
    navAudit: "ऑडिट लेजर",
    serviceIntake: "सेवा अनुरोध",
    serviceIntakeSub: "अपना अनुरोध बोलें या टाइप करें — ऑर्केस्ट्रेटर बाकी योजना बनाएगा।",
    dispatch: "एजेंट्स को भेजें",
    voiceRequest: "आवाज़ अनुरोध",
    resetDemo: "डेमो रीसेट करें",
    approvalGateway: "मानव अनुमोदन गेटवे",
    approvalSub: "फैकल्टी डैशबोर्ड · प्राधिकरण के बिना कोई बदलाव नहीं।",
    ragCorpus: "संस्थागत RAG कोष",
    ragSub: "वेक्टर-अनुक्रमित नीति खंड जिनका एजेंट उद्धरण करते हैं।",
    agentPipeline: "एजेंट निष्पादन पाइपलाइन",
    auditLedger: "ऑडिट लॉग लेजर",
    auditSub: "प्रत्येक एजेंट क्रिया हैश-चेन रिकॉर्ड में सीलबंद।",
    chainIntegrity: "चेन अखंडता",
    totalBlocks: "कुल ऑडिट ब्लॉक",
    uniqueActors: "अद्वितीय अभिनेता",
    lastSync: "अंतिम सिंक",
    refresh: "ताज़ा करें",
    verifyChain: "चेन सत्यापित करें",
    seedDemo: "डेमो डेटा",
    restoreChain: "चेन पुनर्स्थापित करें",
    purge: "हटाएं",
    headHash: "हेड हैश",
    printReport: "रिपोर्ट प्रिंट करें",
    exportJSON: "JSON निर्यात",
    exportCSV: "CSV निर्यात",
    compact: "संक्षिप्त",
    sealedRecords: "सीलबंद रिकॉर्ड",
    agentsHumans: "एजेंट और मानव",
    manual: "मैन्युअल",
    allActors: "सभी अभिनेता",
    approve: "अनुमोदन",
    reject: "अस्वीकार",
    awaitingSignOff: "हस्ताक्षर की प्रतीक्षा",
    searchPlaceholder: "अभिनेता, क्रिया या हैश खोजें...",
    newestFirst: "नवीनतम पहले",
    language: "भाषा",
    autoVerify: "स्वतः सत्यापन",
    backToConsole: "← ऑर्केस्ट्रेशन कंसोल पर वापस",
    viewLedger: "→ ऑडिट लेजर देखें",
    steps: "निष्पादित चरण",
    humanGates: "मानव गेट",
    ledgerBlocks: "लेजर ब्लॉक",
    autonomousAgents: "स्वायत्त एजेंट",
    sessionRequests: "सत्र अनुरोध",
    stopVoice: "रिकॉर्डिंग बंद करें",
  },
};

function t(lang: string, key: string): string {
  return (UI_TEXT[lang] || UI_TEXT["en"])[key] || UI_TEXT["en"][key] || key;
}

// ─────────────────────────────────────────────
// MOCK BACKEND (for demo without live server)
// ─────────────────────────────────────────────
let mockSeq = 1;
const mockLogs: any[] = [
  { sequence_id: 1, thread_id: "DEMO-001", actor_id: "planner_agent", decision: "PLANNED", action_type: "TASK_DECOMPOSITION", action_payload: { operation: "Decompose intent", confidence: 97 }, created_at: new Date(Date.now() - 120000).toISOString(), previous_hash: "0000000000000000000000000000000000000000000000000000000000000000", record_hash: "0x7a8641b4010" + Math.random().toString(16).slice(2, 12) },
  { sequence_id: 2, thread_id: "DEMO-001", actor_id: "retrieval_agent", decision: "RETRIEVED", action_type: "POLICY_LOOKUP", action_payload: { operation: "Retrieve institutional policy context", policies: ["POL-114", "POL-207"] }, created_at: new Date(Date.now() - 90000).toISOString(), previous_hash: "0x7a8641b401066db273", record_hash: "0x72485cf801" + Math.random().toString(16).slice(2, 12) },
  { sequence_id: 3, thread_id: "DEMO-001", actor_id: "conflict_agent", decision: "ESCALATED", action_type: "CONSEQUENTIAL_ACTION", action_payload: { operation: "Compute fee adjustment", confidence: 71 }, created_at: new Date(Date.now() - 60000).toISOString(), previous_hash: "0x72485cf801066db273", record_hash: "0x97600b480" + Math.random().toString(16).slice(2, 12) },
  { sequence_id: 4, thread_id: "DEMO-001", actor_id: "telegram_admin", decision: "APPROVED", action_type: "HUMAN_GATE", action_payload: { operation: "Faculty approval via Telegram" }, created_at: new Date(Date.now() - 30000).toISOString(), previous_hash: "0x97600b480109663096", record_hash: "0xf3d9e1b20" + Math.random().toString(16).slice(2, 12) },
];

interface PendingApproval {
  id: string;
  threadId: string;
  title: string;
  description: string;
  originQuery: string;
  timestamp: Date;
  status: "pending" | "approved" | "rejected";
  translatedTitle?: string;
}

interface AuditLog {
  sequence_id: number;
  thread_id: string;
  actor_id: string;
  decision: string;
  action_type: string;
  action_payload: any;
  created_at: string;
  previous_hash: string;
  record_hash: string;
}

// ─────────────────────────────────────────────
// TRANSLATION HELPER (calls backend /api/translate)
// ─────────────────────────────────────────────
async function translateText(text: string, toLang: string, fromLang = "en"): Promise<string> {
  if (toLang === "en" || toLang === fromLang) return text;
  // Try backend; fall back to a built-in lookup for demo
  try {
    const r = await fetch(`${API}/api/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, from_lang: fromLang, to_lang: toLang }),
    });
    if (r.ok) {
      const d = await r.json();
      return d.translated || text;
    }
  } catch {}
  // Demo fallback translations
  const fallbacks: Record<string, Record<string, string>> = {
    hi: {
      "Request dispatched to orchestrator": "अनुरोध ऑर्केस्ट्रेटर को भेजा गया",
      "Chain verified — every block hash matches": "चेन सत्यापित — सभी ब्लॉक हैश मेल खाते हैं",
      "Request approved successfully": "अनुरोध सफलतापूर्वक अनुमोदित",
      "Request rejected": "अनुरोध अस्वीकृत",
      "SUCCESS: Lab booking confirmed for Thursday. NOC generated.": "सफलता: गुरुवार के लिए लैब बुकिंग की पुष्टि हो गई। एनओसी तैयार।",
    },
    bn: {
      "Request dispatched to orchestrator": "অনুরোধ অর্কেস্ট্রেটরে পাঠানো হয়েছে",
      "Chain verified — every block hash matches": "চেইন যাচাই — সমস্ত ব্লক হ্যাশ মিলছে",
    },
    te: {
      "Request dispatched to orchestrator": "అభ్యర్థన ఆర్కెస్ట్రేటర్‌కు పంపబడింది",
    },
    ta: {
      "Request dispatched to orchestrator": "கோரிக்கை ஆர்கெஸ்ட்ரேட்டருக்கு அனுப்பப்பட்டது",
    },
  };
  return (fallbacks[toLang] || {})[text] || text;
}

// Detect which Indian language a string might be in
async function detectAndTranslateToEnglish(text: string): Promise<{ lang: string; translated: string }> {
  try {
    const r = await fetch(`${API}/api/detect_translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (r.ok) {
      const d = await r.json();
      return { lang: d.detected_lang || "en", translated: d.english_text || text };
    }
  } catch {}
  // Heuristic: if non-ASCII chars > 30% → treat as regional
  const nonAscii = (text.match(/[^\x00-\x7F]/g) || []).length;
  if (nonAscii / text.length > 0.3) {
    return { lang: "hi", translated: text }; // assume Hindi for demo
  }
  return { lang: "en", translated: text };
}

// ─────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────

function Orb({ className = "" }: { className?: string }) {
  return <div className={`absolute rounded-full pointer-events-none ${className}`} />;
}

function Btn3D({
  children, onClick, variant = "default", size = "md",
  className = "", disabled = false, loading = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "success" | "danger" | "ghost" | "violet";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  const variants = {
    default: "bg-slate-800/90 border-slate-700 hover:bg-slate-700 text-slate-100 shadow-slate-900/80",
    primary: "bg-gradient-to-br from-cyan-500 to-teal-600 border-cyan-400/50 hover:from-cyan-400 hover:to-teal-500 text-white shadow-cyan-900/60",
    success: "bg-gradient-to-br from-emerald-500 to-green-600 border-emerald-400/50 hover:from-emerald-400 hover:to-green-500 text-white shadow-emerald-900/60",
    danger: "bg-gradient-to-br from-rose-600 to-red-700 border-rose-500/50 hover:from-rose-500 hover:to-red-600 text-white shadow-rose-900/60",
    ghost: "bg-transparent border-slate-700/60 hover:bg-slate-800/60 text-slate-300",
    violet: "bg-gradient-to-br from-violet-600 to-purple-700 border-violet-500/50 hover:from-violet-500 hover:to-purple-600 text-white shadow-violet-900/60",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-6 py-3 text-base gap-2.5",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        relative inline-flex items-center justify-center font-medium rounded-xl border
        transition-all duration-150 cursor-pointer select-none
        ${sizes[size]} ${variants[variant]} ${className}
        ${disabled || loading ? "opacity-50 cursor-not-allowed" : ""}
        shadow-lg
        active:translate-y-[2px] active:shadow-md
        hover:-translate-y-[3px] hover:shadow-xl
        style-3d
      `}
      style={{
        transform: "perspective(600px) translateZ(0)",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
      }}
      onMouseEnter={e => {
        if (disabled || loading) return;
        (e.currentTarget as HTMLElement).style.transform = "perspective(600px) translateZ(8px) translateY(-2px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = "perspective(600px) translateZ(0)";
      }}
      onMouseDown={e => {
        (e.currentTarget as HTMLElement).style.transform = "perspective(600px) translateZ(2px) translateY(1px)";
      }}
      onMouseUp={e => {
        (e.currentTarget as HTMLElement).style.transform = "perspective(600px) translateZ(8px) translateY(-2px)";
      }}
    >
      {loading && <Loader2 className="animate-spin" size={14} />}
      {children}
    </button>
  );
}

function Card3D({ children, className = "", glowColor = "rgba(6,182,212,0.08)" }: {
  children: React.ReactNode; className?: string; glowColor?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -12;
    el.style.transform = `perspective(900px) rotateX(${y}deg) rotateY(${x}deg) translateZ(4px)`;
    el.style.boxShadow = `0 20px 60px rgba(0,0,0,0.4), 0 0 40px ${glowColor}`;
  }, [glowColor]);
  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)";
    el.style.boxShadow = "";
  }, []);
  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`bg-slate-900/80 border border-slate-700/60 rounded-2xl backdrop-blur-md transition-all duration-200 ${className}`}
      style={{ transformStyle: "preserve-3d", willChange: "transform" }}
    >
      {children}
    </div>
  );
}

function Toast({ msg, type, onDone }: { msg: string; type: "success" | "error" | "warn" | "info"; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);
  const colors = { success: "bg-emerald-950/90 border-emerald-500/50 text-emerald-200", error: "bg-rose-950/90 border-rose-500/50 text-rose-200", warn: "bg-amber-950/90 border-amber-500/50 text-amber-200", info: "bg-slate-900/90 border-slate-500/50 text-slate-200" };
  const icons = { success: <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />, error: <XCircle size={16} className="text-rose-400 shrink-0" />, warn: <AlertTriangle size={16} className="text-amber-400 shrink-0" />, info: <Info size={16} className="text-cyan-400 shrink-0" /> };
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-xl animate-in slide-in-from-top-2 duration-300 ${colors[type]}`}>
      {icons[type]}
      <span className="text-sm leading-snug">{msg}</span>
      <button onClick={onDone} className="ml-auto text-slate-400 hover:text-white shrink-0"><X size={14} /></button>
    </div>
  );
}

function AgentStepCard({ step, status, confidence }: {
  step: typeof AGENT_STEPS[0];
  status: "idle" | "running" | "done" | "gate";
  confidence?: number;
}) {
  const Icon = step.icon;
  const statusDot = { idle: "bg-slate-600", running: "bg-amber-400 animate-pulse", done: "bg-emerald-400", gate: "bg-violet-400 animate-pulse" };
  const statusBorder = { idle: "border-slate-700/50", running: "border-amber-500/40", done: "border-emerald-500/40", gate: "border-violet-500/50" };
  return (
    <div className={`flex items-start gap-4 p-4 rounded-xl border bg-slate-900/70 transition-all duration-300 ${statusBorder[status]}`}
      style={{ boxShadow: status !== "idle" ? `0 0 20px ${step.color}22` : undefined }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${step.color}22`, border: `1px solid ${step.color}44` }}>
        <Icon size={18} style={{ color: step.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-slate-100">{step.desc}</p>
          {status === "gate" && <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">human gate</span>}
          {status === "done" && <CheckCircle2 size={14} className="text-emerald-400" />}
        </div>
        <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">{step.label}</span>
        {confidence !== undefined && <span className="ml-2 text-xs text-slate-400">confidence {confidence}%</span>}
      </div>
      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${statusDot[status]}`} />
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
export default function CampusAgentApp() {
  const [view, setView] = useState<"orchestration" | "audit">("orchestration");
  const [lang, setLang] = useState("en");
  const [langOpen, setLangOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sessionRequests, setSessionRequests] = useState(0);
  const [dispatching, setDispatching] = useState(false);
  const [agentSteps, setAgentSteps] = useState<Record<string, "idle" | "running" | "done" | "gate">>({});
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(mockLogs);
  const [chainStatus, setChainStatus] = useState<"VALID" | "CORRUPTED" | "TAMPERED" | "UNVERIFIED">("VALID");
  const [autoVerify, setAutoVerify] = useState(false);
  const [logSearch, setLogSearch] = useState("");
  const [logFilter, setLogFilter] = useState("all");
  const [logSort, setLogSort] = useState<"newest" | "oldest">("newest");
  const [compactView, setCompactView] = useState(false);
  const [recording, setRecording] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; msg: string; type: "success" | "error" | "warn" | "info" }[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [headHashVisible, setHeadHashVisible] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [stats, setStats] = useState({ agents: 4, steps: 2, gates: 1, blocks: 4 });
  const recognitionRef = useRef<any>(null);
  const autoVerifyRef = useRef<any>(null);

  const addToast = useCallback((msg: string, type: "success" | "error" | "warn" | "info" = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(p => [...p.slice(-3), { id, msg, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(p => p.filter(t => t.id !== id));
  }, []);

  // ── AUTO-VERIFY INTERVAL ──
  useEffect(() => {
    if (autoVerify) {
      autoVerifyRef.current = setInterval(() => { handleVerifyChain(true); }, 10000);
    } else {
      clearInterval(autoVerifyRef.current);
    }
    return () => clearInterval(autoVerifyRef.current);
  }, [autoVerify]);

  // ── FETCH LOGS ──
  const fetchLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const r = await fetch(`${API}/api/audit/logs`);
      if (!r.ok) throw new Error();
      const d = await r.json();
      setAuditLogs(d.records || []);
      setChainStatus(d.chain_status || "VALID");
    } catch {
      // Use mock data
      setAuditLogs([...mockLogs]);
      setChainStatus("VALID");
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // ── VERIFY CHAIN ──
  const handleVerifyChain = useCallback(async (silent = false) => {
    try {
      const r = await fetch(`${API}/api/audit/verify`);
      if (r.ok) {
        const d = await r.json();
        setChainStatus(d.status);
        if (!silent) addToast(d.status === "VALID" ? t(lang, "Chain verified — every block hash matches") || "Chain verified — every block hash matches" : `Chain status: ${d.status}`, d.status === "VALID" ? "success" : "error");
      } else {
        throw new Error();
      }
    } catch {
      // Demo: verify mock chain
      setChainStatus("VALID");
      if (!silent) addToast("Chain verified — every block hash matches", "success");
    }
  }, [lang, addToast]);

  // ── SEED DEMO DATA ──
  const handleSeedDemo = useCallback(async () => {
    try {
      await fetch(`${API}/api/audit/seed`, { method: "POST" });
    } catch {}
    const newLogs = [...mockLogs];
    mockSeq = newLogs.length;
    for (let i = 0; i < 3; i++) {
      mockSeq++;
      const actors = ["planner_agent", "retrieval_agent", "conflict_agent", "telegram_admin"];
      const decisions = ["PLANNED", "RETRIEVED", "ESCALATED", "APPROVED"];
      const actions = ["TASK_DECOMPOSITION", "POLICY_LOOKUP", "CONSEQUENTIAL_ACTION", "HUMAN_GATE"];
      const idx = i % 4;
      newLogs.push({
        sequence_id: mockSeq,
        thread_id: `SEED-${mockSeq.toString().padStart(3, "0")}`,
        actor_id: actors[idx],
        decision: decisions[idx],
        action_type: actions[idx],
        action_payload: { operation: "Seeded demo record", index: mockSeq },
        created_at: new Date().toISOString(),
        previous_hash: `0x${Math.random().toString(16).slice(2, 18)}`,
        record_hash: `0x${Math.random().toString(16).slice(2, 18)}`,
      });
    }
    setAuditLogs(newLogs);
    setStats(s => ({ ...s, blocks: newLogs.length }));
    addToast("Demo data seeded — 3 new audit blocks added", "success");
  }, [addToast]);

  // ── PURGE LOGS ──
  const handlePurge = useCallback(async () => {
    if (!confirm("This will purge all audit logs. This cannot be undone. Continue?")) return;
    try {
      await fetch(`${API}/api/audit/purge`, { method: "DELETE" });
    } catch {}
    setAuditLogs([]);
    setStats(s => ({ ...s, blocks: 0 }));
    addToast("Audit ledger purged", "warn");
  }, [addToast]);

  // ── RESTORE CHAIN ──
  const handleRestoreChain = useCallback(async () => {
    try {
      await fetch(`${API}/api/audit/restore`, { method: "POST" });
      await fetchLogs();
      addToast("Chain restoration initiated", "info");
    } catch {
      addToast("Restore not available in demo mode", "warn");
    }
  }, [fetchLogs, addToast]);

  // ── EXPORT JSON ──
  const handleExportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(auditLogs, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `campus_audit_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    addToast("Audit log exported as JSON", "success");
  }, [auditLogs, addToast]);

  // ── EXPORT CSV ──
  const handleExportCSV = useCallback(() => {
    const headers = ["sequence_id", "thread_id", "actor_id", "decision", "action_type", "created_at", "record_hash"];
    const rows = auditLogs.map(l => headers.map(h => JSON.stringify((l as any)[h] ?? "")).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `campus_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    addToast("Audit log exported as CSV", "success");
  }, [auditLogs, addToast]);

  // ── PRINT REPORT ──
  const handlePrint = useCallback(() => {
    window.print();
    addToast("Print dialog opened", "info");
  }, [addToast]);

  // ── HEAD HASH ──
  const headHash = auditLogs.length > 0 ? auditLogs[auditLogs.length - 1].record_hash : "—";

  // ── COPY TO CLIPBOARD ──
  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => addToast("Copied to clipboard", "info")).catch(() => addToast("Copy failed", "error"));
  }, [addToast]);

  // ── DISPATCH REQUEST ──
  const handleDispatch = useCallback(async () => {
    const raw = query.trim();
    if (!raw) { addToast("Please enter a request first", "warn"); return; }
    setDispatching(true);
    setAgentSteps({ planner: "running" });

    // Detect & translate to English if needed
    const { lang: detectedLang, translated } = await detectAndTranslateToEnglish(raw);
    const englishQuery = translated;

    const threadId = `REQ-${Math.random().toString(36).slice(2, 10)}`;
    setSessionRequests(s => s + 1);

    // Animate pipeline steps
    const animate = async () => {
      await new Promise(r => setTimeout(r, 700));
      setAgentSteps({ planner: "done", retrieval: "running" });
      await new Promise(r => setTimeout(r, 900));
      setAgentSteps({ planner: "done", retrieval: "done", execution: "running" });
      await new Promise(r => setTimeout(r, 800));

      // Decide: consequential or general?
      const isConsequential = /certificate|booking|leave|refund|noc|hostel|fee|lab|hall|conduct/i.test(englishQuery);
      if (isConsequential) {
        setAgentSteps({ planner: "done", retrieval: "done", execution: "gate", conflict: "running" });
        await new Promise(r => setTimeout(r, 600));
        setAgentSteps({ planner: "done", retrieval: "done", execution: "gate", conflict: "done" });

        // Create pending approval
        const opName = englishQuery.length > 60 ? englishQuery.slice(0, 57) + "…" : englishQuery;
        let translatedTitle = opName;
        if (lang !== "en") {
          translatedTitle = await translateText(`Approval needed: ${opName}`, lang, "en");
        }
        const approval: PendingApproval = {
          id: Math.random().toString(36).slice(2),
          threadId,
          title: opName,
          description: "Finance/Admin action computed; requires officer sign-off.",
          originQuery: raw,
          timestamp: new Date(),
          status: "pending",
          translatedTitle,
        };
        setPendingApprovals(p => [approval, ...p]);
        setStats(s => ({ ...s, steps: s.steps + 1, gates: s.gates + 1 }));

        // Notify
        if (notifEnabled && "Notification" in window) {
          Notification.requestPermission().then(p => {
            if (p === "granted") new Notification("Campus Agent – Approval Required", { body: opName });
          });
        }

        const msg = `Request dispatched to orchestrator\n${threadId}`;
        let displayMsg = msg;
        if (lang !== "en") displayMsg = await translateText("Request dispatched to orchestrator", lang, "en") + `\n${threadId}`;
        addToast(displayMsg, "success");

        // Telegram (backend)
        try {
          await fetch(`${API}/api/request`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ thread_id: threadId, user_query: englishQuery }),
          });
        } catch {}

      } else {
        setAgentSteps({ planner: "done", retrieval: "done", execution: "done", conflict: "done", commit: "running" });
        await new Promise(r => setTimeout(r, 600));
        setAgentSteps({ planner: "done", retrieval: "done", execution: "done", conflict: "done", commit: "done" });

        let result = "SUCCESS: Retrieved campus information.";
        let displayResult = result;
        if (lang !== "en") displayResult = await translateText(result, lang, "en");
        addToast(displayResult, "success");

        // Add to audit
        mockSeq++;
        const newLog: AuditLog = {
          sequence_id: mockSeq,
          thread_id: threadId,
          actor_id: "planner_agent",
          decision: "COMPLETED",
          action_type: "GENERAL_INFO",
          action_payload: { operation: englishQuery.slice(0, 60), lang_detected: detectedLang },
          created_at: new Date().toISOString(),
          previous_hash: headHash,
          record_hash: "0x" + Math.random().toString(16).slice(2, 18),
        };
        setAuditLogs(p => [...p, newLog]);
        setStats(s => ({ ...s, steps: s.steps + 1, blocks: s.blocks + 1 }));
      }
    };

    try { await animate(); } catch {}
    setDispatching(false);
    setQuery("");
  }, [query, lang, notifEnabled, addToast, headHash]);

  // ── APPROVE / REJECT ──
  const handleApproval = useCallback(async (approvalId: string, decision: "APPROVED" | "REJECTED") => {
    setPendingApprovals(p => p.map(a => a.id === approvalId ? { ...a, status: decision === "APPROVED" ? "approved" : "rejected" } : a));
    setAgentSteps(prev => ({ ...prev, execution: "done", commit: "done" }));

    const approval = pendingApprovals.find(a => a.id === approvalId);
    if (!approval) return;

    try {
      await fetch(`${API}/api/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread_id: approval.threadId, decision }),
      });
    } catch {}

    mockSeq++;
    const newLog: AuditLog = {
      sequence_id: mockSeq,
      thread_id: approval.threadId,
      actor_id: "human_admin",
      decision,
      action_type: "HUMAN_GATE",
      action_payload: { operation: approval.title, decision },
      created_at: new Date().toISOString(),
      previous_hash: headHash,
      record_hash: "0x" + Math.random().toString(16).slice(2, 18),
    };
    setAuditLogs(p => [...p, newLog]);
    setStats(s => ({ ...s, blocks: s.blocks + 1 }));

    const baseMsg = decision === "APPROVED" ? "Request approved successfully" : "Request rejected";
    let msg = baseMsg;
    if (lang !== "en") msg = await translateText(baseMsg, lang, "en");
    addToast(msg, decision === "APPROVED" ? "success" : "warn");
  }, [pendingApprovals, lang, headHash, addToast]);

  // ── VOICE REQUEST ──
  const handleVoice = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { addToast("Speech recognition not supported in this browser", "error"); return; }

    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    // Use selected language code for recognition
    const speechLang = {
      en: "en-IN", hi: "hi-IN", bn: "bn-IN", te: "te-IN",
      mr: "mr-IN", ta: "ta-IN", gu: "gu-IN", kn: "kn-IN",
      ml: "ml-IN", pa: "pa-IN", or: "or-IN", as: "as-IN", ur: "ur-IN",
    }[lang] || "hi-IN";
    rec.lang = speechLang;
    rec.onstart = () => setRecording(true);
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join("");
      setQuery(transcript);
    };
    rec.onerror = () => { setRecording(false); addToast("Voice recognition error. Try again.", "error"); };
    rec.onend = () => setRecording(false);
    rec.start();
    recognitionRef.current = rec;
  }, [recording, lang, addToast]);

  // ── RESET DEMO ──
  const handleReset = useCallback(() => {
    setQuery("");
    setSessionRequests(0);
    setAgentSteps({});
    setPendingApprovals([]);
    addToast("Demo state reset", "info");
  }, [addToast]);

  // ── FILTERED / SORTED LOGS ──
  const filteredLogs = auditLogs
    .filter(l => {
      if (logSearch) {
        const s = logSearch.toLowerCase();
        return l.actor_id.includes(s) || l.decision.includes(s) || l.record_hash.includes(s) || l.action_type.toLowerCase().includes(s) || l.thread_id.toLowerCase().includes(s);
      }
      return true;
    })
    .filter(l => logFilter === "all" || l.actor_id === logFilter)
    .sort((a, b) => logSort === "newest" ? b.sequence_id - a.sequence_id : a.sequence_id - b.sequence_id);

  const uniqueActors = [...new Set(auditLogs.map(l => l.actor_id))];

  const currentLang = LANGS.find(l => l.code === lang) || LANGS[0];
  const sampleQueries = SAMPLE_QUERIES[lang] || SAMPLE_QUERIES["en"];

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans overflow-x-hidden relative">
      {/* Ambient Background Orbs */}
      <Orb className="w-[600px] h-[600px] bg-cyan-500/5 blur-[120px] top-[-200px] left-[-100px]" />
      <Orb className="w-[500px] h-[500px] bg-violet-500/6 blur-[100px] top-[200px] right-[-150px]" />
      <Orb className="w-[400px] h-[400px] bg-teal-500/4 blur-[100px] bottom-[100px] left-[30%]" />

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[360px] max-w-[calc(100vw-2rem)]">
        {toasts.map(t => <Toast key={t.id} msg={t.msg} type={t.type} onDone={() => removeToast(t.id)} />)}
      </div>

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/60">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Network size={18} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <div className="text-base font-bold text-white leading-none">{t(lang, "appTitle")}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-mono uppercase tracking-wider">{t(lang, "appSub")}</div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-1 ml-4 flex-1">
            {[
              { key: "orchestration", label: t(lang, "navOrch"), icon: Cpu },
              { key: "audit", label: t(lang, "navAudit"), icon: Lock },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setView(key as any)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
                  ${view === key ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"}`}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; }}
              >
                <Icon size={14} /><span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Notification toggle */}
            <button
              onClick={() => { setNotifEnabled(n => !n); addToast(notifEnabled ? "Notifications disabled" : "Notifications enabled", "info"); }}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all"
              title="Toggle notifications"
            >
              {notifEnabled ? <Bell size={16} /> : <BellOff size={16} />}
            </button>

            {/* Language selector */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-sm text-slate-300 hover:bg-slate-700 transition-all hover:-translate-y-0.5"
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "perspective(400px) translateZ(4px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; }}
              >
                <span>{currentLang.flag}</span>
                <span className="hidden md:inline">{currentLang.native}</span>
                <ChevronDown size={12} className={`transition-transform ${langOpen ? "rotate-180" : ""}`} />
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-slate-900/95 border border-slate-700/60 rounded-xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden">
                  <div className="p-1.5 max-h-80 overflow-y-auto">
                    {LANGS.map(l => (
                      <button
                        key={l.code}
                        onClick={() => { setLang(l.code); setLangOpen(false); addToast(`Language: ${l.native}`, "info"); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-slate-800 text-left
                          ${lang === l.code ? "bg-cyan-500/15 text-cyan-300" : "text-slate-300"}`}
                      >
                        <span className="text-base">{l.flag}</span>
                        <div><div className="font-medium">{l.native}</div><div className="text-xs text-slate-500">{l.name}</div></div>
                        {lang === l.code && <CheckCircle2 size={12} className="ml-auto text-cyan-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ────────────────────────────────────────
           ORCHESTRATION CONSOLE VIEW
      ──────────────────────────────────────── */}
      {view === "orchestration" && (
        <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
          {/* Hero stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: t(lang, "autonomousAgents"), value: stats.agents, icon: Cpu, color: "cyan", sub: "active" },
              { label: t(lang, "steps"), value: stats.steps, icon: Activity, color: "teal", sub: "this session" },
              { label: t(lang, "humanGates"), value: stats.gates, icon: Users, color: "violet", sub: "interventions" },
              { label: t(lang, "ledgerBlocks"), value: stats.blocks, icon: HardDrive, color: "emerald", sub: "sealed" },
            ].map(({ label, value, icon: Icon, color, sub }) => (
              <Card3D key={label} glowColor={`rgba(${color === "cyan" ? "6,182,212" : color === "teal" ? "20,184,166" : color === "violet" ? "139,92,246" : "16,185,129"},0.12)`}>
                <div className="p-5 flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-${color}-500/15 border border-${color}-500/30`}>
                    <Icon size={18} className={`text-${color}-400`} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{value}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{label}</div>
                    <div className="text-[10px] text-slate-600 font-mono">{sub}</div>
                  </div>
                </div>
              </Card3D>
            ))}
          </div>

          {/* Description */}
          <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
            A planner, retriever, executor and conflict sentinel collaborate over grounded campus policy — pausing for one-click human authorization before any real state change, and sealing every action into a tamper-evident ledger.
          </p>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* ── LEFT COLUMN: Service Intake + Approval Gateway ── */}
            <div className="xl:col-span-2 space-y-6">

              {/* SERVICE INTAKE */}
              <Card3D glowColor="rgba(6,182,212,0.1)">
                <div className="p-6 space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Globe size={18} className="text-cyan-400" />
                        <h2 className="text-lg font-bold">{t(lang, "serviceIntake")}</h2>
                        {sessionRequests > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300">
                            {sessionRequests} {t(lang, "sessionRequests")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400">{t(lang, "serviceIntakeSub")}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-700/40 shrink-0">
                      <Languages size={12} className="text-violet-400" />
                      <span>{currentLang.native}</span>
                    </div>
                  </div>

                  {/* Text area */}
                  <div className="relative">
                    <textarea
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleDispatch(); }}
                      placeholder={sampleQueries[0]}
                      rows={3}
                      className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 pt-3 pb-10 text-sm text-slate-100 placeholder-slate-600 resize-none focus:outline-none focus:border-cyan-500/60 focus:bg-slate-800/80 transition-all"
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-slate-600 font-mono">⌘/Ctrl + Enter</div>
                  </div>

                  {/* Quick-request chips */}
                  <div className="flex flex-col gap-2">
                    {sampleQueries.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => setQuery(q)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/40 border border-slate-700/50 text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800 hover:border-cyan-500/40 transition-all text-left truncate"
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "perspective(400px) translateZ(5px)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; }}
                      >
                        <Shuffle size={12} className="text-cyan-500 shrink-0" />
                        <span className="truncate">{q}</span>
                      </button>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center gap-3">
                    <Btn3D variant="primary" size="lg" onClick={handleDispatch} loading={dispatching} disabled={!query.trim()}>
                      <Send size={16} />
                      {t(lang, "dispatch")}
                    </Btn3D>
                    <Btn3D variant="default" size="lg" onClick={handleVoice}>
                      {recording ? <MicOff size={16} className="text-rose-400 animate-pulse" /> : <Mic size={16} />}
                      {recording ? t(lang, "stopVoice") : t(lang, "voiceRequest")}
                    </Btn3D>
                    <Btn3D variant="ghost" size="sm" onClick={handleReset}>
                      <Trash2 size={13} />
                      {t(lang, "resetDemo")}
                    </Btn3D>
                  </div>
                </div>
              </Card3D>

              {/* AGENT EXECUTION PIPELINE */}
              <Card3D glowColor="rgba(139,92,246,0.08)">
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3 mb-1">
                    <Terminal size={18} className="text-violet-400" />
                    <h2 className="text-lg font-bold">{t(lang, "agentPipeline")}</h2>
                  </div>
                  <div className="space-y-3">
                    {AGENT_STEPS.map((step, i) => {
                      const statusMap: Record<string, "idle" | "running" | "done" | "gate"> = {
                        planner: agentSteps.planner || "idle",
                        retrieval: agentSteps.retrieval || "idle",
                        execution: agentSteps.execution || "idle",
                        conflict: agentSteps.conflict || "idle",
                        commit: agentSteps.commit || "idle",
                      };
                      const confidences: Record<string, number> = { planner: 97, retrieval: 93, execution: 71, conflict: 88, commit: 100 };
                      const status = statusMap[step.id];
                      return (
                        <AgentStepCard
                          key={step.id}
                          step={step}
                          status={status}
                          confidence={status !== "idle" ? confidences[step.id] : undefined}
                        />
                      );
                    })}
                  </div>
                  {Object.keys(agentSteps).length > 0 && (
                    <button
                      onClick={() => setView("audit")}
                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mt-2 transition-colors"
                    >
                      {t(lang, "viewLedger")} <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              </Card3D>

              {/* HUMAN APPROVAL GATEWAY */}
              <Card3D glowColor="rgba(234,179,8,0.07)">
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                        <Bell size={18} className="text-amber-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold">{t(lang, "approvalGateway")}</h2>
                        <p className="text-xs text-slate-400">{t(lang, "approvalSub")}</p>
                      </div>
                    </div>
                    {pendingApprovals.filter(a => a.status === "pending").length > 0 && (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-medium animate-pulse">
                        {pendingApprovals.filter(a => a.status === "pending").length} pending
                      </span>
                    )}
                  </div>

                  {pendingApprovals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-600">
                      <Shield size={32} className="mb-3 opacity-40" />
                      <p className="text-sm">No approvals pending</p>
                      <p className="text-xs mt-1">Consequential requests will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingApprovals.map(approval => (
                        <div
                          key={approval.id}
                          className={`p-4 rounded-xl border transition-all ${
                            approval.status === "pending" ? "border-amber-500/40 bg-amber-500/5"
                            : approval.status === "approved" ? "border-emerald-500/30 bg-emerald-500/5 opacity-70"
                            : "border-rose-500/30 bg-rose-500/5 opacity-70"
                          }`}
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  approval.status === "pending" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                                  approval.status === "approved" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                                }`}>
                                  {approval.status === "pending" ? t(lang, "awaitingSignOff") : approval.status}
                                </span>
                                <span className="text-xs text-slate-500 font-mono">{approval.threadId}</span>
                              </div>
                              <p className="text-sm font-semibold text-slate-100 mb-0.5">{approval.title}</p>
                              <p className="text-xs text-slate-400">{approval.description}</p>
                              <p className="text-xs text-slate-500 mt-1 italic">"{approval.originQuery.slice(0, 80)}{approval.originQuery.length > 80 ? "…" : ""}"</p>
                              {approval.translatedTitle && lang !== "en" && approval.translatedTitle !== approval.title && (
                                <p className="text-xs text-violet-400 mt-1">{approval.translatedTitle}</p>
                              )}
                            </div>
                            <span className="text-xs text-slate-600 shrink-0">
                              {approval.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          {approval.status === "pending" && (
                            <div className="flex gap-3">
                              <Btn3D variant="success" size="sm" onClick={() => handleApproval(approval.id, "APPROVED")}>
                                <CheckCircle2 size={13} /> {t(lang, "approve")}
                              </Btn3D>
                              <Btn3D variant="danger" size="sm" onClick={() => handleApproval(approval.id, "REJECTED")}>
                                <XCircle size={13} /> {t(lang, "reject")}
                              </Btn3D>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card3D>
            </div>

            {/* ── RIGHT COLUMN: RAG Corpus + mini audit preview ── */}
            <div className="space-y-6">
              {/* RAG CORPUS */}
              <Card3D glowColor="rgba(20,184,166,0.07)">
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center">
                      <BookOpen size={16} className="text-teal-400" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold">{t(lang, "ragCorpus")}</h2>
                      <p className="text-xs text-slate-500">{t(lang, "ragSub")}</p>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
                    {RAG_POLICIES.map(p => (
                      <div
                        key={p.id}
                        className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 hover:border-teal-500/30 hover:bg-slate-800/70 transition-all cursor-pointer group"
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "perspective(400px) translateZ(4px)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; }}
                        onClick={() => addToast(`Viewing policy ${p.id}: ${p.title}`, "info")}
                      >
                        <span className="text-xs font-mono text-violet-400 block mb-1">{p.id}</span>
                        <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">{p.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{p.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card3D>

              {/* QUICK AUDIT PREVIEW */}
              <Card3D glowColor="rgba(16,185,129,0.07)">
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock size={15} className="text-emerald-400" />
                      <h3 className="text-sm font-bold">{t(lang, "auditLedger")}</h3>
                    </div>
                    <Btn3D variant="ghost" size="sm" onClick={() => setView("audit")}>
                      <Eye size={12} /> View all
                    </Btn3D>
                  </div>
                  <div className="space-y-2">
                    {auditLogs.slice(-3).reverse().map(log => (
                      <div key={log.sequence_id} className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/40 text-xs">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-mono text-violet-400">{ACTOR_LABELS[log.actor_id] || log.actor_id}</span>
                          <span className="text-slate-600">{new Date(log.created_at).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-slate-300">{log.action_payload?.operation || log.action_type}</p>
                        <p className="text-slate-600 font-mono mt-0.5 truncate">→ {log.record_hash}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${chainStatus === "VALID" ? "bg-emerald-400" : "bg-rose-400"}`} />
                    <span className="text-xs text-slate-400">{chainStatus === "VALID" ? "Chain valid" : chainStatus}</span>
                  </div>
                </div>
              </Card3D>
            </div>
          </div>
        </main>
      )}

      {/* ────────────────────────────────────────
           AUDIT LEDGER VIEW
      ──────────────────────────────────────── */}
      {view === "audit" && (
        <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Back button */}
          <Btn3D variant="ghost" size="sm" onClick={() => setView("orchestration")}>
            <ChevronLeft size={13} /> {t(lang, "backToConsole")}
          </Btn3D>

          {/* Header card */}
          <Card3D glowColor="rgba(6,182,212,0.1)">
            <div className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                  <Lock size={22} className="text-cyan-400" />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
                    Cryptographic Audit Ledger
                  </h1>
                  <p className="text-slate-400 text-sm mt-1">Hash-chained, tamper-evident record of every autonomous agent action.</p>
                  <div className="flex flex-wrap gap-3 mt-4">
                    <Btn3D variant="default" size="sm" onClick={fetchLogs} loading={isLoadingLogs}>
                      <RefreshCw size={13} /> {t(lang, "refresh")}
                    </Btn3D>
                    <Btn3D variant="default" size="sm" onClick={() => handleVerifyChain(false)}>
                      <ShieldCheck size={13} /> {t(lang, "verifyChain")}
                    </Btn3D>
                    <Btn3D
                      variant={autoVerify ? "primary" : "ghost"}
                      size="sm"
                      onClick={() => { setAutoVerify(a => !a); addToast(autoVerify ? "Auto-verify disabled" : "Auto-verify enabled (10s interval)", "info"); }}
                    >
                      <Zap size={13} /> {t(lang, "autoVerify")} {autoVerify ? "ON" : "OFF"}
                    </Btn3D>
                  </div>
                </div>
              </div>
            </div>
          </Card3D>

          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: t(lang, "chainIntegrity"), value: chainStatus, icon: chainStatus === "VALID" ? ShieldCheck : ShieldAlert, color: chainStatus === "VALID" ? "emerald" : "rose", isStatus: true },
              { label: t(lang, "totalBlocks"), value: `${auditLogs.length}`, icon: Database, color: "cyan", sub: t(lang, "sealedRecords") },
              { label: t(lang, "uniqueActors"), value: `${uniqueActors.length}`, icon: Fingerprint, color: "violet", sub: t(lang, "agentsHumans") },
              { label: t(lang, "lastSync"), value: new Date().toLocaleTimeString(), icon: Clock, color: "teal", sub: t(lang, "manual") },
            ].map(({ label, value, icon: Icon, color, sub, isStatus }) => (
              <Card3D key={label} glowColor={`rgba(${color === "emerald" ? "16,185,129" : color === "cyan" ? "6,182,212" : color === "violet" ? "139,92,246" : "20,184,166"},0.1)`}>
                <div className="p-4 flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-${color}-500/15 border border-${color}-500/30`}>
                    <Icon size={16} className={`text-${color}-400`} />
                  </div>
                  <div className="min-w-0">
                    <div className={`text-lg font-bold ${isStatus ? (chainStatus === "VALID" ? "text-emerald-400" : "text-rose-400") : "text-white"}`}>{value}</div>
                    <div className="text-xs text-slate-500 truncate">{label}</div>
                    {sub && <div className="text-[10px] text-slate-600 font-mono">{sub}</div>}
                  </div>
                </div>
              </Card3D>
            ))}
          </div>

          {/* Toolbar */}
          <Card3D>
            <div className="p-4 space-y-3">
              <div className="flex flex-wrap gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={logSearch}
                    onChange={e => setLogSearch(e.target.value)}
                    placeholder={t(lang, "searchPlaceholder")}
                    className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl pl-8 pr-4 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 transition-all"
                  />
                  {logSearch && (
                    <button onClick={() => setLogSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      <X size={12} />
                    </button>
                  )}
                </div>
                {/* Sort */}
                <Btn3D variant="default" size="sm" onClick={() => setLogSort(s => s === "newest" ? "oldest" : "newest")}>
                  <SortDesc size={13} /> {logSort === "newest" ? t(lang, "newestFirst") : "Oldest first"}
                </Btn3D>
                {/* Compact */}
                <Btn3D variant={compactView ? "primary" : "ghost"} size="sm" onClick={() => setCompactView(c => !c)}>
                  <BarChart3 size={13} /> {t(lang, "compact")}
                </Btn3D>
              </div>

              {/* Export/action row */}
              <div className="flex flex-wrap gap-2">
                <Btn3D variant="default" size="sm" onClick={handleExportJSON}><Download size={12} /> {t(lang, "exportJSON")}</Btn3D>
                <Btn3D variant="default" size="sm" onClick={handleExportCSV}><FileText size={12} /> {t(lang, "exportCSV")}</Btn3D>
                <Btn3D variant="default" size="sm" onClick={handlePrint}><Printer size={12} /> {t(lang, "printReport")}</Btn3D>
                <Btn3D variant="default" size="sm" onClick={() => { setHeadHashVisible(v => !v); }}>
                  {headHashVisible ? <EyeOff size={12} /> : <Eye size={12} />} {t(lang, "headHash")}
                </Btn3D>
                <Btn3D variant="violet" size="sm" onClick={handleSeedDemo}><Shuffle size={12} /> {t(lang, "seedDemo")}</Btn3D>
                <Btn3D variant="ghost" size="sm" onClick={handleRestoreChain}><RotateCcw size={12} /> {t(lang, "restoreChain")}</Btn3D>
                <Btn3D variant="danger" size="sm" onClick={handlePurge}><Trash2 size={12} /> {t(lang, "purge")}</Btn3D>
              </div>

              {headHashVisible && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/40">
                  <Hash size={12} className="text-cyan-400 shrink-0" />
                  <span className="text-xs font-mono text-cyan-300 flex-1 truncate">{headHash}</span>
                  <button onClick={() => handleCopy(headHash)} className="text-slate-500 hover:text-slate-200 transition-colors shrink-0">
                    <Copy size={12} />
                  </button>
                </div>
              )}

              {/* Actor filters */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setLogFilter("all")}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all hover:-translate-y-0.5 ${logFilter === "all" ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" : "bg-slate-800/60 text-slate-400 border-slate-700/40 hover:text-slate-200"}`}
                >
                  {t(lang, "allActors")}
                </button>
                {uniqueActors.map(actor => (
                  <button
                    key={actor}
                    onClick={() => setLogFilter(actor === logFilter ? "all" : actor)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all hover:-translate-y-0.5 ${logFilter === actor ? "bg-violet-500/20 text-violet-300 border-violet-500/40" : "bg-slate-800/60 text-slate-400 border-slate-700/40 hover:text-slate-200"}`}
                  >
                    {ACTOR_LABELS[actor] || actor}
                  </button>
                ))}
              </div>
            </div>
          </Card3D>

          {/* LOG ENTRIES */}
          <div className="space-y-3">
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                <Database size={40} className="mb-3 opacity-30" />
                <p>No records found</p>
                <Btn3D variant="violet" size="sm" className="mt-4" onClick={handleSeedDemo}>
                  <Shuffle size={12} /> Seed demo data
                </Btn3D>
              </div>
            ) : (
              filteredLogs.map(log => (
                <Card3D key={log.sequence_id} glowColor="rgba(139,92,246,0.06)" className="group">
                  <div className={`${compactView ? "p-3" : "p-4"}`}>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/25 flex items-center justify-center shrink-0 text-xs font-bold text-violet-400 font-mono">
                        {log.sequence_id}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          <span className="text-xs font-mono text-violet-400">{ACTOR_LABELS[log.actor_id] || log.actor_id}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            log.decision === "APPROVED" ? "bg-emerald-500/20 text-emerald-300" :
                            log.decision === "REJECTED" ? "bg-rose-500/20 text-rose-300" :
                            log.decision === "ESCALATED" ? "bg-amber-500/20 text-amber-300" :
                            "bg-slate-700/50 text-slate-400"
                          }`}>{log.decision}</span>
                          {!compactView && <span className="text-xs text-slate-600 font-mono">{log.thread_id}</span>}
                        </div>
                        <p className="text-sm text-slate-200 font-medium mb-1">{log.action_payload?.operation || log.action_type}</p>
                        {!compactView && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-slate-600">prev →</span>
                              <span className="font-mono text-slate-500 truncate flex-1">{log.previous_hash}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-slate-600">hash →</span>
                              <span className="font-mono text-cyan-500 truncate flex-1">{log.record_hash}</span>
                              <button onClick={() => handleCopy(log.record_hash)} className="text-slate-600 hover:text-slate-300 transition-colors shrink-0 opacity-0 group-hover:opacity-100">
                                <Copy size={11} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 shrink-0 text-right">
                        <div>{new Date(log.created_at).toLocaleTimeString()}</div>
                        {!compactView && <div className="text-[10px]">{new Date(log.created_at).toLocaleDateString()}</div>}
                      </div>
                    </div>
                  </div>
                </Card3D>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="text-center py-6 text-xs text-slate-700">
            Prototype demo · Planner / Retrieval / Execution / Conflict agents with human governance
          </div>
        </main>
      )}

      {/* Click outside lang dropdown */}
      {langOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
      )}

      <style jsx global>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: rgba(15,23,42,0.5); }
        ::-webkit-scrollbar-thumb { background: rgba(71,85,105,0.5); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(100,116,139,0.7); }
        @keyframes animate-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: animate-in 0.3s ease forwards; }
        .slide-in-from-top-2 { --tw-enter-translate-y: -0.5rem; }
        @media print {
          header, .no-print { display: none !important; }
          body { background: white; color: black; }
        }
      `}</style>
    </div>
  );
}
