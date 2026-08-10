"""
Analytics router – /api/analytics

GET /api/analytics/summary   — returns all four dataset objects in one call

Datasets
--------
1. time_to_hire       monthly avg days from applied_date → hired (interview completed)
2. source_of_hire     candidate counts grouped by source field
3. dept_pipeline      per-department: applied / interviewed / hired / conversion %
4. score_distribution ai_score buckets: excellent/strong/good/fair/low
"""
from __future__ import annotations

import logging
from collections import defaultdict
from datetime import date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth import get_current_user
from app.database import get_user_client
from app.schemas.users import CurrentUser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]

MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


# ── Response models ────────────────────────────────────────────────────────────

class TimeToHirePoint(BaseModel):
    month:    str
    avg_days: float


class SourceHire(BaseModel):
    name:       str
    count:      int
    percentage: float
    color:      str


class DeptRow(BaseModel):
    department: str
    applied:    int
    interviewed: int
    hired:      int
    conversion: float   # percentage


class ScoreBucket(BaseModel):
    label:    str   # "90-100"
    rank:     str   # "Excellent"
    count:    int
    range_min: int
    range_max: int   # 101 means "no upper bound" (i.e. <50 bucket uses 0-49)


class AnalyticsSummary(BaseModel):
    time_to_hire:       list[TimeToHirePoint]
    source_of_hire:     list[SourceHire]
    dept_pipeline:      list[DeptRow]
    score_distribution: list[ScoreBucket]


# ── Helpers ───────────────────────────────────────────────────────────────────

SOURCE_COLORS = {
    "linkedin": "bg-[#ff6b1a]",
    "referral": "bg-green-500",
    "naukri":   "bg-purple-500",
    "indeed":   "bg-blue-500",
    "direct":   "bg-neutral-500",
}

SOURCE_LABELS = {
    "linkedin": "LinkedIn Career Portal",
    "referral": "Referral Program",
    "naukri":   "Naukri Gateway",
    "indeed":   "Indeed Jobboard",
    "direct":   "Direct / Other",
}

SCORE_BUCKETS = [
    {"label": "90-100", "rank": "Excellent",  "min": 90, "max": 100},
    {"label": "80-89",  "rank": "Strong",     "min": 80, "max": 89},
    {"label": "70-79",  "rank": "Good",       "min": 70, "max": 79},
    {"label": "50-69",  "rank": "Fair",       "min": 50, "max": 69},
    {"label": "< 50",   "rank": "Low Match",  "min": 0,  "max": 49},
]


def _safe_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


# ── Route ─────────────────────────────────────────────────────────────────────

@router.get("/summary", response_model=AnalyticsSummary)
async def get_analytics_summary(user: CurrentUserDep):
    """
    Returns all four analytics datasets in a single response.
    The frontend AnalyticsView calls this once on mount.
    """
    client = get_user_client(user.token)

    # ── 1. Raw data fetches ────────────────────────────────────────────────────
    apps_raw    = client.table("applications").select(
        "id, job_id, candidate_id, stage, applied_date, ai_score"
    ).execute().data or []

    cands_raw   = client.table("candidates").select("id, source").execute().data or []

    jobs_raw    = client.table("jobs").select("id, department").execute().data or []

    interviews_raw = client.table("interviews").select(
        "application_id, status, scheduled_at"
    ).execute().data or []

    # ── Build lookup maps ──────────────────────────────────────────────────────
    job_dept:    dict[str, str] = {j["id"]: j.get("department", "Unknown") for j in jobs_raw}
    cand_source: dict[str, str] = {c["id"]: (c.get("source") or "direct") for c in cands_raw}

    # interview completion dates per application_id (take the first completed one)
    interview_completed: dict[str, date] = {}
    for iv in interviews_raw:
        if iv.get("status") == "completed" and iv.get("scheduled_at"):
            app_id = iv["application_id"]
            iv_date = _safe_date(iv["scheduled_at"])
            if iv_date and app_id not in interview_completed:
                interview_completed[app_id] = iv_date

    # ── 2. Time-to-Hire ───────────────────────────────────────────────────────
    # Group hired applications by month; compute avg days from applied → completed interview
    monthly_days: dict[str, list[float]] = defaultdict(list)

    for app in apps_raw:
        if app.get("stage") != "hired":
            continue
        applied = _safe_date(app.get("applied_date"))
        completed = interview_completed.get(app["id"])
        if not applied or not completed:
            continue
        days = (completed - applied).days
        if days < 0:
            continue
        month_key = completed.strftime("%b")
        monthly_days[month_key].append(float(days))

    # Build ordered list for the last 7 months of the current year
    current_month = datetime.now().month
    ordered_months = [MONTH_LABELS[(current_month - 7 + i) % 12] for i in range(7)]
    time_to_hire = [
        TimeToHirePoint(
            month=m,
            avg_days=round(sum(monthly_days[m]) / len(monthly_days[m]), 1)
            if monthly_days.get(m) else 0.0,
        )
        for m in ordered_months
    ]

    # ── 3. Source-of-Hire ─────────────────────────────────────────────────────
    source_counts: dict[str, int] = defaultdict(int)
    for app in apps_raw:
        src = cand_source.get(app.get("candidate_id", ""), "direct")
        source_counts[src] += 1

    total_apps = sum(source_counts.values()) or 1
    source_of_hire = [
        SourceHire(
            name=SOURCE_LABELS.get(src, src.title()),
            count=cnt,
            percentage=round(cnt / total_apps * 100, 1),
            color=SOURCE_COLORS.get(src, "bg-neutral-500"),
        )
        for src, cnt in sorted(source_counts.items(), key=lambda x: -x[1])
    ]

    # ── 4. Department pipeline ────────────────────────────────────────────────
    dept_data: dict[str, dict[str, int]] = defaultdict(lambda: {"applied": 0, "interviewed": 0, "hired": 0})
    interviewed_app_ids = {iv["application_id"] for iv in interviews_raw if iv.get("status") == "completed"}

    for app in apps_raw:
        dept = job_dept.get(app.get("job_id", ""), "Unknown")
        dept_data[dept]["applied"] += 1
        if app["id"] in interviewed_app_ids:
            dept_data[dept]["interviewed"] += 1
        if app.get("stage") == "hired":
            dept_data[dept]["hired"] += 1

    dept_pipeline = [
        DeptRow(
            department=dept,
            applied=data["applied"],
            interviewed=data["interviewed"],
            hired=data["hired"],
            conversion=round(data["hired"] / data["applied"] * 100, 1) if data["applied"] else 0.0,
        )
        for dept, data in sorted(dept_data.items())
        if dept != "Unknown"
    ]

    # ── 5. AI Score Distribution ──────────────────────────────────────────────
    score_distribution = []
    for bucket in SCORE_BUCKETS:
        count = sum(
            1 for app in apps_raw
            if app.get("ai_score") is not None
            and bucket["min"] <= int(app["ai_score"]) <= bucket["max"]
        )
        score_distribution.append(ScoreBucket(
            label=bucket["label"],
            rank=bucket["rank"],
            count=count,
            range_min=bucket["min"],
            range_max=bucket["max"],
        ))

    return AnalyticsSummary(
        time_to_hire=time_to_hire,
        source_of_hire=source_of_hire,
        dept_pipeline=dept_pipeline,
        score_distribution=score_distribution,
    )
