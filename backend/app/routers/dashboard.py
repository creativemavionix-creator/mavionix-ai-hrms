"""
Dashboard router – /api/dashboard

GET /api/dashboard/stats          headline stat cards + hiring funnel
GET /api/dashboard/activity-logs  recent activity log entries
"""
from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth import get_current_user
from app.database import get_user_client
from app.schemas.dashboard import DashboardStats, PipelineFunnel
from app.schemas.users import CurrentUser

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(user: CurrentUserDep):
    """Returns aggregate counts for stat cards and hiring funnel."""
    client = get_user_client(user.token)

    jobs_result = client.table("jobs").select("status").execute()
    jobs = jobs_result.data or []

    apps_result = client.table("applications").select("stage").execute()
    apps = apps_result.data or []

    total_jobs = len(jobs)
    active_jobs = sum(1 for j in jobs if j["status"] == "active")

    total_candidates = len(apps)
    stages = [a["stage"] for a in apps]

    shortlisted = sum(1 for s in stages if s not in ("applied", "rejected"))
    in_interview = sum(1 for s in stages if "round" in s or s == "interview")
    offers_sent = sum(1 for s in stages if s == "offered")
    hired = sum(1 for s in stages if s == "hired")

    funnel = PipelineFunnel(
        applied=len(stages),
        screened=sum(1 for s in stages if s != "applied"),
        interview=in_interview,
        offered=offers_sent,
        hired=hired,
        rejected=sum(1 for s in stages if s == "rejected"),
    )

    return DashboardStats(
        total_jobs=total_jobs,
        active_jobs=active_jobs,
        total_candidates=total_candidates,
        shortlisted=shortlisted,
        in_interview=in_interview,
        offers_sent=offers_sent,
        hired=hired,
        funnel=funnel,
    )


@router.get("/activity-logs")
async def get_activity_logs(user: CurrentUserDep, limit: int = 20, offset: int = 0):
    """Returns the most recent activity log entries, newest first."""
    client = get_user_client(user.token)
    result = (
        client.table("activity_logs")
        .select("*")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return result.data or []
