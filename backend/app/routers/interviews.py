"""
Interviews router – /api/interviews

GET  /api/interviews/stats          stat-card counts
GET  /api/interviews                list with optional search
GET  /api/interviews/{id}           fetch single interview
POST /api/interviews                schedule a new interview
PATCH /api/interviews/{id}          update status / score
DELETE /api/interviews/{id}         hard delete

Side-effects on PATCH
---------------------
When an interview is resolved (status → completed) for a "final" round
with score ≥ OFFER_THRESHOLD (70), the linked application is automatically
advanced to "offered".

When status → no_show or cancelled for a final round where no other
completed final interview exists, the application stage is left unchanged
(HR must intervene manually).
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user, require_role
from app.database import get_user_client, supabase
from app.schemas.interviews import (
    OFFER_THRESHOLD,
    InterviewCreate,
    InterviewRead,
    InterviewStats,
    InterviewUpdate,
)
from app.schemas.users import CurrentUser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/interviews", tags=["Interviews"])

CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]
HRStaffDep     = Annotated[CurrentUser, Depends(require_role(
    "super_admin", "hr_manager", "recruiter", "interviewer"
))]


# ── helpers ───────────────────────────────────────────────────────────────────

def _enrich(row: dict, app_map: dict, cand_map: dict, job_map: dict) -> dict:
    """Attach candidate_name, candidate_id, job_title to an interview row."""
    app   = app_map.get(row.get("application_id", ""), {})
    cand  = cand_map.get(app.get("candidate_id", ""), {})
    job   = job_map.get(app.get("job_id", ""), {})
    row["candidate_name"] = cand.get("name")
    row["candidate_id"]   = cand.get("id")
    row["job_title"]      = job.get("title")
    return row


def _load_maps(client) -> tuple[dict, dict, dict]:
    apps  = client.table("applications").select("id, candidate_id, job_id").execute().data or []
    cands = client.table("candidates").select("id, name").execute().data or []
    jobs  = client.table("jobs").select("id, title").execute().data or []
    return (
        {a["id"]: a for a in apps},
        {c["id"]: c for c in cands},
        {j["id"]: j for j in jobs},
    )


def _advance_application(application_id: str, score: int, session_type: str) -> None:
    """
    If this is a completed final-round interview with score ≥ OFFER_THRESHOLD,
    automatically advance the linked application to 'offered'.
    Uses the service-role client (server-side, no user context required).
    """
    if session_type != "final" or score < OFFER_THRESHOLD:
        return

    try:
        supabase.table("applications").update({"stage": "offered"}).eq(
            "id", application_id
        ).execute()
        logger.info(
            "Application %s advanced to 'offered' after final round score %d",
            application_id, score,
        )
    except Exception as exc:
        logger.error(
            "Failed to advance application %s to offered: %s", application_id, exc
        )


# ── routes ────────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=InterviewStats)
async def get_interview_stats(user: HRStaffDep):
    """
    Returns the four stat-card values for InterviewCenterView:
      scheduled, completed (this week), avg_score, no_shows
    """
    client = get_user_client(user.token)
    rows = []
    try:
        result = client.table("interviews").select("status, score, scheduled_at").execute()
        rows = result.data or []
    except Exception as exc:
        logger.warning(f"Could not fetch interviews stats: {exc}")

    # "completed this week" = completed AND scheduled_at within last 7 days
    now          = datetime.now(timezone.utc)
    week_ago     = now - timedelta(days=7)
    week_ago_iso = week_ago.isoformat()

    completed_all  = [r for r in rows if r.get("status") == "completed"]
    completed_week = [r for r in completed_all if r.get("scheduled_at", "") >= week_ago_iso]
    scored         = [r["score"] for r in completed_all if r.get("score") is not None]
    avg_score      = round(sum(scored) / len(scored)) if scored else 0

    return InterviewStats(
        scheduled=sum(1 for r in rows if r.get("status") == "scheduled"),
        completed=len(completed_week),
        avg_score=avg_score,
        no_shows=sum(1 for r in rows if r.get("status") == "no_show"),
    )


@router.get("", response_model=list[InterviewRead])
async def list_interviews(
    user: HRStaffDep,
    search:       Optional[str] = None,
    status_filter:Optional[str] = None,   # scheduled | completed | cancelled | no_show
    session_type: Optional[str] = None,
    limit:  int = 100,
    offset: int = 0,
):
    """
    List interviews ordered by scheduled_at descending, with optional filters.

    search       — case-insensitive match on candidate_name or interviewer_name
    status_filter— one of the four InterviewStatus values
    session_type — ai_screening | technical | final
    """
    client = get_user_client(user.token)
    rows = []
    try:
        query = client.table("interviews").select("*").order("scheduled_at", desc=True)

        if status_filter:
            query = query.eq("status", status_filter)
        if session_type:
            query = query.eq("session_type", session_type)

        result = query.range(offset, offset + limit - 1).execute()
        rows = result.data or []
    except Exception as exc:
        logger.warning(f"Could not list interviews: {exc}")

    app_map, cand_map, job_map = _load_maps(client)
    enriched = [_enrich(r, app_map, cand_map, job_map) for r in rows]

    if search:
        term = search.lower()
        enriched = [
            r for r in enriched
            if term in (r.get("candidate_name") or "").lower()
            or term in (r.get("interviewer_name") or "").lower()
            or term in (r.get("job_title") or "").lower()
            or term in (r.get("session_type") or "").lower()
        ]

    return enriched


@router.get("/{interview_id}", response_model=InterviewRead)
async def get_interview(interview_id: str, user: HRStaffDep):
    """Fetch a single interview by UUID."""
    client = get_user_client(user.token)
    result = (
        client.table("interviews")
        .select("*").eq("id", interview_id).maybe_single().execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Interview not found.")

    app_map, cand_map, job_map = _load_maps(client)
    return _enrich(result.data, app_map, cand_map, job_map)


@router.post("", response_model=InterviewRead, status_code=status.HTTP_201_CREATED)
async def schedule_interview(body: InterviewCreate, user: HRStaffDep):
    """
    Schedule a new interview.  Status is always forced to 'scheduled' on creation.

    Accessible by: hr_manager, recruiter, super_admin, interviewer
    """
    payload = body.model_dump()
    payload["status"] = "scheduled"                      # enforce initial status
    payload["scheduled_at"] = payload["scheduled_at"].isoformat()
    payload.pop("score", None)                           # no score on creation

    client = get_user_client(user.token)
    result = client.table("interviews").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to schedule interview.")

    app_map, cand_map, job_map = _load_maps(client)
    return _enrich(result.data[0], app_map, cand_map, job_map)


@router.patch("/{interview_id}", response_model=InterviewRead)
async def update_interview(
    interview_id: str,
    body: InterviewUpdate,
    user: HRStaffDep,
):
    """
    Update an interview session.

    InterviewCenterView action buttons:
      RESOLVE   → {status: "completed", score: <int>}
      NO SHOW   → {status: "no_show"}
      CANCEL    → {status: "cancelled"}

    Side-effects:
      - If status → "completed", session_type == "final", and score ≥ OFFER_THRESHOLD (70):
        the linked application is automatically advanced to "offered".

    Accessible by: hr_manager, recruiter, super_admin, interviewer
    """
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=422, detail="No fields provided for update.")

    if "scheduled_at" in payload and isinstance(payload["scheduled_at"], datetime):
        payload["scheduled_at"] = payload["scheduled_at"].isoformat()

    client = get_user_client(user.token)

    # Fetch current row first to get application_id and session_type
    current = (
        client.table("interviews")
        .select("application_id, session_type, status")
        .eq("id", interview_id)
        .maybe_single()
        .execute()
    )
    if not current.data:
        raise HTTPException(status_code=404, detail="Interview not found.")

    result = (
        client.table("interviews")
        .update(payload)
        .eq("id", interview_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Interview not found or no changes applied.")

    updated = result.data[0]

    # Side-effect: auto-advance application on final round completion
    new_status   = payload.get("status")
    score        = payload.get("score")
    session_type = updated.get("session_type") or current.data.get("session_type", "")
    application_id = updated.get("application_id") or current.data.get("application_id", "")

    if new_status == "completed" and score is not None and application_id:
        _advance_application(application_id, score, session_type)

    app_map, cand_map, job_map = _load_maps(client)
    return _enrich(updated, app_map, cand_map, job_map)


@router.delete("/{interview_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_interview(
    interview_id: str,
    user: Annotated[CurrentUser, Depends(require_role("super_admin", "hr_manager"))],
):
    """Hard-delete an interview. Accessible by: super_admin, hr_manager."""
    client = get_user_client(user.token)
    result = client.table("interviews").delete().eq("id", interview_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Interview not found.")
