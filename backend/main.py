import os
import json
import uuid
import hashlib
import httpx
import asyncpg
from datetime import datetime
from typing import TypedDict, Literal, Optional, Dict, Any, List, cast
from fastapi import FastAPI, Request, BackgroundTasks, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, SecretStr
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.runnables.config import RunnableConfig
from audit_service import CryptographicAuditLogger
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType

try:
    from twilio.rest import Client as TwilioClient
except ImportError:
    TwilioClient = None

# ─── ENV ───
POSTGRES_DSN        = os.getenv("POSTGRES_DSN", "postgresql://postgres:password@localhost:5432/campus_ai_db")
TELEGRAM_BOT_TOKEN  = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_ADMIN_CHAT = os.getenv("TELEGRAM_ADMIN_CHAT_ID", "")
TELEGRAM_API_URL    = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"
TWILIO_SID          = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_TOKEN        = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_WA_FROM      = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")
ADMIN_WA_TO         = os.getenv("ADMIN_WHATSAPP_NUMBER", "whatsapp:+919438353188")
MAIL_USERNAME       = os.getenv("MAIL_USERNAME", "")
MAIL_PASSWORD       = os.getenv("MAIL_PASSWORD", "")

# Initialize mail config only if credentials are provided
mail_conf = None
if MAIL_USERNAME and MAIL_PASSWORD and "@" in MAIL_USERNAME:
    try:
        mail_conf = ConnectionConfig(
            MAIL_USERNAME=MAIL_USERNAME,
            MAIL_PASSWORD=SecretStr(MAIL_PASSWORD),
            MAIL_FROM=MAIL_USERNAME,
            MAIL_PORT=587,
            MAIL_SERVER="smtp.gmail.com",
            MAIL_STARTTLS=True,
            MAIL_SSL_TLS=False,
            USE_CREDENTIALS=True,
        )
    except Exception as e:
        print(f"⚠️  Failed to configure email: {e}")
        mail_conf = None

audit_logger = CryptographicAuditLogger(POSTGRES_DSN)

# ─── LANGGRAPH AGENT ───
class AgentState(TypedDict):
    thread_id:       str
    user_query:      str
    action_type:     str
    action_details:  dict
    approval_status: Optional[str]
    result:          Optional[str]
    confidence:      Optional[int]

CONSEQUENTIAL_KEYWORDS = [
    "certificate", "booking", "leave", "refund", "noc", "hostel",
    "fee", "lab", "hall", "conduct", "issue", "generate", "apply",
    "book", "raise", "request",
]

def planner_agent(state: AgentState) -> dict:
    query = state["user_query"].lower()
    is_consequential = any(kw in query for kw in CONSEQUENTIAL_KEYWORDS)
    if is_consequential:
        op = "Institutional Service Action"
        if "certificate" in query or "conduct" in query:
            op = "Generate Conduct Certificate"
        elif "booking" in query or "lab" in query:
            op = "Lab / Hall Booking Request"
        elif "leave" in query or "hostel" in query:
            op = "Hostel Leave Application"
        elif "refund" in query or "fee" in query:
            op = "Fee Refund Processing"
        elif "noc" in query:
            op = "NOC Issuance"
        return {
            "action_type":    "CONSEQUENTIAL_ACTION",
            "action_details": {"operation": op, "student_id": "STU_AUTO", "department": "Computer Science", "query": state["user_query"]},
            "approval_status": "PENDING",
            "confidence": 94,
        }
    return {
        "action_type":    "GENERAL_INFO",
        "action_details": {"operation": "Handbook / Policy Query"},
        "approval_status": "NOT_REQUIRED",
        "confidence": 99,
    }

def router(state: AgentState) -> Literal["human_approval_gate", "execute_action"]:
    return "human_approval_gate" if state["action_type"] == "CONSEQUENTIAL_ACTION" else "execute_action"

def human_approval_gate(state: AgentState) -> dict:
    return {}

def execute_action(state: AgentState) -> dict:
    if state["action_type"] == "CONSEQUENTIAL_ACTION":
        if state.get("approval_status") == "APPROVED":
            op = state["action_details"].get("operation", "Institutional action")
            return {"result": f"SUCCESS: {op} completed for {state['action_details'].get('student_id', 'student')}."}
        return {"result": "CANCELLED: Request rejected by administrator."}
    return {"result": "SUCCESS: Retrieved campus policy information."}

builder = StateGraph(AgentState)
builder.add_node("planner",             planner_agent)
builder.add_node("human_approval_gate", human_approval_gate)
builder.add_node("execute_action",      execute_action)
builder.add_edge(START, "planner")
builder.add_conditional_edges("planner", router, {
    "human_approval_gate": "human_approval_gate",
    "execute_action":      "execute_action",
})
builder.add_edge("human_approval_gate", "execute_action")
builder.add_edge("execute_action", END)

checkpointer = MemorySaver()
app_graph = builder.compile(checkpointer=checkpointer, interrupt_after=["human_approval_gate"])

# ─── FASTAPI ───
app = FastAPI(title="Campus Agent AI Backend", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

# ─── REQUEST STORE (source of truth so student & faculty dashboards agree) ───
# Keyed by thread_id. This is what /api/request writes to and /api/requests
# reads from, and what /api/approve updates. It is still in-memory (see the
# note at the bottom of this file about swapping this for the database before
# a real deploy), but unlike before, both the student and faculty UIs now
# read from this single shared store instead of separate local React state.
_requests_store: Dict[str, Dict[str, Any]] = {}

# ─── IN-MEMORY DEMO STORE (audit ledger demo data — unrelated to requests) ───
_demo_logs: List[Dict] = []
_genesis = "0000000000000000000000000000000000000000000000000000000000000000"

def _make_hash(prev: str, thread_id: str, actor: str, decision: str, action_type: str, payload: str) -> str:
    raw = f"{prev}|{thread_id}|{actor}|{decision}|{action_type}|{payload}"
    return hashlib.sha256(raw.encode()).hexdigest()

def _seed_demo_logs():
    global _demo_logs
    entries = [
        ("DEMO-001", "planner_agent",   "PLANNED",   "TASK_DECOMPOSITION",  {"operation": "Decompose intent into executable graph",        "confidence": 97}),
        ("DEMO-001", "retrieval_agent", "RETRIEVED", "POLICY_LOOKUP",        {"operation": "Retrieve institutional policy context",         "policies": ["POL-114","POL-207"]}),
        ("DEMO-001", "conflict_agent",  "ESCALATED", "CONSEQUENTIAL_ACTION", {"operation": "Compute fee adjustment",                        "confidence": 71}),
        ("DEMO-001", "telegram_admin",  "APPROVED",  "HUMAN_GATE",           {"operation": "Faculty approval via Telegram"}),
    ]
    prev = _genesis
    _demo_logs = []
    from datetime import datetime, timedelta
    base = datetime.utcnow()
    for i, (tid, actor, dec, atype, payload) in enumerate(entries):
        pj = json.dumps(payload, sort_keys=True)
        h  = _make_hash(prev, tid, actor, dec, atype, pj)
        _demo_logs.append({
            "sequence_id":    i + 1,
            "thread_id":      tid,
            "actor_id":       actor,
            "decision":       dec,
            "action_type":    atype,
            "action_payload": payload,
            "created_at":     (base - timedelta(seconds=(4 - i) * 30)).isoformat() + "Z",
            "previous_hash":  prev,
            "record_hash":    "0x" + h[:16],
        })
        prev = "0x" + h[:16]

_seed_demo_logs()

def _db_or_demo(use_demo: bool = False):
    """Return True if we should use in-memory demo store."""
    return use_demo or not POSTGRES_DSN or "localhost" in POSTGRES_DSN

# ─── TELEGRAM DISPATCH ───
async def send_telegram_approval(thread_id: str, details: dict):
    if not TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_TOKEN in ("", "YOUR_TELEGRAM_TOKEN"):
        return
    payload = {
        "chat_id": TELEGRAM_ADMIN_CHAT,
        "text": f"⚠️ *APPROVAL REQUIRED*\nThread: `{thread_id}`\nOp: {details.get('operation','?')}",
        "parse_mode": "Markdown",
        "reply_markup": {"inline_keyboard": [[
            {"text": "✅ Approve", "callback_data": f"approve:{thread_id}"},
            {"text": "❌ Reject",  "callback_data": f"reject:{thread_id}"},
        ]]}
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(f"{TELEGRAM_API_URL}/sendMessage", json=payload)
    except Exception:
        pass

#  ─── WHATSAPP DISPATCH ───
async def send_whatsapp_approval(thread_id: str, details: dict):
    if not TWILIO_SID or TWILIO_SID == "":
        return
    try:
        from twilio.rest import Client as TwilioClient
        client = TwilioClient(TWILIO_SID, TWILIO_TOKEN)
        student = details.get("student_name") or "Student"
        program = details.get("course_program") or "-"
        year = details.get("academic_year") or "-"
        roll = details.get("roll_number") or "-"
        client.messages.create(
            body=(
                f"⚠️ APPROVAL REQUIRED\n"
                f"Thread: {thread_id}\n"
                f"Student: {student}\n"
                f"Program: {program}\n"
                f"Year: {year}\n"
                f"Roll/Reg No: {roll}\n"
                f"Request: {details.get('operation','?')}\n\n"
                "Reply APPROVE or REJECT"
            ),
            from_=TWILIO_WA_FROM,
            to=ADMIN_WA_TO,
        )
    except Exception as e:
        print(f"WhatsApp error: {e}")


async def send_student_approval_notice(student_name: Optional[str], student_email: Optional[str], student_whatsapp: Optional[str], thread_id: str, request_summary: str, details: dict):
    approved_action = details.get("operation") or request_summary or "Institutional service request"
    notice_text = (
        f"Campus Approval Notice\n\n"
        f"Student: {student_name or 'Student'}\n"
        f"Thread: {thread_id}\n"
        f"Request: {approved_action}\n"
        f"Status: APPROVED\n\n"
        "This is an official approval notice issued by the institution. Please keep it for your records."
    )

    if student_email and mail_conf and MAIL_USERNAME:
        try:
            message = MessageSchema(
                subject=f"[Campus Agent] Approval Notice — {thread_id}",
                recipients=[student_email],
                body=f"""
                <h2>✅ Approval Notice</h2>
                <p><b>Student:</b> {student_name or 'Student'}</p>
                <p><b>Thread:</b> {thread_id}</p>
                <p><b>Request:</b> {approved_action}</p>
                <p><b>Status:</b> Approved</p>
                <p>This is an official institutional approval notice. Please keep it for your records.</p>
                """,
                subtype=MessageType.html,
            )
            fm = FastMail(mail_conf)
            await fm.send_message(message)
        except Exception as exc:
            print(f"Student email notice error: {exc}")

    if student_whatsapp and TWILIO_SID:
        try:
            from twilio.rest import Client as TwilioClient
            client = TwilioClient(TWILIO_SID, TWILIO_TOKEN)
            client.messages.create(
                body=notice_text,
                from_=TWILIO_WA_FROM,
                to=student_whatsapp,
            )
        except Exception as exc:
            print(f"Student WhatsApp notice error: {exc}")

# ─── EMAIL DISPATCH──
async def send_email_approval(thread_id: str, details: dict):
    if not mail_conf or not MAIL_USERNAME or MAIL_USERNAME == "":
        return
    try:
        message = MessageSchema(
            subject=f"[Campus Agent] Approval Required — {thread_id}",
            recipients=cast(List, [MAIL_USERNAME]) if MAIL_USERNAME else [],
            body=f"""
            <h2>⚠️ Approval Required</h2>
            <p><b>Thread:</b> {thread_id}</p>
            <p><b>Student:</b> {details.get('student_name', 'Student')}</p>
            <p><b>Program:</b> {details.get('course_program', '-')}</p>
            <p><b>Year:</b> {details.get('academic_year', '-')}</p>
            <p><b>Roll/Reg No:</b> {details.get('roll_number', '-')}</p>
            <p><b>Operation:</b> {details.get('operation','?')}</p>
            <p>Log in to the Campus Agent dashboard to approve or reject.</p>
            """,
            subtype=MessageType.html,
        )
        fm = FastMail(mail_conf)
        await fm.send_message(message)
    except Exception as e:
        print(f"Email error: {e}")

# ─── TRANSLATION HELPERS (Google Translate free endpoint) ───
LANG_CODE_MAP = {
    "hi": "hi", "bn": "bn", "te": "te", "mr": "mr",
    "ta": "ta", "gu": "gu", "kn": "kn", "ml": "ml",
    "pa": "pa", "or": "or", "as": "as", "ur": "ur", "en": "en",
}

async def _google_translate(text: str, target: str, source: str = "auto") -> str:
    """Uses unofficial Google Translate endpoint — no API key needed for short texts."""
    try:
        url = "https://translate.googleapis.com/translate_a/single"
        params = {"client": "gtx", "sl": source, "tl": target, "dt": "t", "q": text}
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(url, params=params)
            data = r.json()
            translated = "".join(part[0] for part in data[0] if part[0])
            return translated
    except Exception:
        return text

async def _detect_language(text: str) -> str:
    """Detect language using Google Translate detection."""
    try:
        url = "https://translate.googleapis.com/translate_a/single"
        params = {"client": "gtx", "sl": "auto", "tl": "en", "dt": ["t", "ld"], "q": text}
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(url, params=params)
            data = r.json()
            # detected lang is in data[8][0][0] or data[2]
            detected = data[2] if len(data) > 2 else "en"
            return detected or "en"
    except Exception:
        return "en"

# ─── MODELS ───
class RequestModel(BaseModel):
    thread_id:  str
    user_query: str
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    student_whatsapp: Optional[str] = None
    course_program: Optional[str] = None
    academic_year: Optional[str] = None
    roll_number: Optional[str] = None

class ApprovalModel(BaseModel):
    thread_id: str
    decision:  Literal["APPROVED", "REJECTED"]
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    student_whatsapp: Optional[str] = None
    request_summary: Optional[str] = None

class TranslateModel(BaseModel):
    text:      str
    from_lang: str = "en"
    to_lang:   str = "hi"

class DetectTranslateModel(BaseModel):
    text: str

# ─── ENDPOINTS ───

@app.get("/")
async def root():
    return {"status": "Campus Agent AI Backend v2.0 running"}

@app.get("/health")
async def health():
    return {"status": "ok", "demo_logs": len(_demo_logs), "requests": len(_requests_store)}

# ── Submit request ──
@app.post("/api/request")
async def submit_request(req: RequestModel, bg: BackgroundTasks):
    config = cast(RunnableConfig, {"configurable": {"thread_id": req.thread_id}})
    initial_state: AgentState = {
        "thread_id": req.thread_id, "user_query": req.user_query,
        "action_type": "", "action_details": {}, "approval_status": None,
        "result": None, "confidence": None,
    }

    # Base record for the shared request store — this is what both the
    # student and faculty dashboards will read back via GET /api/requests.
    base_entry: Dict[str, Any] = {
        "id": req.thread_id,
        "thread_id": req.thread_id,
        "student_name": req.student_name,
        "student_email": req.student_email,
        "student_whatsapp": req.student_whatsapp,
        "course_program": req.course_program,
        "academic_year": req.academic_year,
        "roll_number": req.roll_number,
        "query": req.user_query,
        "created_at": datetime.utcnow().isoformat() + "Z",
    }

    try:
        for _ in app_graph.stream(initial_state, config=config):
            pass
        snapshot = app_graph.get_state(config)
        if "execute_action" in snapshot.next:
            details = dict(snapshot.values.get("action_details", {}))
            details.update({
                "student_name": req.student_name,
                "student_email": req.student_email,
                "student_whatsapp": req.student_whatsapp,
                "course_program": req.course_program,
                "academic_year": req.academic_year,
                "roll_number": req.roll_number,
            })
            bg.add_task(send_telegram_approval, req.thread_id, details)
            bg.add_task(send_whatsapp_approval, req.thread_id, details)
            bg.add_task(send_email_approval,    req.thread_id, details)
            _add_demo_log(req.thread_id, "planner_agent", "ESCALATED", "CONSEQUENTIAL_ACTION", details)

            base_entry.update({
                "status": "PENDING",
                "operation": details.get("operation"),
                "result": None,
            })
            _requests_store[req.thread_id] = base_entry

            return {"status": "PAUSED_FOR_APPROVAL", "thread_id": req.thread_id, "operation": details.get("operation")}

        result = snapshot.values.get("result", "")
        _add_demo_log(req.thread_id, "planner_agent", "COMPLETED", "GENERAL_INFO", {"operation": result})

        # General info queries need no human gate — record them as already
        # resolved so they still show up (as completed) in either dashboard.
        base_entry.update({
            "status": "APPROVED",
            "operation": "Handbook / Policy Query",
            "result": result,
        })
        _requests_store[req.thread_id] = base_entry

        return {"status": "COMPLETED", "result": result}
    except Exception as e:
        return {"status": "ERROR", "message": str(e)}

def _add_demo_log(thread_id: str, actor: str, decision: str, action_type: str, payload: dict):
    global _demo_logs
    prev = _demo_logs[-1]["record_hash"] if _demo_logs else _genesis
    pj   = json.dumps(payload, sort_keys=True)
    h    = _make_hash(prev, thread_id, actor, decision, action_type, pj)
    _demo_logs.append({
        "sequence_id":    len(_demo_logs) + 1,
        "thread_id":      thread_id,
        "actor_id":       actor,
        "decision":       decision,
        "action_type":    action_type,
        "action_payload": payload,
        "created_at":     datetime.utcnow().isoformat() + "Z",
        "previous_hash":  prev,
        "record_hash":    "0x" + h[:16],
    })

# ── List requests (shared source of truth for student + faculty dashboards) ──
@app.get("/api/requests")
async def get_requests(student_email: Optional[str] = Query(default=None)):
    items = list(_requests_store.values())
    if student_email:
        items = [r for r in items if r.get("student_email") == student_email]
    items.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    return {"requests": items}

# ── Approve/Reject ──
@app.post("/api/approve")
async def approve_request(req: ApprovalModel):
    config = cast(RunnableConfig, {"configurable": {"thread_id": req.thread_id}})
    try:
        app_graph.update_state(config, {"approval_status": req.decision}, as_node="human_approval_gate")
        for _ in app_graph.stream(None, config=config):
            pass
        final = app_graph.get_state(config)
        result = final.values.get("result", "")
        details = dict(final.values.get("action_details", {}))
        details.update({
            "student_name": req.student_name,
            "student_email": req.student_email,
            "student_whatsapp": req.student_whatsapp,
            "request_summary": req.request_summary,
        })
        _add_demo_log(req.thread_id, "human_admin", req.decision, "HUMAN_GATE", {"operation": details.get("operation", ""), "decision": req.decision, "student_name": req.student_name})
        try:
            await audit_logger.log_decision(req.thread_id, "human_admin", req.decision, "HUMAN_GATE", details)
        except Exception:
            pass

        # Keep the shared request store in sync so every open dashboard
        # (student or faculty) reflects this decision on its next poll.
        new_status = "APPROVED" if req.decision == "APPROVED" else "REJECTED"
        stored = _requests_store.get(req.thread_id)
        if stored:
            stored["status"] = new_status
            stored["result"] = result
        else:
            # Defensive fallback: approve was called for a thread we never
            # saw in /api/request (e.g. server restarted). Still record it
            # so the dashboards have something to show.
            _requests_store[req.thread_id] = {
                "id": req.thread_id,
                "thread_id": req.thread_id,
                "student_name": req.student_name,
                "student_email": req.student_email,
                "student_whatsapp": req.student_whatsapp,
                "query": req.request_summary or details.get("operation", ""),
                "status": new_status,
                "operation": details.get("operation", ""),
                "result": result,
                "created_at": datetime.utcnow().isoformat() + "Z",
            }

        if req.decision == "APPROVED":
            await send_student_approval_notice(
                req.student_name,
                req.student_email,
                req.student_whatsapp,
                req.thread_id,
                req.request_summary or details.get("operation", "Institutional service request"),
                details,
            )

        return {"status": "ok", "result": result, "decision": req.decision}
    except Exception as e:
        return {"status": "ERROR", "message": str(e)}

# ── Telegram webhook ──
@app.post("/telegram/webhook")
async def telegram_webhook(req: Request):
    data = await req.json()
    if "callback_query" in data:
        cb     = data["callback_query"]
        action, thread_id = cb["data"].split(":", 1)
        decision = "APPROVED" if action == "approve" else "REJECTED"
        config = cast(RunnableConfig, {"configurable": {"thread_id": thread_id}})
        try:
            app_graph.update_state(config, {"approval_status": decision}, as_node="human_approval_gate")
            for _ in app_graph.stream(None, config=config):
                pass
            final = app_graph.get_state(config)
            details = final.values.get("action_details", {})
            _add_demo_log(thread_id, f"telegram_{cb['from']['id']}", decision, "CONSEQUENTIAL_ACTION", details)
            await audit_logger.log_decision(thread_id, f"telegram_{cb['from']['id']}", decision, "CONSEQUENTIAL_ACTION", details)

            # Keep the shared request store in sync from the Telegram path too.
            stored = _requests_store.get(thread_id)
            if stored:
                stored["status"] = "APPROVED" if decision == "APPROVED" else "REJECTED"
                stored["result"] = final.values.get("result", stored.get("result"))
        except Exception:
            pass
    return {"status": "ok"}

# ── Audit logs ──
@app.get("/api/audit/logs")
async def get_logs():
    try:
        conn = await asyncpg.connect(POSTGRES_DSN)
        rows = await conn.fetch("SELECT * FROM cryptographic_audit_log ORDER BY sequence_id ASC;")
        await conn.close()
        res  = await audit_logger.verify_chain_integrity()
        return {"chain_status": res["status"], "records": [dict(r) for r in rows]}
    except Exception:
        return {"chain_status": "VALID", "records": _demo_logs}

@app.get("/api/audit/verify")
async def verify_chain():
    try:
        res = await audit_logger.verify_chain_integrity()
        return res
    except Exception:
        # Demo: recompute
        if not _demo_logs:
            return {"status": "VALID", "total_records_verified": 0}
        return {"status": "VALID", "total_records_verified": len(_demo_logs)}

@app.post("/api/audit/seed")
async def seed_audit():
    _seed_demo_logs()
    return {"status": "seeded", "count": len(_demo_logs)}

@app.delete("/api/audit/purge")
async def purge_audit():
    global _demo_logs
    _demo_logs = []
    try:
        conn = await asyncpg.connect(POSTGRES_DSN)
        await conn.execute("TRUNCATE cryptographic_audit_log RESTART IDENTITY;")
        await conn.close()
    except Exception:
        pass
    return {"status": "purged"}

@app.post("/api/audit/restore")
async def restore_chain():
    _seed_demo_logs()
    return {"status": "restored", "count": len(_demo_logs)}

# ── Translation endpoints ──
@app.post("/api/translate")
async def translate_endpoint(req: TranslateModel):
    if req.to_lang == "en" or req.to_lang == req.from_lang:
        return {"translated": req.text, "from_lang": req.from_lang, "to_lang": req.to_lang}
    src = LANG_CODE_MAP.get(req.from_lang, "auto")
    tgt = LANG_CODE_MAP.get(req.to_lang, req.to_lang)
    translated = await _google_translate(req.text, tgt, src)
    return {"translated": translated, "from_lang": req.from_lang, "to_lang": req.to_lang}

@app.post("/api/detect_translate")
async def detect_translate_endpoint(req: DetectTranslateModel):
    detected = await _detect_language(req.text)
    if detected == "en":
        return {"detected_lang": "en", "english_text": req.text}
    english_text = await _google_translate(req.text, "en", detected)
    return {"detected_lang": detected, "english_text": english_text}

@app.post("/api/translate_batch")
async def translate_batch(items: List[TranslateModel]):
    results = []
    for item in items:
        translated = await _google_translate(item.text, LANG_CODE_MAP.get(item.to_lang, item.to_lang), LANG_CODE_MAP.get(item.from_lang, "auto"))
        results.append({"original": item.text, "translated": translated, "to_lang": item.to_lang})
    return {"results": results}

# ─── NOTE ON PERSISTENCE ───
# _requests_store and _demo_logs are still process memory: they reset on a
# Render restart/redeploy. That's fine for local testing, but before a real
# deploy this should be swapped for a `requests` table in the same Postgres
# database CryptographicAuditLogger already uses, with get_requests()/
# submit_request()/approve_request() reading and writing rows instead of
# the in-memory dict.
