"""
analytics_service.py — Admin analytics for Campus Agent

Computes aggregate stats from _requests_store (in-memory) that main.py
passes in. In a production deploy where requests live in Postgres, replace
the dict-based calculations below with SQL queries.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


def _parse_dt(value: Any) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except Exception:
        return None


def compute_analytics(requests: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Return a rich analytics payload from the in-memory request store."""

    total = len(requests)
    approved = sum(1 for r in requests if str(r.get("status", "")).upper() == "APPROVED")
    pending  = sum(1 for r in requests if str(r.get("status", "")).upper() == "PENDING")
    rejected = sum(1 for r in requests if str(r.get("status", "")).upper() == "REJECTED")

    # Requests by type
    type_counts: Dict[str, int] = {}
    for r in requests:
        op = r.get("operation") or "Other"
        type_counts[op] = type_counts.get(op, 0) + 1

    # Requests by department
    dept_counts: Dict[str, int] = {}
    for r in requests:
        dept = r.get("student_department") or "Unknown"
        dept_counts[dept] = dept_counts.get(dept, 0) + 1

    # Average approval time (hours) — only for approved requests with both timestamps
    approval_times: List[float] = []
    for r in requests:
        if str(r.get("status", "")).upper() == "APPROVED":
            created = _parse_dt(r.get("created_at"))
            resolved = _parse_dt(r.get("approved_at"))
            if created and resolved:
                delta = (resolved - created).total_seconds() / 3600
                if delta >= 0:
                    approval_times.append(delta)
    avg_approval_hours = (
        round(sum(approval_times) / len(approval_times), 2) if approval_times else None
    )

    # Requests over the last 7 days (by date)
    now = datetime.now(timezone.utc)
    daily: Dict[str, int] = {}
    for r in requests:
        dt = _parse_dt(r.get("created_at"))
        if dt:
            day_key = dt.strftime("%Y-%m-%d")
            daily[day_key] = daily.get(day_key, 0) + 1
    # Sort and take last 7 unique days
    sorted_days = sorted(daily.items())[-7:]
    requests_over_time = [{"date": d, "count": c} for d, c in sorted_days]

    # Escalated requests (reminder_sent or escalated flag set)
    escalated = sum(
        1 for r in requests if r.get("escalated") or r.get("reminder_sent")
    )

    return {
        "total_requests":      total,
        "approved_requests":   approved,
        "pending_requests":    pending,
        "rejected_requests":   rejected,
        "escalated_requests":  escalated,
        "avg_approval_hours":  avg_approval_hours,
        "requests_by_type":    [{"type": k, "count": v} for k, v in type_counts.items()],
        "requests_by_dept":    [{"dept": k, "count": v} for k, v in dept_counts.items()],
        "requests_over_time":  requests_over_time,
        "approval_rate":       round(approved / total * 100, 1) if total else 0,
        "rejection_rate":      round(rejected / total * 100, 1) if total else 0,
    }
