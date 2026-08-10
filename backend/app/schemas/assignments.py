"""
Pydantic schemas for Take-Home Assignments, Submissions, AI Evaluations, and Recruiter Reviews.
"""
from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel, Field


class CriterionScores(BaseModel):
    architecture: int = Field(default=75, ge=0, le=100)
    correctness: int = Field(default=75, ge=0, le=100)
    code_quality: int = Field(default=75, ge=0, le=100)
    documentation: int = Field(default=75, ge=0, le=100)


class AIEvaluationData(BaseModel):
    submission_id: str
    overall_score: int = Field(default=75, ge=0, le=100)
    criteria: CriterionScores = Field(default_factory=CriterionScores)
    strengths: list[str] = Field(default_factory=list)
    concerns: list[str] = Field(default_factory=list)
    missing_requirements: list[str] = Field(default_factory=list)
    confidence: float = Field(default=0.9, ge=0.0, le=1.0)
    evaluated_at: str = ""


class RecruiterReviewData(BaseModel):
    submission_id: str
    reviewer_id: str = "recruiter-01"
    ai_score: int = 75
    recruiter_score: int = 75
    final_score: int = 75
    override_reason: str = ""
    decision: str = "approved"  # "approved" | "rejected"
    rejection_reason_category: Optional[str] = None
    notes: str = ""
    reviewed_at: str = ""


class SubmitAssignmentPayload(BaseModel):
    submission_text: Optional[str] = None
    submission_url: Optional[str] = None
    submission_type: Optional[str] = "text"  # github | url | code | markdown | text
