from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel

VerificationStatus = Literal["verified", "revoked", "pending", "unverified"]


class AIReportBase(BaseModel):
    application_id:      str
    verification_status: VerificationStatus = "pending"
    sentiment_score:     Optional[int]      = None   # 0–100
    match_ranking:       Optional[str]      = None   # e.g. "Excellent"
    skill_score:         Optional[int]      = None
    exp_score:           Optional[int]      = None
    edu_score:           Optional[int]      = None
    proj_score:          Optional[int]      = None
    confidence:          Optional[int]      = None
    insights:            Optional[str]      = None
    tags:                Optional[list[str]]= None
    flagged:             bool               = False


class AIReportCreate(AIReportBase):
    pass


class AIReportUpdate(BaseModel):
    verification_status: Optional[VerificationStatus] = None
    sentiment_score:     Optional[int]                = None
    match_ranking:       Optional[str]                = None
    skill_score:         Optional[int]                = None
    exp_score:           Optional[int]                = None
    edu_score:           Optional[int]                = None
    proj_score:          Optional[int]                = None
    confidence:          Optional[int]                = None
    insights:            Optional[str]                = None
    tags:                Optional[list[str]]           = None
    flagged:             Optional[bool]               = None


class AIReportRead(AIReportBase):
    id:         str
    created_at: str

    # Denormalised candidate + job info joined in the router for the UI
    candidate_name:  Optional[str] = None
    candidate_email: Optional[str] = None
    candidate_initials: Optional[str] = None
    job_title:       Optional[str] = None
    ai_score:        Optional[int] = None   # from applications.ai_score


class AIReportStats(BaseModel):
    """Stat-card counts for AiIntelligenceView."""
    total_reports:   int
    flagged_count:   int
    active_sources:  int = 4   # static: LinkedIn, Naukri, Resume Uploads, Referral
