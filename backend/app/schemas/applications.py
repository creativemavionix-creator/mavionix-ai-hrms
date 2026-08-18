from __future__ import annotations
from datetime import date
from typing import Literal, Optional
from pydantic import BaseModel, Field

ApplicationStage = Literal[
    "applied", "screened", "shortlisted",
    "assignment_sent", "assignment_submitted", "assignment_reviewed",
    "tech_round", "tech_round_completed",
    "interview_round", "interview_round_completed",
    "speaking_round", "speaking_round_completed",
    "hr_round", "hr_round_completed",
    "interview", "offered", "hired", "rejected", "waitlisted"
]
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
