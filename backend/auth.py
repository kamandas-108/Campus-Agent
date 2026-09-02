"""
auth.py — Role-Based Access Control for Campus Agent

Roles:
  student  → can submit requests, view own history
  faculty  → can see/approve assigned department requests
  hod      → can see all department requests, handle escalations
  admin    → full access, analytics, audit

Since the app currently uses a simple username/password with no real DB users
table, this module implements a lightweight role resolution layer:
  - Role is passed by the frontend as part of the login payload (session-based)
  - The backend validates role on protected endpoints via dependency injection
"""

from fastapi import HTTPException, Header, Query
from typing import Optional, Literal

RoleType = Literal["student", "faculty", "hod", "admin"]

# ─── Simple role header extraction ───
# Frontend sends X-User-Role and X-User-Email headers on authenticated requests.
# In a production deployment, replace this with JWT verification.

def _extract_role(x_user_role: Optional[str]) -> Optional[RoleType]:
    if x_user_role in ("student", "faculty", "hod", "admin"):
        return x_user_role  # type: ignore[return-value]
    return None


def get_role(x_user_role: Optional[str] = Header(default=None)) -> Optional[RoleType]:
    return _extract_role(x_user_role)


# ─── Role-gated dependencies ───

def require_student(x_user_role: Optional[str] = Header(default=None)) -> RoleType:
    role = _extract_role(x_user_role)
    if role not in ("student", "faculty", "hod", "admin"):
        raise HTTPException(status_code=403, detail="Student role required")
    return role  # type: ignore[return-value]


def require_faculty(x_user_role: Optional[str] = Header(default=None)) -> RoleType:
    role = _extract_role(x_user_role)
    if role not in ("faculty", "hod", "admin"):
        raise HTTPException(status_code=403, detail="Faculty role or above required")
    return role  # type: ignore[return-value]


def require_hod(x_user_role: Optional[str] = Header(default=None)) -> RoleType:
    role = _extract_role(x_user_role)
    if role not in ("hod", "admin"):
        raise HTTPException(status_code=403, detail="HOD role or above required")
    return role  # type: ignore[return-value]


def require_admin(x_user_role: Optional[str] = Header(default=None)) -> RoleType:
    role = _extract_role(x_user_role)
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    return role  # type: ignore[return-value]
