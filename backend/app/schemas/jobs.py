from __future__ import annotations
from datetime import date
from typing import Literal, Optional, Any
from pydantic import BaseModel, Field

JobStatus   = Literal["active", "onhold", "draft", "closed"]
JobPriority = Literal["low", "medium", "high"]


class QuestionItem(BaseModel):
    id: str                                  # Stable UUID (uuid4)
    text: str
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    expected_duration_seconds: int = 120
    mandatory: bool = True
    allow_followups: bool = True
    max_followups: int = 2                   # Per-question follow-up budget
    tags: list[str] = []
    order: int = 1                           # Display order
    extracted_field: Optional[str] = None   # Structured field mapper (HR)
    branching_rules: Optional[dict] = None  # Conditional branching rules


class TopicWeight(BaseModel):
    topic: str
    weight: int = 10                         # 1-10 scale for candidate semantic coverage


class RoundBlueprint(BaseModel):
    enabled: bool = True
    time_limit_minutes: int = 30
    passing_score: int = 70
    evaluation_focus: list[str] = []
    topic_weights: list[TopicWeight] = []
    custom_questions: list[QuestionItem] = []
    assignment_details: Optional[dict] = None # estimated_hours, deadline_hours, submission_type, must_include, optional_bonus
    speaking_details: Optional[dict] = None   # duration, focus: ["clarity", "confidence", "fluency"]


class JobBase(BaseModel):
    title:               str
    department:          str
    location:            str
    status:              JobStatus   = "draft"
    priority:            JobPriority = "medium"
    description:         Optional[str] = None
    blueprint_version:   int = 1
    round_blueprints:    Optional[dict[str, Any]] = None


class JobCreate(JobBase):
    posted_date: date = Field(default_factory=date.today)


class JobUpdate(BaseModel):
    title:               Optional[str]            = None
    department:          Optional[str]            = None
    location:            Optional[str]            = None
    status:              Optional[JobStatus]      = None
    priority:            Optional[JobPriority]    = None
    description:         Optional[str]            = None
    round_blueprints:    Optional[dict[str, Any]] = None


class JobRead(JobBase):
    id:          str
    job_code:    str
    posted_date: date
    created_by:  Optional[str] = None
    created_at:  str

    # Derived: total applicants for this job (not stored in jobs table; computed via join)
    applicant_count: int = 0


class JobStats(BaseModel):
    """Stat-card counts for JobManagementView."""
    active_roles:  int
    high_priority: int   # active + high priority
    draft_roles:   int

