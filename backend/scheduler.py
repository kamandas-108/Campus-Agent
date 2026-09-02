"""
scheduler.py — Deadline reminders & escalation for Campus Agent

Runs as a background asyncio task started at FastAPI startup.
Checks pending requests every POLL_INTERVAL_SECONDS and:
  - 24h: sends a reminder notification (reminder_sent = True)
  - 48h: escalates to HOD (escalated = True)

The store reference is passed in from main.py to avoid circular imports.
"""

import asyncio
import httpx
from datetime import datetime, timezone, timedelta
from typing import Any, Callable, Dict

POLL_INTERVAL_SECONDS = 300   # check every 5 minutes
REMINDER_THRESHOLD_H  = 24   # hours before first reminder
ESCALATION_THRESHOLD_H = 48  # hours before HOD escalation


def _age_hours(request: Dict[str, Any]) -> float:
    raw = request.get("created_at")
    if not raw:
        return 0
    try:
        dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        return (datetime.now(timezone.utc) - dt).total_seconds() / 3600
    except Exception:
        return 0


async def _send_telegram_escalation(
    thread_id: str,
    details: Dict[str, Any],
    telegram_url: str,
    admin_chat: str,
    faculty_dashboard_url: str,
    label: str,
) -> None:
    """Fire a Telegram message for reminder or escalation."""
    if not telegram_url or not admin_chat:
        return
    student = details.get("student_name") or "Unknown student"
    operation = details.get("operation") or details.get("query") or "Service request"
    age_h = round(_age_hours(details), 1)
    text = (
        f"⏰ *{label}*\n\n"
        f"👤 *Student:* {student}\n"
        f"📋 *Request:* {operation}\n"
        f"🔹 *Thread ID:* `{thread_id}`\n"
        f"⏱ *Age:* {age_h} hours\n\n"
        f"Please review this request in the Faculty Dashboard."
    )
    payload = {
        "chat_id": admin_chat,
        "text": text,
        "parse_mode": "Markdown",
        "reply_markup": {
            "inline_keyboard": [[
                {"text": "👉 Open Faculty Dashboard", "url": faculty_dashboard_url}
            ]]
        },
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(telegram_url, json=payload)
    except Exception as exc:
        print(f"Scheduler Telegram error: {exc}")


async def run_scheduler(
    get_store: Callable[[], Dict[str, Dict[str, Any]]],
    audit_log_fn: Callable,
    telegram_api_url: str,
    admin_chat: str,
    faculty_dashboard_url: str,
) -> None:
    """
    Main scheduler loop. Call this with asyncio.create_task() at startup.

    Args:
        get_store:            Returns the live _requests_store dict from main.py
        audit_log_fn:         audit_logger.log_decision coroutine
        telegram_api_url:     Full Telegram sendMessage URL (or empty string)
        admin_chat:           Telegram admin chat ID
        faculty_dashboard_url: Link sent in escalation messages
    """
    print("✅  Scheduler started — will check for stale requests every 5 min")
    while True:
        await asyncio.sleep(POLL_INTERVAL_SECONDS)
        store = get_store()
        now = datetime.now(timezone.utc)
        for thread_id, req in list(store.items()):
            if str(req.get("status", "")).upper() != "PENDING":
                continue

            age_h = _age_hours(req)

            # ── 48h escalation ──
            if age_h >= ESCALATION_THRESHOLD_H and not req.get("escalated"):
                req["escalated"] = True
                req["escalated_at"] = now.isoformat() + "Z"
                print(f"🚨 Escalating request {thread_id} (age={age_h:.1f}h)")
                await _send_telegram_escalation(
                    thread_id, req,
                    f"{telegram_api_url}/sendMessage" if telegram_api_url else "",
                    admin_chat, faculty_dashboard_url,
                    "HOD ESCALATION — Request overdue 48h",
                )
                try:
                    await audit_log_fn(
                        thread_id, "scheduler", "ESCALATED", "REQUEST_ESCALATED",
                        {"operation": req.get("operation"), "age_hours": age_h},
                    )
                except Exception:
                    pass

            # ── 24h reminder ──
            elif age_h >= REMINDER_THRESHOLD_H and not req.get("reminder_sent"):
                req["reminder_sent"] = True
                req["reminder_sent_at"] = now.isoformat() + "Z"
                print(f"⏰ Reminder sent for request {thread_id} (age={age_h:.1f}h)")
                await _send_telegram_escalation(
                    thread_id, req,
                    f"{telegram_api_url}/sendMessage" if telegram_api_url else "",
                    admin_chat, faculty_dashboard_url,
                    "REMINDER — Pending request 24h with no action",
                )
                try:
                    await audit_log_fn(
                        thread_id, "scheduler", "REMINDER_SENT", "REMINDER_SENT",
                        {"operation": req.get("operation"), "age_hours": age_h},
                    )
                except Exception:
                    pass
