"""
Pipeline router – /api/pipeline

Manages the extended application stage transitions.

POST /api/pipeline/{application_id}/advance   advance to a specific stage
GET  /api/pipeline/stages                     list all valid stages in order
GET  /api/pipeline/{application_id}/history   get transition history from activity logs
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import get_current_user, require_role
from app.database import get_user_client
from app.schemas.users import CurrentUser
from app.services.stage_machine import (
    PIPELINE_STAGES,
    TERMINAL_STAGES,
    advance_stage,
    is_valid_transition,
    get_next_stage,
)

router = APIRouter(prefix="/api/pipeline", tags=["Pipeline"])

CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]
HRStaffDep     = Annotated[CurrentUser, Depends(require_role(
    "super_admin", "hr_manager", "recruiter", "interviewer"
))]


# ── Request / Response models ─────────────────────────────────────────────────

class AdvanceRequest(BaseModel):
    new_stage: str
    reason: str | None = None


class StageInfo(BaseModel):
    stages: list[str]
    terminal: list[str]


class TransitionResult(BaseModel):
    application_id: str
    previous_stage: str
    new_stage: str
    valid: bool


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/stages", response_model=StageInfo)
async def list_stages(user: CurrentUserDep):
    """
    Returns the ordered list of all valid pipeline stages
    and the set of terminal stages.
    """
    return StageInfo(
        stages=PIPELINE_STAGES + ["rejected"],
        terminal=list(TERMINAL_STAGES),
    )


@router.post("/{application_id}/advance")
async def advance_application_stage(
    application_id: str,
    body: AdvanceRequest,
    user: HRStaffDep,
):
    """
    Advance an application to a new stage.

    Validates the transition is legal (forward-only, non-terminal),
    updates the DB, and logs to activity_logs.

    Returns the updated application row.
    """
    # Get current stage for the response
    from app.database import supabase
    current_result = (
        supabase.table("applications")
        .select("stage")
        .eq("id", application_id)
        .maybe_single()
        .execute()
    )
    if not current_result or not current_result.data:
        raise HTTPException(status_code=404, detail="Application not found.")

    previous_stage = current_result.data["stage"]

    updated = await advance_stage(
        application_id=application_id,
        new_stage=body.new_stage,
        actor_name=user.name,
        reason=body.reason,
    )

    return {
        "application_id": application_id,
        "previous_stage": previous_stage,
        "new_stage": updated["stage"],
        "valid": True,
    }


@router.get("/{application_id}/next-stage")
async def get_next_valid_stage(application_id: str, user: CurrentUserDep):
    """
    Returns the next valid stage for an application,
    plus a list of all reachable stages from the current position.
    """
    from app.database import supabase
    result = (
        supabase.table("applications")
        .select("stage")
        .eq("id", application_id)
        .maybe_single()
        .execute()
    )
    if not result or not result.data:
        raise HTTPException(status_code=404, detail="Application not found.")

    current = result.data["stage"]
    next_s = get_next_stage(current)

    # All reachable stages (any forward stage + rejected)
    reachable = [s for s in PIPELINE_STAGES if is_valid_transition(current, s)]
    if current not in TERMINAL_STAGES:
        reachable.append("rejected")

    return {
        "current_stage": current,
        "next_stage": next_s,
        "reachable_stages": reachable,
    }


@router.get("/{application_id}/history")
async def get_pipeline_history(application_id: str, user: CurrentUserDep):
    """
    Returns the full pipeline view for a specific application:
      - current_stage
      - all pipeline stages with which are completed/current/upcoming
      - activity log entries related to this application (stage transitions)

    Used by the frontend to render a pipeline stepper/timeline.
    """
    from app.database import supabase

    # 1. Get application
    app_result = (
        supabase.table("applications")
        .select("id, stage, candidate_id, job_id, ai_score, match_quality, applied_date, flagged")
        .eq("id", application_id)
        .maybe_single()
        .execute()
    )
    if not app_result or not app_result.data:
        raise HTTPException(status_code=404, detail="Application not found.")

    app = app_result.data
    current_stage = app["stage"]

    # 2. Get candidate name
    cand_result = supabase.table("candidates").select("name").eq("id", app["candidate_id"]).maybe_single().execute()
    candidate_name = cand_result.data["name"] if cand_result and cand_result.data else "Unknown"

    # 3. Get job title
    job_result = supabase.table("jobs").select("title").eq("id", app["job_id"]).maybe_single().execute()
    job_title = job_result.data["title"] if job_result and job_result.data else "Unknown Role"

    # 4. Build pipeline stages with status indicators
    from app.services.stage_machine import PIPELINE_STAGES, _STAGE_INDEX

    current_idx = _STAGE_INDEX.get(current_stage, -1)
    is_rejected = current_stage == "rejected"

    stages_view = []
    for i, stage in enumerate(PIPELINE_STAGES):
        if is_rejected:
            status = "skipped"
        elif i < current_idx:
            status = "completed"
        elif i == current_idx:
            status = "current"
        else:
            status = "upcoming"
        stages_view.append({"stage": stage, "index": i, "status": status})

    if is_rejected:
        stages_view.append({"stage": "rejected", "index": -1, "status": "current"})

    # 5. Get activity log entries for this candidate/role
    # Filter by actor_name matching candidate_name (our activity logs use candidate name as actor)
    logs_result = (
        supabase.table("activity_logs")
        .select("*")
        .eq("actor_name", candidate_name)
        .order("created_at", desc=True)
        .execute()
    )
    activity_history = logs_result.data or []

    # 6. Get related records (assignments, interview rounds, recommendation)
    assignments = []
    try:
        asgn_res = supabase.table("assignments").select("*").eq("application_id", application_id).execute()
        if asgn_res and asgn_res.data:
            assignments = asgn_res.data
    except Exception:
        pass

    ai_rounds = []
    try:
        rounds_res = supabase.table("ai_interview_rounds").select("*").eq("application_id", application_id).order("created_at").execute()
        if rounds_res and rounds_res.data:
            ai_rounds = rounds_res.data
    except Exception:
        pass

    recommendation = None
    try:
        rec_res = supabase.table("final_recommendations").select("*").eq("application_id", application_id).maybe_single().execute()
        if rec_res and rec_res.data:
            recommendation = rec_res.data
    except Exception:
        pass

    return {
        "application_id": application_id,
        "candidate_name": candidate_name,
        "job_title": job_title,
        "current_stage": current_stage,
        "ai_score": app.get("ai_score"),
        "match_quality": app.get("match_quality"),
        "flagged": app.get("flagged", False),
        "applied_date": app.get("applied_date"),
        "stages": stages_view,
        "activity_history": activity_history[:20],  # last 20 entries
        "assignments": assignments,
        "ai_interview_rounds": ai_rounds,
        "final_recommendation": recommendation,
    }
