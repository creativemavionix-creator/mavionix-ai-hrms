from __future__ import annotations
from typing import Any, Optional
from pydantic import BaseModel, EmailStr


class CandidateBase(BaseModel):
    name:        str
    email:       EmailStr
    phone:       Optional[str] = None
    initials:    str
    resume_url:  Optional[str] = None
    parsed_data: Optional[dict[str, Any]] = None


class CandidateCreate(CandidateBase):
    pass


class CandidateUpdate(BaseModel):
    name:        Optional[str]              = None
    phone:       Optional[str]              = None
    resume_url:  Optional[str]              = None
    parsed_data: Optional[dict[str, Any]]   = None


class CandidateRead(CandidateBase):
    id:         str
    created_at: str


class CandidateStats(BaseModel):
    """Stat-card counts for CandidateManagementView."""
    total:       int
    shortlisted: int   # screened + interview + offered + hired
    in_interview: int
    rejected:    int


class CandidateWithApplication(BaseModel):
    """
    Flattened view that merges candidate + their latest application.
    Used for the CandidateManagementView table rows.
    """
    # Candidate fields
    id:              str
    name:            str
    email:           str
    phone:           Optional[str]       = None
    initials:        str
    resume_url:      Optional[str]       = None
    parsed_data:     Optional[dict[str, Any]] = None
    created_at:      str

    # Application fields (may be None if no application yet)
    application_id:  Optional[str]       = None
    job_id:          Optional[str]       = None
    job_title:       Optional[str]       = None
    stage:           Optional[str]       = None
    ai_score:        Optional[int]       = None
    match_quality:   Optional[str]       = None
    flagged:         bool                = False
    applied_date:    Optional[str]       = None

    # AI report fields
    skill_score:     Optional[int]       = None
    exp_score:       Optional[int]       = None
    edu_score:       Optional[int]       = None
    proj_score:      Optional[int]       = None
    confidence:      Optional[int]       = None
    sentiment_score: Optional[int]       = None
    insights:        Optional[str]       = None
    tags:            list[str]           = []
    verification_status: Optional[str]  = None
