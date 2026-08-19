"""
AI Reports router – /api/ai-reports

Backs AiIntelligenceView.tsx:
  GET  /api/ai-reports/stats                 stat-card counts
  GET  /api/ai-reports                       list with filter (flagged / verified)
  GET  /api/ai-reports/application/{app_id}  fetch by application
  GET  /api/ai-reports/{id}                  fetch by report id
  POST /api/ai-reports                       create (usually called internally)
  PATCH /api/ai-reports/{id}                 update (verify / revoke / flag / dismiss)

Internal helper (imported by candidates router):
  generate_ai_report(application_id, parsed_data, scoring, job_title)
"""
from __future__ import annotations

import logging
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user, require_role
from app.database import get_user_client, supabase
from app.schemas.ai_reports import (
    AIReportCreate,
    AIReportRead,
    AIReportStats,
    AIReportUpdate,
)
from app.schemas.users import CurrentUser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai-reports", tags=["AI Reports"])

CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]
HRStaffDep     = Annotated[CurrentUser, Depends(require_role(
    "super_admin", "hr_manager", "recruiter", "interviewer"
))]


# ── Internal helper ───────────────────────────────────────────────────────────

async def generate_ai_report(
    application_id: str,
    parsed_data: dict,
    scoring: dict,
    job_title: str,
) -> dict | None:
    """
    Build and persist an ai_reports row from Gemini parse+score output.

    Called internally by the candidates router after resume scoring completes.
    Uses the service-role client (bypasses RLS) because this runs server-side,
    not in the context of a user request.

    Returns the inserted row dict, or None on failure.
    """
    from app.services.resume_parser import generate_screening_insights  # local import avoids circular

    # Generate a focused 1-2 sentence HR insight via a dedicated Gemini call
    insights = await generate_screening_insights(parsed_data, scoring, job_title)

    # Determine flagged: any flags from scoring OR overall_score < 45
    has_flags  = bool(scoring.get("flags"))
    low_score  = (scoring.get("overall_score") or 0) < 45
    is_flagged = has_flags or low_score

    payload = {
        "application_id":      application_id,
        "verification_status": "pending",
        "sentiment_score":     scoring.get("sentiment_score"),
        "match_ranking":       (scoring.get("match_quality") or "").capitalize(),
        "skill_score":         scoring.get("skills_score"),
        "exp_score":           scoring.get("experience_score"),
        "edu_score":           scoring.get("education_score"),
        "proj_score":          scoring.get("projects_score"),
        "confidence":          scoring.get("confidence"),
        "insights":            insights,
        "tags":                parsed_data.get("tags") or [],
        "flagged":             is_flagged,
    }

    try:
        result = supabase.table("ai_reports").insert(payload).execute()
        return result.data[0] if result.data else None
    except Exception as exc:
        logger.error("Failed to insert ai_report for application %s: %s", application_id, exc)
        return None


# ── helpers ───────────────────────────────────────────────────────────────────

def _enrich_report(report: dict, app_map: dict, cand_map: dict, job_map: dict) -> dict:
    """
    Merge denormalised candidate + job info onto a raw ai_reports row.
    This gives the frontend everything it needs in one object.
    """
    app    = app_map.get(report["application_id"], {})
    cand   = cand_map.get(app.get("candidate_id", ""), {})
    job    = job_map.get(app.get("job_id", ""), {})

    report["candidate_name"]     = cand.get("name")
    report["candidate_email"]    = cand.get("email")
    report["candidate_initials"] = cand.get("initials")
    report["job_title"]          = job.get("title")
    report["ai_score"]           = app.get("ai_score")
    return report


def _load_lookup_maps(client) -> tuple[dict, dict, dict]:
    """
    Load applications, candidates, and jobs into lookup dicts for O(1) joins.
    Returns (app_map keyed by app.id, cand_map keyed by cand.id, job_map keyed by job.id).
    """
    apps  = client.table("applications").select("id, candidate_id, job_id, ai_score").execute().data or []
    cands = client.table("candidates").select("id, name, email, initials").execute().data or []
    jobs  = client.table("jobs").select("id, title").execute().data or []

    app_map  = {a["id"]:  a for a in apps}
    cand_map = {c["id"]:  c for c in cands}
    job_map  = {j["id"]:  j for j in jobs}
    return app_map, cand_map, job_map


# ── routes ────────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=AIReportStats)
async def get_ai_report_stats(user: HRStaffDep):
    """
    Returns the three stat-card values for AiIntelligenceView:
      total_reports, flagged_count, active_sources (always 4)
    """
    client = get_user_client(user.token)
    result = client.table("ai_reports").select("id, flagged").execute()
    rows = result.data or []

    return AIReportStats(
        total_reports=len(rows),
        flagged_count=sum(1 for r in rows if r.get("flagged")),
        active_sources=4,
    )


@router.get("", response_model=list[AIReportRead])
async def list_ai_reports(
    user: HRStaffDep,
    filter: Optional[str] = None,   # "flagged" | "verified" | None (all)
    limit:  int = 100,
    offset: int = 0,
):
    """
    List AI reports enriched with candidate + job info.

    filter:
      - None / "all"  → all reports
      - "flagged"     → flagged = true
      - "verified"    → verification_status = 'verified'
    """
    client = get_user_client(user.token)

    query = client.table("ai_reports").select("*").order("created_at", desc=True)

    if filter == "flagged":
        query = query.eq("flagged", True)
    elif filter == "verified":
        query = query.eq("verification_status", "verified")

    result = query.range(offset, offset + limit - 1).execute()
    rows   = result.data or []

    if not rows:
        return []

    app_map, cand_map, job_map = _load_lookup_maps(client)
    return [_enrich_report(r, app_map, cand_map, job_map) for r in rows]


@router.get("/application/{application_id}", response_model=AIReportRead)
async def get_ai_report_by_application(application_id: str, user: HRStaffDep):
    """Fetch the AI report for a specific application (1-to-1 relationship)."""
    client = get_user_client(user.token)
    result = (
        client.table("ai_reports")
        .select("*")
        .eq("application_id", application_id)
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="AI report not found for this application.")

    app_map, cand_map, job_map = _load_lookup_maps(client)
    return _enrich_report(result.data, app_map, cand_map, job_map)


@router.get("/{report_id}", response_model=AIReportRead)
async def get_ai_report(report_id: str, user: HRStaffDep):
    """Fetch a single AI report by its UUID."""
    client = get_user_client(user.token)
    result = (
        client.table("ai_reports")
        .select("*")
        .eq("id", report_id)
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="AI report not found.")

    app_map, cand_map, job_map = _load_lookup_maps(client)
    return _enrich_report(result.data, app_map, cand_map, job_map)


@router.post("", response_model=AIReportRead, status_code=status.HTTP_201_CREATED)
async def create_ai_report(body: AIReportCreate, user: HRStaffDep):
    """
    Manually create an AI screening report.
    Typically called internally via generate_ai_report(); exposed for admin use.
    """
    client = get_user_client(user.token)
    result = client.table("ai_reports").insert(body.model_dump()).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create AI report.")

    app_map, cand_map, job_map = _load_lookup_maps(client)
    return _enrich_report(result.data[0], app_map, cand_map, job_map)


@router.patch("/{report_id}", response_model=AIReportRead)
async def update_ai_report(report_id: str, body: AIReportUpdate, user: HRStaffDep):
    """
    Partially update an AI report.

    AiIntelligenceView use-cases:
      - "VERIFY CREDENTIALS"  → {verification_status: "verified"}
      - "REVOKE VERIFICATION" → {verification_status: "revoked"}
      - "FLAG ANOMALY"        → {flagged: true}
      - "DISMISS FLAG"        → {flagged: false}
    """
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=422, detail="No fields provided for update.")

    client = get_user_client(user.token)
    result = (
        client.table("ai_reports")
        .update(payload)
        .eq("id", report_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="AI report not found.")

    app_map, cand_map, job_map = _load_lookup_maps(client)
    return _enrich_report(result.data[0], app_map, cand_map, job_map)
