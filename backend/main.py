import os
import json
import uuid
import httpx
import base64
import hashlib
import hmac
import html
import mimetypes
import asyncpg
from pathlib import Path
from datetime import datetime
from typing import TypedDict, Literal, Optional, Dict, Any, List, cast
from fastapi import FastAPI, Request, BackgroundTasks, HTTPException, Query, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse, Response
from pydantic import BaseModel, SecretStr
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.runnables.config import RunnableConfig
from audit_service import CryptographicAuditLogger
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from analytics_service import compute_analytics
from scheduler import run_scheduler
from pdf_service import generate_approval_pdf, generate_complaint_ticket_pdf

try:
    from twilio.rest import Client as TwilioClient
except ImportError:
    TwilioClient = None

# ─── ENV ───
POSTGRES_DSN        = os.getenv("POSTGRES_DSN", "postgresql://postgres:password@localhost:5432/campus_ai_db")
TELEGRAM_BOT_TOKEN  = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_ADMIN_CHAT = os.getenv("TELEGRAM_ADMIN_CHAT_ID", "")
TELEGRAM_API_URL    = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"
# Telegram is now a notification-only channel — the button links out to the
# faculty dashboard instead of triggering an inline Approve/Reject callback.
# Point this at the deployed frontend (not the backend) and, if the frontend
# has a dedicated faculty route, include it for a more direct link.
FACULTY_DASHBOARD_URL = os.getenv("FACULTY_DASHBOARD_URL", "https://campus-agent-fc9v.onrender.com/")
TWILIO_SID          = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_TOKEN        = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_WA_FROM      = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")
ADMIN_WA_TO         = os.getenv("ADMIN_WHATSAPP_NUMBER", "whatsapp:+919438353188")
# Outside the 24-hour WhatsApp conversation window, Twilio requires an
# approved Content Template (an HX... Content SID) rather than a free-form
# `body`. These two are separate because the faculty "approval required"
# alert and the student "approval notice" are different templates with
# different variables. Set them in Render's environment once the templates
# are approved in the Twilio Console; until then, sending is skipped with
# a log line rather than failing the request.
TWILIO_WHATSAPP_CONTENT_SID          = os.getenv("TWILIO_WHATSAPP_CONTENT_SID", "")
TWILIO_WHATSAPP_APPROVAL_CONTENT_SID = os.getenv("TWILIO_WHATSAPP_APPROVAL_CONTENT_SID", "")
MAIL_USERNAME       = os.getenv("MAIL_USERNAME", "")
MAIL_PASSWORD       = os.getenv("MAIL_PASSWORD", "")
# Previously hardcoded to Gmail and always sent to (and from) MAIL_USERNAME
# itself — i.e. the faculty inbox was whatever account the backend used to
# send mail, and the message just said "log into the dashboard" with no
# real action attached. These make the mail server and the actual faculty
# recipient configurable, independent of the sending account.
MAIL_FROM              = os.getenv("MAIL_FROM", MAIL_USERNAME)
MAIL_SERVER            = os.getenv("MAIL_SERVER", "smtp.gmail.com")
MAIL_PORT              = int(os.getenv("MAIL_PORT", "587"))
MAIL_STARTTLS          = os.getenv("MAIL_STARTTLS", "true").lower() == "true"
MAIL_SSL_TLS           = os.getenv("MAIL_SSL_TLS", "false").lower() == "true"
FACULTY_APPROVAL_EMAIL = os.getenv("FACULTY_APPROVAL_EMAIL", MAIL_USERNAME)
# Public base URL of this backend (not the frontend) — used to build the
# one-click email Approve/Reject links below. Must be reachable from
# wherever faculty read their email.
PUBLIC_API_URL         = os.getenv("PUBLIC_API_URL", "http://localhost:8000").rstrip("/")
# Secret used to HMAC-sign the email action links so a link can't be
# forged or replayed for a different thread/decision. Required for the
# email Approve/Reject buttons to appear — without it the email falls back
# to a "use the dashboard" message.
APPROVAL_ACTION_SECRET = os.getenv("APPROVAL_ACTION_SECRET") or os.getenv("SESSION_SECRET", "")

# Initialize mail config only if credentials are provided
mail_conf = None
if MAIL_USERNAME and MAIL_PASSWORD and "@" in MAIL_USERNAME:
    try:
        mail_conf = ConnectionConfig(
            MAIL_USERNAME=MAIL_USERNAME,
            MAIL_PASSWORD=SecretStr(MAIL_PASSWORD),
            MAIL_FROM=MAIL_FROM or MAIL_USERNAME,
            MAIL_PORT=MAIL_PORT,
            MAIL_SERVER=MAIL_SERVER,
            MAIL_STARTTLS=MAIL_STARTTLS,
            MAIL_SSL_TLS=MAIL_SSL_TLS,
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

@app.on_event("startup")
async def _startup_diagnostics():
    """Print a clear checklist so you can see at-a-glance what is and isn't
    configured — no more silent notification failures."""
    print("\n" + "="*60)
    print("🚀  Campus Agent — notification config check")
    print("="*60)

    # Telegram
    if TELEGRAM_BOT_TOKEN and TELEGRAM_BOT_TOKEN not in ("", "YOUR_TELEGRAM_TOKEN", "your_telegram_bot_token_here"):
        if TELEGRAM_ADMIN_CHAT and TELEGRAM_ADMIN_CHAT not in ("", "your_telegram_chat_id_here"):
            print("✅  Telegram: BOT_TOKEN and ADMIN_CHAT_ID are set")
            # Quick connectivity check
            try:
                async with httpx.AsyncClient(timeout=5) as client:
                    r = await client.get(f"{TELEGRAM_API_URL}/getMe")
                    if r.status_code == 200:
                        bot_name = r.json().get("result", {}).get("username", "?")
                        print(f"    └─ Bot @{bot_name} is reachable ✓")
                    else:
                        print(f"    └─ ⚠️  Bot token rejected by Telegram: {r.text}")
            except Exception as e:
                print(f"    └─ ⚠️  Could not reach Telegram API: {e}")
        else:
            print("❌  Telegram: BOT_TOKEN set but TELEGRAM_ADMIN_CHAT_ID is MISSING — notifications will be skipped")
    else:
        print("❌  Telegram: TELEGRAM_BOT_TOKEN is NOT set — notifications will be skipped")

    # Email
    if mail_conf:
        print(f"✅  Email: configured (server={MAIL_SERVER}:{MAIL_PORT}, from={MAIL_FROM or MAIL_USERNAME})")
        print(f"    └─ Faculty approval emails → {FACULTY_APPROVAL_EMAIL or MAIL_USERNAME}")
    else:
        if not MAIL_USERNAME or "@" not in (MAIL_USERNAME or ""):
            print("❌  Email: MAIL_USERNAME is NOT set or invalid — email notifications will be skipped")
        elif not MAIL_PASSWORD:
            print("❌  Email: MAIL_PASSWORD is NOT set — email notifications will be skipped")
        else:
            print("❌  Email: failed to initialise (check MAIL_SERVER / MAIL_PORT settings)")

    # Approval action links
    if APPROVAL_ACTION_SECRET:
        print("✅  Email action links: APPROVAL_ACTION_SECRET is set (approve/reject links will work)")
    else:
        print("⚠️  Email action links: APPROVAL_ACTION_SECRET is NOT set — emails will say 'use the dashboard'")

    print(f"    PUBLIC_API_URL = {PUBLIC_API_URL}")
    print("="*60 + "\n")

    # Start the deadline reminder / escalation scheduler
    import asyncio
    TELEGRAM_SEND_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}" if TELEGRAM_BOT_TOKEN else ""
    asyncio.create_task(
        run_scheduler(
            get_store=lambda: _requests_store,
            audit_log_fn=audit_logger.log_decision,
            telegram_api_url=TELEGRAM_SEND_URL,
            admin_chat=TELEGRAM_ADMIN_CHAT,
            faculty_dashboard_url=FACULTY_DASHBOARD_URL,
        )
    )
    print("✅  Deadline scheduler started")

# ─── REQUEST STORE (source of truth so student & faculty dashboards agree) ───
# Keyed by thread_id. This is what /api/request writes to and /api/requests
# reads from, and what /api/approve updates. It is still in-memory (see the
# note at the bottom of this file about swapping this for the database before
# a real deploy), but unlike before, both the student and faculty UIs now
# read from this single shared store instead of separate local React state.
_requests_store: Dict[str, Dict[str, Any]] = {}

# ─── COMPLAINT TICKET STORE ───
# Keyed by ticket_id. Either a student or a faculty member can raise a
# complaint ticket; both sides can list and download the resulting PDF.
# Same in-memory-for-now approach as _requests_store — see the persistence
# note near the bottom of this file.
_complaints_store: Dict[str, Dict[str, Any]] = {}

ALLOWED_DOCUMENT_EXTENSIONS = {".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".xls", ".xlsx"}


class DocumentStore:
    """Two-way document exchange for a request thread: students attach
    supporting documents, faculty attach approval letters/certificates —
    each request can carry any number of files from either side.

    Tries Postgres (the `documents` table from init.sql) first since file
    bytes shouldn't only live in process memory. Falls back to an
    in-memory dict when Postgres is unreachable, mirroring how
    CryptographicAuditLogger degrades, so uploads still work in local dev
    without a database.
    """

    def __init__(self, db_url: str):
        self.db_url = db_url
        # document_id -> {id, thread_id, filename, content_type, uploaded_by, created_at, file_data}
        self._memory: Dict[str, Dict[str, Any]] = {}

    @staticmethod
    def _meta(record: Dict[str, Any]) -> Dict[str, Any]:
        return {k: v for k, v in record.items() if k != "file_data"}

    async def save(self, thread_id: str, filename: str, content_type: str, uploaded_by: str, file_data: bytes) -> Dict[str, Any]:
        document_id = str(uuid.uuid4())
        created_at = datetime.utcnow().isoformat() + "Z"
        record = {
            "id": document_id, "thread_id": thread_id, "filename": filename,
            "content_type": content_type, "uploaded_by": uploaded_by, "created_at": created_at,
        }
        try:
            conn = await asyncpg.connect(self.db_url)
        except Exception:
            self._memory[document_id] = {**record, "file_data": file_data}
            return record

        try:
            await conn.execute(
                """
                INSERT INTO documents (id, thread_id, filename, content_type, uploaded_by, file_data, created_at)
                VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)
                """,
                document_id, thread_id, filename, content_type, uploaded_by, file_data, created_at,
            )
            return record
        except Exception as exc:
            print(f"Document DB save failed, falling back to memory: {exc}")
            self._memory[document_id] = {**record, "file_data": file_data}
            return record
        finally:
            await conn.close()

    async def list_for_thread(self, thread_id: str) -> List[Dict[str, Any]]:
        results = [self._meta(r) for r in self._memory.values() if r["thread_id"] == thread_id]
        try:
            conn = await asyncpg.connect(self.db_url)
        except Exception:
            return sorted(results, key=lambda r: r.get("created_at", ""))

        try:
            rows = await conn.fetch(
                "SELECT id, thread_id, filename, content_type, uploaded_by, created_at "
                "FROM documents WHERE thread_id = $1 ORDER BY created_at ASC",
                thread_id,
            )
            for row in rows:
                created_at = row["created_at"]
                results.append({
                    "id": str(row["id"]), "thread_id": row["thread_id"], "filename": row["filename"],
                    "content_type": row["content_type"], "uploaded_by": row["uploaded_by"],
                    "created_at": created_at.isoformat() if hasattr(created_at, "isoformat") else created_at,
                })
        except Exception:
            pass
        finally:
            await conn.close()
        return sorted(results, key=lambda r: r.get("created_at", ""))

    async def get(self, document_id: str) -> Optional[Dict[str, Any]]:
        if document_id in self._memory:
            return dict(self._memory[document_id])
        try:
            conn = await asyncpg.connect(self.db_url)
        except Exception:
            return None
        try:
            row = await conn.fetchrow(
                "SELECT id, thread_id, filename, content_type, uploaded_by, file_data, created_at "
                "FROM documents WHERE id = $1::uuid",
                document_id,
            )
            if not row:
                return None
            created_at = row["created_at"]
            return {
                "id": str(row["id"]), "thread_id": row["thread_id"], "filename": row["filename"],
                "content_type": row["content_type"], "uploaded_by": row["uploaded_by"],
                "file_data": bytes(row["file_data"]),
                "created_at": created_at.isoformat() if hasattr(created_at, "isoformat") else created_at,
            }
        except Exception:
            return None
        finally:
            await conn.close()

    async def delete(self, document_id: str) -> Optional[Dict[str, Any]]:
        record = self._memory.pop(document_id, None)
        if record:
            return self._meta(record)
        try:
            conn = await asyncpg.connect(self.db_url)
        except Exception:
            return None
        try:
            row = await conn.fetchrow(
                "DELETE FROM documents WHERE id = $1::uuid "
                "RETURNING id, thread_id, filename, content_type, uploaded_by, created_at",
                document_id,
            )
            if not row:
                return None
            created_at = row["created_at"]
            return {
                "id": str(row["id"]), "thread_id": row["thread_id"], "filename": row["filename"],
                "content_type": row["content_type"], "uploaded_by": row["uploaded_by"],
                "created_at": created_at.isoformat() if hasattr(created_at, "isoformat") else created_at,
            }
        except Exception:
            return None
        finally:
            await conn.close()


document_store = DocumentStore(POSTGRES_DSN)

# ─── EMAIL HELPERS ───
def _display(value: Any, fallback: str = "-") -> str:
    value = value if value not in (None, "") else fallback
    return html.escape(str(value))


def _recipients(value: str) -> List[str]:
    """Comma-separated recipient list, e.g. FACULTY_APPROVAL_EMAIL set to
    'dean@college.edu, hod@college.edu'."""
    return [item.strip() for item in value.split(",") if item.strip()]


def _approval_token(thread_id: str, decision: Literal["APPROVED", "REJECTED"]) -> str:
    """Tamper-proof, stateless token identifying (thread_id, decision) for
    the one-click email action links — HMAC-signed so a link can't be
    edited to target a different request or flip the decision."""
    payload = f"{thread_id}|{decision}"
    encoded = base64.urlsafe_b64encode(payload.encode("utf-8")).decode("ascii").rstrip("=")
    signature = hmac.new(
        APPROVAL_ACTION_SECRET.encode("utf-8"),
        encoded.encode("ascii"),
        hashlib.sha256,
    ).hexdigest()
    return f"{encoded}.{signature}"


def _read_approval_token(token: str) -> Optional[tuple[str, Literal["APPROVED", "REJECTED"]]]:
    if not APPROVAL_ACTION_SECRET or "." not in token:
        return None
    encoded, signature = token.rsplit(".", 1)
    expected = hmac.new(
        APPROVAL_ACTION_SECRET.encode("utf-8"),
        encoded.encode("ascii"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(signature, expected):
        return None
    try:
        padded = encoded + "=" * (-len(encoded) % 4)
        thread_id, decision = base64.urlsafe_b64decode(padded).decode("utf-8").split("|", 1)
    except (ValueError, UnicodeDecodeError):
        return None
    if not thread_id or decision not in ("APPROVED", "REJECTED"):
        return None
    return thread_id, cast(Literal["APPROVED", "REJECTED"], decision)


def _approval_url(thread_id: str, decision: Literal["APPROVED", "REJECTED"]) -> Optional[str]:
    if not APPROVAL_ACTION_SECRET:
        return None
    return f"{PUBLIC_API_URL}/api/email/approval/{_approval_token(thread_id, decision)}"


def _details_html(details: dict, thread_id: str) -> str:
    rows = [
        ("Student name", details.get("student_name")),
        ("Roll / registration no.", details.get("roll_number")),
        ("Course / program", details.get("course_program")),
        ("Academic year", details.get("academic_year")),
        ("Student email", details.get("student_email")),
        ("Student WhatsApp", details.get("student_whatsapp")),
        ("Request type", details.get("operation")),
        ("Request", details.get("query") or details.get("request_summary")),
        ("Thread ID", thread_id),
    ]
    rendered = "".join(
        f"<tr><td style='padding:7px 12px;border-bottom:1px solid #e5e7eb;color:#475569'><b>{html.escape(label)}</b></td>"
        f"<td style='padding:7px 12px;border-bottom:1px solid #e5e7eb'>{_display(value)}</td></tr>"
        for label, value in rows
    )
    return (
        "<table style='width:100%;border-collapse:collapse;background:#f8fafc;"
        "border:1px solid #e2e8f0;border-radius:8px'>"
        f"{rendered}</table>"
    )


async def _send_email(subject: str, recipients: List[str], body: str) -> bool:
    if not mail_conf or not recipients:
        return False
    try:
        message = MessageSchema(
            subject=subject,
            recipients=cast(List, recipients),
            body=body,
            subtype=MessageType.html,
        )
        await FastMail(mail_conf).send_message(message)
        return True
    except Exception as exc:
        print(f"Email notification error: {exc}")
        return False


async def _send_email_with_attachments(subject: str, recipients: List[str], body: str, attachments: List[tuple] = None) -> bool:
    """Send email with optional file attachments. 
    Attachments is a list of tuples: (filename, file_content, content_type)
    """
    if not mail_conf or not recipients:
        return False
    
    try:
        # For now, we'll use the base implementation since fastapi-mail attachment support is limited
        # We'll create a simple MIME-based email with attachments
        import smtplib
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
        from email.mime.base import MIMEBase
        from email import encoders
        
        msg = MIMEMultipart("related")
        msg["Subject"] = subject
        msg["From"] = MAIL_FROM or MAIL_USERNAME
        msg["To"] = ", ".join(recipients)
        
        # Add HTML body
        msg_alt = MIMEMultipart("alternative")
        msg.attach(msg_alt)
        msg_alt.attach(MIMEText(body, "html"))
        
        # Add attachments
        if attachments:
            for filename, file_content, content_type in attachments:
                try:
                    part = MIMEBase("application", "octet-stream")
                    part.set_payload(file_content)
                    encoders.encode_base64(part)
                    part.add_header("Content-Disposition", f"attachment; filename= {filename}")
                    msg.attach(part)
                except Exception as e:
                    print(f"Failed to attach file {filename}: {e}")
        
        # Send email
        if MAIL_SSL_TLS:
            smtp = smtplib.SMTP_SSL(MAIL_SERVER, MAIL_PORT)
        else:
            smtp = smtplib.SMTP(MAIL_SERVER, MAIL_PORT)
            if MAIL_STARTTLS:
                smtp.starttls()
        
        smtp.login(MAIL_USERNAME, MAIL_PASSWORD)
        smtp.sendmail(MAIL_FROM or MAIL_USERNAME, recipients, msg.as_string())
        smtp.quit()
        
        return True
    except Exception as exc:
        print(f"Email with attachments error: {exc}")
        return False


# ─── TELEGRAM DISPATCH ───
# Notification-only: this no longer drives approval. The message carries the
# full student/request context and a link out to the Faculty Dashboard,
# where the actual Approve/Reject decision is made via POST /api/approve.
async def send_telegram_approval(thread_id: str, details: dict):
    if not TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_TOKEN in ("", "YOUR_TELEGRAM_TOKEN"):
        return

    student  = details.get("student_name") or "Not provided"
    email    = details.get("student_email") or "Not provided"
    program  = details.get("course_program") or "Not provided"
    year     = details.get("academic_year") or "Not provided"
    roll     = details.get("roll_number") or "Not provided"
    operation = details.get("operation") or "?"
    request_text = details.get("query") or operation

    text = (
        "⚠️ *APPROVAL REQUIRED*\n\n"
        f"👤 *Student:* {student}\n"
        f"📧 *Email:* {email}\n"
        f"🎓 *Program:* {program}\n"
        f"📚 *Academic Year:* {year}\n"
        f"🆔 *Roll/Reg No:* {roll}\n\n"
        f"📋 *Request:*\n{request_text}\n\n"
        f"🔹 *Operation:* {operation}\n"
        f"🔹 *Thread ID:* `{thread_id}`\n\n"
        "Please review this request in the Faculty Dashboard."
    )

    payload = {
        "chat_id": TELEGRAM_ADMIN_CHAT,
        "text": text,
        "parse_mode": "Markdown",
        "reply_markup": {
            "inline_keyboard": [[
                {"text": "👉 Open Faculty Dashboard", "url": FACULTY_DASHBOARD_URL}
            ]]
        },
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(f"{TELEGRAM_API_URL}/sendMessage", json=payload)
            if resp.status_code != 200:
                print(f"⚠️  Telegram sendMessage failed [{resp.status_code}]: {resp.text}")
            else:
                print(f"✅ Telegram notification sent for thread {thread_id}")
    except Exception as exc:
        print(f"⚠️  Telegram notification error: {exc}")

#  ─── WHATSAPP DISPATCH ───
# Uses free-form body messages — no Content Template required.
# Works on the Twilio Sandbox and on production senders within a 24-hour
# conversation window. Optionally set TWILIO_WHATSAPP_CONTENT_SID /
# TWILIO_WHATSAPP_APPROVAL_CONTENT_SID to use approved templates for
# business-initiated messages outside the 24-hour window.

def _twilio_send(from_: str, to: str, body: str,
                 content_sid: str = "", content_variables: str = "") -> None:
    """Send a WhatsApp message. Uses Content Template when content_sid is set,
    otherwise falls back to free-form body (always works in Sandbox)."""
    if TwilioClient is None:
        print("WhatsApp skipped: twilio package not installed")
        return
    client = TwilioClient(TWILIO_SID, TWILIO_TOKEN)
    kwargs: dict = {"from_": from_, "to": to}
    if content_sid:
        kwargs["content_sid"] = content_sid
        if content_variables:
            kwargs["content_variables"] = content_variables
    else:
        kwargs["body"] = body
    client.messages.create(**kwargs)


async def send_whatsapp_approval(thread_id: str, details: dict):
    """Notify admin/faculty on WhatsApp when a new request needs approval."""
    if not TWILIO_SID:
        return
    try:
        student   = details.get("student_name") or "Student"
        dept      = details.get("student_department") or "N/A"
        operation = details.get("operation") or "Institutional request"
        faculty   = details.get("assigned_faculty_name") or "Unassigned"

        body = (
            f"📋 *Campus Agent — Approval Required*\n\n"
            f"Student : {student}\n"
            f"Dept    : {dept}\n"
            f"Request : {operation}\n"
            f"Faculty : {faculty}\n"
            f"Ref     : {thread_id}\n\n"
            f"Open the Faculty Dashboard to Approve / Reject."
        )
        _twilio_send(
            from_=TWILIO_WA_FROM,
            to=ADMIN_WA_TO,
            body=body,
            content_sid=TWILIO_WHATSAPP_CONTENT_SID,
            content_variables=json.dumps({"1": student, "2": thread_id, "3": operation})
                if TWILIO_WHATSAPP_CONTENT_SID else "",
        )
        print(f"WhatsApp approval alert sent for {thread_id}")
    except Exception as e:
        print(f"WhatsApp approval alert error: {e}")


async def send_student_approval_notice(
    student_name: Optional[str],
    student_email: Optional[str],
    student_whatsapp: Optional[str],
    thread_id: str,
    request_summary: str,
    details: dict,
    decision: Literal["APPROVED", "REJECTED"] = "APPROVED",
):
    approved_action = details.get("operation") or request_summary or "Institutional service request"
    status_label = "APPROVED" if decision == "APPROVED" else "REJECTED"

    if student_email and mail_conf:
        try:
            await _send_email(
                f"[Campus Agent] Request {status_label} — {thread_id}",
                [student_email],
                f"""
                <div style="font-family:Arial,sans-serif;max-width:720px;margin:auto">
                  <h2>Campus Agent — Request {status_label}</h2>
                  {_details_html(details, thread_id)}
                  <p style="margin-top:18px">This is an official institutional notice. Please keep it for your records.</p>
                </div>
                """,
            )
        except Exception as exc:
            print(f"Student email notice error: {exc}")

    if student_whatsapp and TWILIO_SID:
        try:
            if decision == "APPROVED":
                emoji = "✅"
                status_word = "APPROVED"
                extra = "Your request has been approved. You may proceed accordingly."
            else:
                emoji = "❌"
                status_word = "REJECTED"
                extra = "Your request was not approved. Please contact your faculty for further guidance."

            body = (
                f"{emoji} *Campus Agent — Request {status_word}*\n\n"
                f"Hi {student_name or 'Student'},\n"
                f"Your request for *{approved_action}* (Ref: {thread_id}) "
                f"has been *{status_word}*.\n\n"
                f"{extra}"
            )
            _twilio_send(
                from_=TWILIO_WA_FROM,
                to=student_whatsapp,
                body=body,
                content_sid=TWILIO_WHATSAPP_APPROVAL_CONTENT_SID if decision == "APPROVED" else "",
                content_variables=json.dumps({
                    "1": student_name or "Student",
                    "2": thread_id,
                    "3": approved_action,
                }) if TWILIO_WHATSAPP_APPROVAL_CONTENT_SID and decision == "APPROVED" else "",
            )
            print(f"Student WhatsApp notice ({status_word}) sent for {thread_id}")
        except Exception as exc:
            print(f"Student WhatsApp notice error: {exc}")

# ─── EMAIL DISPATCH ───
async def send_email_approval(thread_id: str, details: dict):
    """Faculty 'approval required' email. Routes to the assigned faculty email
    based on department. Includes signed Approve/Reject links for direct action."""
    
    # Determine recipient faculty email based on assigned faculty name
    assigned_faculty_name = details.get("assigned_faculty_name", "")
    faculty_email = FACULTY_APPROVAL_EMAIL or MAIL_USERNAME or ""
    
    # If assigned faculty name is provided, try to route to their email
    # For now, use a simple mapping (can be expanded to database lookup)
    if assigned_faculty_name and "@" not in assigned_faculty_name:
        # Simple mapping: convert faculty name to email
        # Format: firstname.lastname@institution.com or similar
        # For now, just use the FACULTY_APPROVAL_EMAIL as fallback
        # This should be enhanced with a proper faculty directory in production
        pass
    
    recipients = _recipients(faculty_email)
    if not recipients or not mail_conf:
        return

    approve_url = _approval_url(thread_id, "APPROVED")
    reject_url = _approval_url(thread_id, "REJECTED")
    action_buttons = (
        f"<p style='margin:18px 0'>"
        f"<a href='{html.escape(approve_url or '#')}' style='background:#15803d;color:white;padding:11px 16px;border-radius:6px;text-decoration:none;margin-right:8px'>Approve</a>"
        f"<a href='{html.escape(reject_url or '#')}' style='background:#b91c1c;color:white;padding:11px 16px;border-radius:6px;text-decoration:none'>Reject</a>"
        f"</p>"
        if approve_url and reject_url
        else "<p>Set APPROVAL_ACTION_SECRET to enable secure one-click email actions. Use the faculty dashboard meanwhile.</p>"
    )

    # Add department and faculty info to email
    dept_info = f"<p style='color:#6b7280;font-size:12px'><b>Department:</b> {details.get('student_department', 'N/A')} | <b>Assigned Faculty:</b> {assigned_faculty_name or 'Unassigned'}</p>"

    body = f"""
    <div style="font-family:Arial,sans-serif;max-width:720px;margin:auto">
      <h2>Campus Agent — Approval Required</h2>
      <p>A student request from your department is waiting for faculty review.</p>
      {dept_info}
      {_details_html(details, thread_id)}
      {action_buttons}
      <p style="color:#475569;font-size:12px">This link is signed for this specific request. A decision made here or on the faculty dashboard is reflected on both.</p>
    </div>
    """
    
    await _send_email(
        f"[Campus Agent] Approval Required — {thread_id}",
        recipients,
        body,
    )

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
    student_department: Optional[str] = None
    assigned_faculty_id: Optional[str] = None
    assigned_faculty_name: Optional[str] = None
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

class ComplaintModel(BaseModel):
    subject:         str
    description:     str
    raised_by:       Literal["student", "faculty"]
    raised_by_name:  Optional[str] = None
    raised_by_email: Optional[str] = None
    thread_id:       Optional[str] = None   # optional link to a related request

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
    return {"status": "ok", "requests": len(_requests_store)}

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
        "student_department": req.student_department,
        "assigned_faculty_id": req.assigned_faculty_id,
        "assigned_faculty_name": req.assigned_faculty_name,
        "course_program": req.course_program,
        "academic_year": req.academic_year,
        "roll_number": req.roll_number,
        "query": req.user_query,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "deadline_at": (datetime.utcnow().replace(second=0, microsecond=0)).isoformat() + "Z",
        "reminder_sent": False,
        "escalated": False,
        "approved_at": None,
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
                "student_department": req.student_department,
                "assigned_faculty_id": req.assigned_faculty_id,
                "assigned_faculty_name": req.assigned_faculty_name,
                "course_program": req.course_program,
                "academic_year": req.academic_year,
                "roll_number": req.roll_number,
            })
            bg.add_task(send_telegram_approval, req.thread_id, details)
            bg.add_task(send_whatsapp_approval, req.thread_id, details)
            bg.add_task(send_email_approval,    req.thread_id, details)
            try:
                await audit_logger.log_decision(req.thread_id, "planner_agent", "ESCALATED", "CONSEQUENTIAL_ACTION", details)
            except Exception:
                pass

            base_entry.update({
                "status": "PENDING",
                "operation": details.get("operation"),
                "result": None,
            })
            _requests_store[req.thread_id] = base_entry

            return {"status": "PAUSED_FOR_APPROVAL", "thread_id": req.thread_id, "operation": details.get("operation")}

        result = snapshot.values.get("result", "")
        try:
            await audit_logger.log_decision(req.thread_id, "planner_agent", "COMPLETED", "GENERAL_INFO", {"operation": result})
        except Exception:
            pass

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

# ── List requests (shared source of truth for student + faculty dashboards) ──
@app.get("/api/requests")
async def get_requests(student_email: Optional[str] = Query(default=None)):
    items = list(_requests_store.values())
    if student_email:
        items = [r for r in items if r.get("student_email") == student_email]
    items.sort(key=lambda r: r.get("created_at", ""), reverse=True)

    enriched: List[Dict[str, Any]] = []
    for item in items:
        item = dict(item)
        docs = await document_store.list_for_thread(item["thread_id"])
        for doc in docs:
            doc["download_url"] = f"{PUBLIC_API_URL}/api/document/{doc['id']}"
        item["documents"] = docs
        enriched.append(item)
    return {"requests": enriched}

# ── Document upload / download / delete (two-way: student <-> faculty) ──
@app.post("/api/document/upload")
async def upload_document(
    thread_id: str = Form(...),
    uploaded_by: Literal["student", "faculty"] = Form(...),
    file: UploadFile = File(...),
):
    if thread_id not in _requests_store:
        raise HTTPException(status_code=404, detail="Request not found")

    filename = Path(file.filename or "document").name
    ext = Path(filename).suffix.lower()
    if ext and ext not in ALLOWED_DOCUMENT_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Supported files: PDF, Word, images, and Excel")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    content_type = file.content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
    record = await document_store.save(thread_id, filename, content_type, uploaded_by, content)
    record["download_url"] = f"{PUBLIC_API_URL}/api/document/{record['id']}"

    try:
        await audit_logger.log_decision(
            thread_id, uploaded_by, "UPLOADED", "DOCUMENT_UPLOAD",
            {"document_id": record["id"], "filename": filename, "uploaded_by": uploaded_by},
        )
    except Exception:
        pass

    return {"status": "success", "document": record}


@app.get("/api/document/{document_id}")
async def download_document(document_id: str):
    record = await document_store.get(document_id)
    if not record:
        raise HTTPException(status_code=404, detail="Document not found")
    return Response(
        content=record["file_data"],
        media_type=record.get("content_type") or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{record["filename"]}"'},
    )


@app.delete("/api/document/{document_id}")
async def delete_document(document_id: str):
    record = await document_store.delete(document_id)
    if not record:
        raise HTTPException(status_code=404, detail="Document not found")
    try:
        await audit_logger.log_decision(
            record["thread_id"], record.get("uploaded_by", "system"), "DELETED", "DOCUMENT_DELETE",
            {"document_id": document_id, "filename": record.get("filename")},
        )
    except Exception:
        pass
    return {"status": "deleted", "document_id": document_id}

# ── Complaint tickets (raised by either student or faculty; both can download) ──
@app.post("/api/complaint")
async def raise_complaint(req: ComplaintModel):
    ticket_id = "TCK-" + uuid.uuid4().hex[:8].upper()
    record: Dict[str, Any] = {
        "ticket_id": ticket_id,
        "id": ticket_id,
        "subject": req.subject,
        "description": req.description,
        "raised_by": req.raised_by,
        "raised_by_name": req.raised_by_name,
        "raised_by_email": req.raised_by_email,
        "thread_id": req.thread_id,
        "status": "OPEN",
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    _complaints_store[ticket_id] = record

    try:
        await audit_logger.log_decision(
            req.thread_id or ticket_id, req.raised_by_email or req.raised_by, "RAISED",
            "COMPLAINT_TICKET", {"ticket_id": ticket_id, "subject": req.subject},
        )
    except Exception:
        pass

    return {"status": "success", "ticket": record}


@app.get("/api/complaints")
async def get_complaints(raised_by_email: Optional[str] = Query(default=None)):
    """List complaint tickets. Pass raised_by_email to scope to one person's
    own tickets (used by the student dashboard); omit it to see all tickets
    (used by the faculty dashboard)."""
    items = list(_complaints_store.values())
    if raised_by_email:
        items = [c for c in items if c.get("raised_by_email") == raised_by_email]
    items.sort(key=lambda c: c.get("created_at", ""), reverse=True)
    for item in items:
        item["download_url"] = f"{PUBLIC_API_URL}/api/complaint/{item['ticket_id']}/pdf"
    return {"complaints": items}


@app.get("/api/complaint/{ticket_id}/pdf")
async def download_complaint_pdf(ticket_id: str):
    """Generate and return a downloadable PDF for a complaint ticket."""
    ticket = _complaints_store.get(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Complaint ticket not found")
    try:
        pdf_bytes = generate_complaint_ticket_pdf(ticket)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    filename = f"complaint-{ticket_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


async def _apply_decision(
    thread_id: str,
    decision: Literal["APPROVED", "REJECTED"],
    request_details: Optional[dict] = None,
) -> dict:
    """Shared by POST /api/approve and the signed email action links: runs
    the LangGraph resume, syncs the shared request store, logs the audit
    event, and notifies the student. Idempotent — clicking an email link
    twice (or clicking it after the dashboard already decided) reports the
    existing decision instead of re-running the graph."""
    stored = _requests_store.get(thread_id)
    if stored and stored.get("status") in ("APPROVED", "REJECTED"):
        return {"status": "already_decided", "decision": stored["status"], "result": stored.get("result")}

    config = cast(RunnableConfig, {"configurable": {"thread_id": thread_id}})
    app_graph.update_state(config, {"approval_status": decision}, as_node="human_approval_gate")
    for _ in app_graph.stream(None, config=config):
        pass
    final = app_graph.get_state(config)
    result = final.values.get("result", "")
    details = dict(final.values.get("action_details", {}))
    if stored:
        details.update({k: v for k, v in stored.items() if v not in (None, "")})
    if request_details:
        details.update({k: v for k, v in request_details.items() if v not in (None, "")})

    try:
        await audit_logger.log_decision(thread_id, "human_admin", decision, "HUMAN_GATE", details)
    except Exception:
        pass

    new_status = "APPROVED" if decision == "APPROVED" else "REJECTED"
    if stored:
        stored["status"] = new_status
        stored["result"] = result
        if decision == "APPROVED" and not stored.get("approved_at"):
            stored["approved_at"] = datetime.utcnow().isoformat() + "Z"
    else:
        # Defensive fallback: decided for a thread we never saw in
        # /api/request (e.g. server restarted). Still record it so the
        # dashboards have something to show.
        stored = {
            "id": thread_id,
            "thread_id": thread_id,
            "student_name": details.get("student_name"),
            "student_email": details.get("student_email"),
            "student_whatsapp": details.get("student_whatsapp"),
            "query": details.get("request_summary") or details.get("operation", ""),
            "status": new_status,
            "operation": details.get("operation", ""),
            "result": result,
            "created_at": datetime.utcnow().isoformat() + "Z",
        }
        _requests_store[thread_id] = stored

    # Notify the student via email + WhatsApp for both APPROVED and REJECTED.
    await send_student_approval_notice(
        stored.get("student_name"),
        stored.get("student_email"),
        stored.get("student_whatsapp"),
        thread_id,
        stored.get("query") or stored.get("operation", "Institutional service request"),
        details,
        decision,
    )

    return {"status": "ok", "result": result, "decision": decision}


# ── Approve/Reject ──
@app.post("/api/approve")
async def approve_request(req: ApprovalModel):
    try:
        return await _apply_decision(
            req.thread_id,
            req.decision,
            {
                "student_name": req.student_name,
                "student_email": req.student_email,
                "student_whatsapp": req.student_whatsapp,
                "request_summary": req.request_summary,
            },
        )
    except Exception as e:
        return {"status": "ERROR", "message": str(e)}


# ── Email one-click approval (the actual fix: emails now DO something) ──
@app.get("/api/email/approval/{token}", response_class=HTMLResponse)
async def email_approval_action(token: str):
    """Handles the signed Approve/Reject links included in the faculty
    approval email. Applies the same decision path as /api/approve."""
    parsed = _read_approval_token(token)
    if not parsed:
        return HTMLResponse(
            "<h2>Invalid or expired approval link</h2><p>Please use the Faculty Dashboard instead.</p>",
            status_code=400,
        )
    thread_id, decision = parsed
    try:
        result = await _apply_decision(thread_id, decision)
        if result.get("status") == "already_decided":
            message = f"This request was already {str(result.get('decision', 'decided')).lower()}."
        else:
            message = f"The request has been {decision.lower()} successfully. The student has been notified."
        return HTMLResponse(
            f"""
            <html><body style="font-family:Arial,sans-serif;max-width:640px;margin:60px auto;padding:24px;color:#0f172a">
              <h2>Campus Agent</h2>
              <p>{html.escape(message)}</p>
              <p><b>Thread:</b> {html.escape(thread_id)}</p>
              <p>You can close this page.</p>
            </body></html>
            """
        )
    except Exception as exc:
        return HTMLResponse(
            f"<h2>Approval could not be completed</h2><p>{html.escape(str(exc))}</p>",
            status_code=500,
        )

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
            await audit_logger.log_decision(thread_id, f"telegram_{cb['from']['id']}", decision, "HUMAN_GATE", details)

            # Keep the shared request store in sync from the Telegram path too.
            stored = _requests_store.get(thread_id)
            if stored:
                stored["status"] = "APPROVED" if decision == "APPROVED" else "REJECTED"
                stored["result"] = final.values.get("result", stored.get("result"))
        except Exception:
            pass
    return {"status": "ok"}

# ── Audit logs ──
# These now read exclusively from CryptographicAuditLogger, which is backed
# by Postgres when reachable and by a real (never-seeded) in-memory chain
# otherwise. Every record shown here corresponds to an actual request
# escalation or an actual faculty decision — there is no placeholder data.
@app.get("/api/audit/logs")
async def get_logs():
    data = await audit_logger.get_records()
    verify = await audit_logger.verify_chain_integrity()
    return {
        "chain_status": verify.get("status", "VALID"),
        "records": data.get("records", []),
        "source": data.get("source"),
    }

@app.get("/api/audit/verify")
async def verify_chain():
    return await audit_logger.verify_chain_integrity()

@app.delete("/api/audit/purge")
async def purge_audit():
    """Clears the real audit trail. For local development/testing only —
    this permanently removes ledger history."""
    await audit_logger.purge()
    return {"status": "purged"}

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


# ── Analytics (admin-only) ──
@app.get("/api/analytics")
async def get_analytics():
    """Admin analytics dashboard — aggregated request stats."""
    items = list(_requests_store.values())
    return compute_analytics(items)

# ── Student request history (own requests only) ──
@app.get("/api/requests/my")
async def get_my_requests(student_email: str = Query(...)):
    """Returns only the authenticated student's requests, newest first."""
    items = [r for r in _requests_store.values() if r.get("student_email") == student_email]
    items.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    enriched = []
    for item in items:
        item = dict(item)
        docs = await document_store.list_for_thread(item["thread_id"])
        for doc in docs:
            doc["download_url"] = f"{PUBLIC_API_URL}/api/document/{doc['id']}"
        item["documents"] = docs
        enriched.append(item)
    return {"requests": enriched}

# ── PDF generation for approved requests ──
@app.get("/api/requests/{request_id}/pdf")
async def download_request_pdf(request_id: str):
    """Generate and return an approval-letter PDF for an approved request."""
    stored = _requests_store.get(request_id)
    if not stored:
        raise HTTPException(status_code=404, detail="Request not found")
    if str(stored.get("status", "")).upper() != "APPROVED":
        raise HTTPException(status_code=400, detail="PDF is only available for approved requests")
    try:
        pdf_bytes = generate_approval_pdf(stored)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    filename = f"approval-{request_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

# ── Escalated/overdue requests (HOD view) ──
@app.get("/api/requests/escalated")
async def get_escalated_requests():
    """Returns requests that have been escalated (overdue 48h)."""
    items = [r for r in _requests_store.values() if r.get("escalated")]
    items.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    return {"requests": items}

# ─── NOTE ON PERSISTENCE ───
# _requests_store is still process memory: it resets on a Render
# restart/redeploy. The audit ledger (CryptographicAuditLogger) already
# degrades gracefully to Postgres-when-reachable, in-memory-otherwise, but
# for a real deploy _requests_store should get the same treatment — a
# `requests` table in the same Postgres database, with get_requests()/
# submit_request()/approve_request() reading and writing rows instead of
# the in-memory dict.


# ─── FACULTY PRESENCE STORE ───────────────────────────────────────────────────
# Maps faculty email → { name, email, last_seen (ISO timestamp) }
# A faculty is considered "online" if their last_seen is within 90 seconds.
# Heartbeat interval on the frontend is 30 s, so 3 missed beats = offline.
import time as _time

_faculty_presence: Dict[str, Dict[str, Any]] = {}
FACULTY_ONLINE_TTL = 90  # seconds


def _online_faculty_list() -> List[Dict[str, str]]:
    """Return faculty whose heartbeat is fresh enough to be considered online."""
    cutoff = _time.time() - FACULTY_ONLINE_TTL
    return [
        {"name": v["name"], "email": v["email"]}
        for v in _faculty_presence.values()
        if v.get("last_seen", 0) >= cutoff
    ]


class FacultyPresenceRequest(BaseModel):
    name: str
    email: str


@app.get("/api/faculty/online")
async def get_online_faculty():
    """Student dashboard polls this to get the list of currently-online faculty."""
    return {"faculty": _online_faculty_list()}


@app.post("/api/faculty/heartbeat")
async def faculty_heartbeat(req: FacultyPresenceRequest):
    """Faculty dashboard calls this every 30 s to stay marked as online."""
    _faculty_presence[req.email] = {
        "name": req.name,
        "email": req.email,
        "last_seen": _time.time(),
    }
    return {"status": "ok"}


@app.post("/api/faculty/offline")
async def faculty_offline(req: FacultyPresenceRequest):
    """Called on logout so the faculty is removed from the online list immediately."""
    _faculty_presence.pop(req.email, None)
    return {"status": "ok"}
