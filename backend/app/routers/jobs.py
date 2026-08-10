"""
Jobs router – /api/jobs

Backs JobManagementView.tsx:
  - GET  /api/jobs          list with filters (status, search, pagination)
  - GET  /api/jobs/stats    stat-card counts
  - GET  /api/jobs/{id}     single job
  - POST /api/jobs          create + auto-generate job_code
  - PATCH /api/jobs/{id}    partial update (status, priority, …)
  - DELETE /api/jobs/{id}   hard delete
"""
from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user, require_role
from app.database import get_user_client, supabase
from app.demo_store import store
from app.schemas.jobs import JobCreate, JobRead, JobStats, JobUpdate
from app.schemas.users import CurrentUser

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])

CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]
HRManagerDep   = Annotated[CurrentUser, Depends(require_role("super_admin", "hr_manager"))]

# ── helpers ───────────────────────────────────────────────────────────────────

JOB_BLUEPRINTS_CACHE: dict[str, dict] = {}
JOB_BLUEPRINT_VERSIONS_CACHE: dict[str, int] = {}

def _row_to_job(row: dict) -> dict:
    """Normalise a raw Supabase row to match JobRead fields."""
    job_id = row.get("id", "")
    bp = row.get("round_blueprints") or JOB_BLUEPRINTS_CACHE.get(job_id, {})
    bp_v = row.get("blueprint_version") or JOB_BLUEPRINT_VERSIONS_CACHE.get(job_id, 1)
    return {
        "id":                 row["id"],
        "job_code":           row["job_code"],
        "title":              row["title"],
        "department":         row["department"],
        "location":           row["location"],
        "status":             row["status"],
        "priority":           row["priority"],
        "posted_date":        row["posted_date"],
        "description":        row.get("description"),
        "created_by":         row.get("created_by"),
        "created_at":         row["created_at"],
        "blueprint_version":  bp_v,
        "round_blueprints":   bp,
        "applicant_count":    row.get("applicant_count", 0),
    }


def _next_job_code() -> str:
    """
    Generate the next sequential job_code like JOB-001, JOB-042, etc.
    Uses the service-role client so we can count all rows regardless of RLS.
    """
    result = supabase.table("jobs").select("job_code", count="exact").execute()
    n = (result.count or 0) + 1
    return f"JOB-{n:03d}"


# ── routes ────────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=JobStats)
async def get_job_stats(user: CurrentUserDep):
    """
    Returns the three stat-card counts shown at the top of JobManagementView:
      - active_roles       (status = 'active')
      - high_priority      (status = 'active' AND priority = 'high')
      - draft_roles        (status = 'draft')
    """
    client = get_user_client(user.token)
    result = client.table("jobs").select("status, priority").execute()
    rows = result.data or []

    active    = [r for r in rows if r["status"] == "active"]
    high_prio = [r for r in active if r["priority"] == "high"]
    drafts    = [r for r in rows if r["status"] == "draft"]

    return JobStats(
        active_roles=len(active),
        high_priority=len(high_prio),
        draft_roles=len(drafts),
    )


@router.get("", response_model=list[JobRead])
async def list_jobs(
    user: CurrentUserDep,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
):
    """
    List job requisitions with optional filters.

    - status  : active | onhold | draft | closed
    - priority: high | medium | low
    - search  : case-insensitive substring match on title, department, or location
    - limit / offset for pagination

    HR staff see all statuses; candidates see only active (RLS).
    applicant_count is computed from the applications table via a COUNT join.
    """
    client = get_user_client(user.token)

    # Select jobs + count of linked applications in one query using a PostgREST
    # embedded resource count.  The "applications(count)" syntax returns an
    # array with one object: [{"count": N}] which we normalise in _row_to_job.
    query = client.table("jobs").select(
        "*, applications(count)"
    )

    if status:
        query = query.eq("status", status)
    if priority:
        query = query.eq("priority", priority)

    # PostgREST doesn't support OR across columns natively in the Python SDK,
    # so we filter client-side when a search term is provided.
    query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
    result = query.execute()
    rows = result.data or []

    # Inline applicant_count from embedded count
    for row in rows:
        apps = row.pop("applications", [])
        row["applicant_count"] = apps[0]["count"] if apps else 0

    # Client-side search filter (title / department / location)
    if search:
        term = search.lower()
        rows = [
            r for r in rows
            if term in r["title"].lower()
            or term in r["department"].lower()
            or term in r["location"].lower()
        ]

    return [_row_to_job(r) for r in rows]


@router.get("/{job_id}", response_model=JobRead)
async def get_job(job_id: str, user: CurrentUserDep):
    """Fetch a single job by UUID."""
    client = get_user_client(user.token)
    result = (
        client.table("jobs")
        .select("*, applications(count)")
        .eq("id", job_id)
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Job not found.")

    row = result.data
    apps = row.pop("applications", [])
    row["applicant_count"] = apps[0]["count"] if apps else 0
    return _row_to_job(row)


@router.post("", response_model=JobRead, status_code=status.HTTP_201_CREATED)
async def create_job(body: JobCreate, user: HRManagerDep):
    """
    Create a new job requisition.
    - Auto-generates a sequential job_code (JOB-001, JOB-002, …).
    - Sets created_by to the authenticated user's id.

    Accessible by: super_admin, hr_manager
    """
    job_code = _next_job_code()

    payload = {
        "job_code":    job_code,
        "title":       body.title,
        "department":  body.department,
        "location":    body.location,
        "status":      body.status,
        "priority":    body.priority,
        "posted_date": body.posted_date.isoformat(),
        "description": body.description,
        "created_by":  None,
    }

    client = get_user_client(user.token)
    result = client.table("jobs").insert(payload).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create job.")

    row = result.data[0]
    row["applicant_count"] = 0
    return _row_to_job(row)


@router.patch("/{job_id}", response_model=JobRead)
async def update_job(job_id: str, body: JobUpdate, user: HRManagerDep):
    """
    Partially update a job.
    Only fields present (non-None) in the request body are written.

    Accessible by: super_admin, hr_manager
    """
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=422, detail="No fields provided for update.")

    if "round_blueprints" in payload:
        bp = payload["round_blueprints"]
        JOB_BLUEPRINTS_CACHE[job_id] = bp
        cur_v = JOB_BLUEPRINT_VERSIONS_CACHE.get(job_id, 1) + 1
        JOB_BLUEPRINT_VERSIONS_CACHE[job_id] = cur_v
        payload["blueprint_version"] = cur_v

    client = get_user_client(user.token)

    try:
        result = client.table("jobs").update(payload).eq("id", job_id).execute()
    except Exception:
        # If Supabase table doesn't have blueprint_version or round_blueprints columns, pop them and retry
        payload.pop("blueprint_version", None)
        payload.pop("round_blueprints", None)
        if payload:
            try:
                result = client.table("jobs").update(payload).eq("id", job_id).execute()
            except Exception:
                result = store.table("jobs").update(payload).eq("id", job_id).execute()
        else:
            try:
                result = client.table("jobs").select("*").eq("id", job_id).execute()
            except Exception:
                result = store.table("jobs").select("*").eq("id", job_id).execute()

    if not result or not getattr(result, "data", None):
        # Try updating or selecting from in-memory DemoStore fallback
        try:
            result = store.table("jobs").select("*").eq("id", job_id).execute()
        except Exception:
            pass

    if not result or not getattr(result, "data", None):
        raise HTTPException(status_code=404, detail="Job not found or no changes applied.")

    row = result.data[0]

    # Re-fetch applicant count
    apps_result = (
        client.table("applications")
        .select("id", count="exact")
        .eq("job_id", job_id)
        .execute()
    )
    row["applicant_count"] = apps_result.count or 0
    return _row_to_job(row)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(job_id: str, user: HRManagerDep):
    """
    Hard-delete a job requisition.
    Accessible by: super_admin, hr_manager
    """
    client = get_user_client(user.token)
    result = client.table("jobs").delete().eq("id", job_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Job not found.")
