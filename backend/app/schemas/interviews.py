from __future__ import annotations
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel

SessionType     = Literal["ai_screening", "technical", "final"]
InterviewStatus = Literal["scheduled", "completed", "cancelled", "no_show"]

# Score threshold: if a "final" round is completed above this, application moves to "offered"
OFFER_THRESHOLD = 70


class InterviewBase(BaseModel):
    application_id:   str
    interviewer_name: str
    session_type:     SessionType     = "technical"
    scheduled_at:     datetime
    status:           InterviewStatus = "scheduled"
    score:            Optional[int]   = None   # 0–100; set on completion


class InterviewCreate(InterviewBase):
    pass


class InterviewUpdate(BaseModel):
    interviewer_name: Optional[str]            = None
    session_type:     Optional[SessionType]    = None
    scheduled_at:     Optional[datetime]       = None
    status:           Optional[InterviewStatus]= None
    score:            Optional[int]            = None


class InterviewRead(InterviewBase):
    id:         str
    created_at: str

    # Denormalised fields joined in the router — used by the frontend table
    candidate_name:  Optional[str] = None
    candidate_id:    Optional[str] = None
    job_title:       Optional[str] = None


class InterviewStats(BaseModel):
    """Stat-card counts for InterviewCenterView."""
    scheduled:   int
    completed:   int
    avg_score:   int   # 0 when no completed interviews with a score
    no_shows:    int
