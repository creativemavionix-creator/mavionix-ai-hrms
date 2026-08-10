from __future__ import annotations
from pydantic import BaseModel
from typing import Literal


UserRole = Literal["super_admin", "hr_manager", "recruiter", "interviewer", "candidate"]


class CurrentUser(BaseModel):
    """Injected by the `get_current_user` dependency into every authenticated route."""
    id: str
    email: str
    name: str
    role: UserRole
    token: str  # raw JWT — forwarded to the user-scoped Supabase client


class UserProfile(BaseModel):
    id: str
    email: str
    name: str
    role: UserRole
