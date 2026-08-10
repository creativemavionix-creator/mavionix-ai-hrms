from __future__ import annotations
from pydantic import BaseModel


class PipelineFunnel(BaseModel):
    applied:  int = 0
    screened: int = 0
    interview: int = 0
    offered:  int = 0
    hired:    int = 0
    rejected: int = 0


class DashboardStats(BaseModel):
    total_jobs:      int
    active_jobs:     int
    total_candidates: int
    shortlisted:     int  # screened + interview + offered + hired
    in_interview:    int
    offers_sent:     int
    hired:           int
    funnel:          PipelineFunnel
