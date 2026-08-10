from __future__ import annotations
from datetime import date
from typing import Literal, Optional
from pydantic import BaseModel, Field

ApplicationStage = Literal["applied", "screened", "interview", "offered", "hired", "rejected"]
MatchQuality     = Literal["excellent", "strong", "good", "fair", "low"]


class ApplicationBase(BaseModel):
    job_id:       str
    candidate_id: str
    stage:        ApplicationStage = "applied"
    flagged:      bool             = False
    applied_date: date             = Field(default_factory=date.today)


class ApplicationCreate(ApplicationBase):
    ai_score:      Optional[int]          = None
    match_quality: Optional[MatchQuality] = None


class ApplicationUpdate(BaseModel):
    stage:         Optional[ApplicationStage] = None
    ai_score:      Optional[int]              = None
    match_quality: Optional[MatchQuality]     = None
    flagged:       Optional[bool]             = None


class ApplicationRead(ApplicationBase):
    id:            str
    ai_score:      Optional[int]          = None
    match_quality: Optional[MatchQuality] = None
    created_at:    str
