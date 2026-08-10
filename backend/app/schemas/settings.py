from __future__ import annotations
from typing import Any
from pydantic import BaseModel


class SettingRead(BaseModel):
    id:    str
    key:   str
    value: Any


class SettingUpdate(BaseModel):
    value: Any


# ── Typed convenience schemas for known setting keys ─────────────────────────

class AIWeights(BaseModel):
    skills:     int = 40
    experience: int = 30
    education:  int = 15
    projects:   int = 15


class NotificationPrefs(BaseModel):
    email:   bool = True
    slack:   bool = True
    push:    bool = False
    ai_flag: bool = True


class Integrations(BaseModel):
    linkedin: bool = True
    naukri:   bool = True
    indeed:   bool = False
    slack:    bool = True
    email:    bool = True


class ShortlistThreshold(BaseModel):
    """AI shortlisting threshold and borderline floor."""
    value:           int = 75   # score >= this → auto-shortlist
    borderline_floor: int = 60  # score < this → auto-reject; between floor and value → manual review
