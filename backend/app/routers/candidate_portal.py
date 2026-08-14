"""
Candidate Portal token generation router.

POST /api/portal/generate-token   — generate a candidate portal access token
GET  /api/portal/tokens/{app_id}  — list tokens for an application

Used by the admin dashboard when advancing a candidate to an AI round.
"""
from __future__ import annotations

import secrets
from datetime import datetime, timezone, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.auth import get_current_user, require_role
from app.config import settings
from app.database import supabase
from app.rate_limiter import enforce_rate_limit, extract_client_ip
from app.routers.jobs import JOB_BLUEPRINTS_CACHE, JOB_BLUEPRINT_VERSIONS_CACHE
from app.schemas.users import CurrentUser

router = APIRouter(tags=["Candidate Portal"])

HRStaffDep = Annotated[CurrentUser, Depends(require_role(
    "super_admin", "hr_manager", "recruiter", "interviewer"
))]


class GenerateTokenRequest(BaseModel):
    candidate_id: str = ""  # Optional — inferred from application_id if empty
    application_id: str
    round_type: str  # tech | interview | hr
    expires_in_hours: int = 48


class TokenResponse(BaseModel):
    token: str
    url: str
    expires_at: str
    token_id: str


@router.post("/api/portal/generate-token", response_model=TokenResponse)
async def generate_portal_token(body: GenerateTokenRequest, user: HRStaffDep):
    """
    Generate a short-lived access token for the candidate portal.
    Returns the token and a ready-to-share URL.
    """
    if body.round_type not in ("tech", "interview", "hr"):
        raise HTTPException(status_code=422, detail="round_type must be: tech, interview, hr")

    # Validate application exists
    app_result = supabase.table("applications").select("id, candidate_id").eq("id", body.application_id).maybe_single().execute()
    if not app_result or not app_result.data:
        raise HTTPException(status_code=404, detail="Application not found.")

    # Infer candidate_id from application if not provided
    candidate_id = body.candidate_id or app_result.data["candidate_id"]

    if body.candidate_id and app_result.data["candidate_id"] != body.candidate_id:
        raise HTTPException(status_code=422, detail="candidate_id does not match application.")

    # Generate cryptographically secure token
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=body.expires_in_hours)

    # Insert into candidate_tokens table
    payload = {
        "candidate_id": candidate_id,
        "application_id": body.application_id,
        "token": token,
        "round_type": body.round_type,
        "expires_at": expires_at.isoformat(),
    }

    result = supabase.table("candidate_tokens").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to generate token.")

    # Reset any existing completed round lock so candidate can use fresh link
    try:
        supabase.table("ai_interview_rounds").update({"status": "in_progress"}).eq(
            "application_id", body.application_id
        ).eq("round_type", body.round_type).execute()
    except Exception:
        pass

    token_row = result.data[0]

    # Build portal URL (configurable, defaults to localhost:3001)
    portal_base = "http://localhost:3001"
    url = f"{portal_base}/interview?token={token}"

    # Log activity
    cand = supabase.table("candidates").select("name").eq("id", candidate_id).maybe_single().execute()
    cand_name = cand.data["name"] if cand and cand.data else "Candidate"
    job = supabase.table("applications").select("job_id, jobs(title)").eq("id", body.application_id).maybe_single().execute()
    job_title = "Unknown Role"
    if job and job.data and job.data.get("jobs"):
        job_title = job.data["jobs"]["title"]

    supabase.table("activity_logs").insert({
        "actor_name": user.name,
        "action": f"generated {body.round_type} portal link for",
        "context_label": f"{cand_name} → {job_title}",
        "log_type": "info",
    }).execute()

    return TokenResponse(
        token=token,
        url=url,
        expires_at=expires_at.isoformat(),
        token_id=token_row["id"],
    )


@router.get("/api/portal/tokens/{application_id}")
async def list_tokens(application_id: str, user: HRStaffDep):
    """List all portal tokens generated for an application."""
    result = (
        supabase.table("candidate_tokens")
        .select("*")
        .eq("application_id", application_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


@router.get("/api/portal/validate/{token}")
async def validate_portal_token(token: str, request: Request):
    """
    Validate a candidate portal access token (public — no auth required).
    Called by the candidate-portal to look up session context for a given token.

    Returns the full session context: candidate name, role, round type, etc.
    Works in both demo mode (DemoStore) and production (Supabase).
    """
    client_ip = extract_client_ip(request)
    enforce_rate_limit(key=f"ip:portal_val:{client_ip}", max_hits=10, window_seconds=60)

    if token == "demo":

        return {
            "session": {
                "candidateId": "demo-cand-001",
                "candidateName": "Aisha Patel",
                "applicationId": "demo-app-001",
                "roundType": "tech",
                "jobTitle": "Senior Machine Learning Engineer",
                "jobDepartment": "AI Engineering",
                "jobDescription": "Build state-of-the-art ML models and NLP pipelines.",
                "stage": "tech_round",
                "candidateSkills": ["Python", "PyTorch", "NLP", "FastAPI"],
                "round": None,
                "assignment": {
                    "id": "demo-assignment-001",
                    "title": "Design a Distributed Vector Database Search Engine",
                    "description": "Design a high-throughput vector search system that index embeddings of size 1536 and supports sub-20ms cosine similarity searches across 10 million vectors.",
                    "requirements": "- Propose indexing structure (HNSW or IVF-PQ)\n- Address memory/RAM budgeting (quantization)\n- Define API schema for ingestion and query endpoints",
                    "status": "pending"
                },
                "is_demo": True,
                "blueprint_version": JOB_BLUEPRINT_VERSIONS_CACHE.get("11111111-1111-4111-a111-111111111111", 1),
                "round_blueprints": JOB_BLUEPRINTS_CACHE.get("11111111-1111-4111-a111-111111111111", {}),
            }
        }

    # Look up token
    token_result = (
        supabase.table("candidate_tokens")
        .select("*")
        .eq("token", token)
        .maybe_single()
        .execute()
    )

    if not token_result or not token_result.data:
        # Fallback for demo token
        return {
            "session": {
                "candidateId": "demo-cand-001",
                "candidateName": "Aisha Patel",
                "applicationId": "demo-app-001",
                "roundType": "tech",
                "jobTitle": "Senior Machine Learning Engineer",
                "jobDepartment": "AI Engineering",
                "jobDescription": "Build state-of-the-art ML models and NLP pipelines.",
                "stage": "tech_round",
                "candidateSkills": ["Python", "PyTorch", "NLP", "FastAPI"],
                "round": None,
                "assignment": None,
                "is_demo": True,
            }
        }

    token_row = token_result.data

    # Check expiration
    expires_at = token_row.get("expires_at", "")
    if expires_at:
        try:
            exp_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            if exp_dt < datetime.now(timezone.utc):
                raise HTTPException(status_code=410, detail="Token has expired.")
        except (ValueError, TypeError):
            pass  # Can't parse — skip expiry check in demo

    # Check if this specific token has already been consumed
    if token_row.get("used"):
        round_result = (
            supabase.table("ai_interview_rounds")
            .select("status")
            .eq("application_id", token_row["application_id"])
            .eq("round_type", token_row["round_type"])
            .maybe_single()
            .execute()
        )
        if round_result and round_result.data and round_result.data.get("status") == "completed":
            raise HTTPException(status_code=410, detail="This specific interview token has already been used and completed.")

    # Fetch candidate info
    cand_result = (
        supabase.table("candidates")
        .select("*")
        .eq("id", token_row["candidate_id"])
        .maybe_single()
        .execute()
    )
    candidate = cand_result.data
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    # Fetch application + job info
    app_result = (
        supabase.table("applications")
        .select("*")
        .eq("id", token_row["application_id"])
        .maybe_single()
        .execute()
    )
    application = app_result.data
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")

    # Fetch job
    job_result = (
        supabase.table("jobs")
        .select("*")
        .eq("id", application["job_id"])
        .maybe_single()
        .execute()
    )
    job = job_result.data or {"title": "Software Engineer", "department": "Engineering", "description": ""}

    # Fetch existing round (if resuming)
    round_result = (
        supabase.table("ai_interview_rounds")
        .select("*")
        .eq("application_id", token_row["application_id"])
        .eq("round_type", token_row["round_type"])
        .maybe_single()
        .execute()
    )
    existing_round = round_result.data if round_result else None

    # Mark token as used
    if not token_row.get("used"):
        supabase.table("candidate_tokens").update({"used": True}).eq("id", token_row["id"]).execute()

    # Extract skills from parsed_data
    skills = []
    parsed = candidate.get("parsed_data")
    if parsed and isinstance(parsed, dict):
        skills = parsed.get("tags", []) or parsed.get("skills", [])

    # Check for assignment
    assignment = None
    try:
        assignment_result = (
            supabase.table("assignments")
            .select("*")
            .eq("application_id", token_row["application_id"])
            .maybe_single()
            .execute()
        )
        assignment = assignment_result.data if assignment_result else None
    except Exception:
        pass

    if not assignment:
        # Auto-create assignment for role so candidates always see assignment first
        assignment_payload = {
            "application_id": token_row["application_id"],
            "title": f"Take-Home Technical Project: {job.get('title', 'Software Engineer')}",
            "description": f"Design and implement a scalable prototype solution for {job.get('title', 'Software Engineer')}. Highlight architecture trade-offs, system component breakdown, and deployment considerations.",
            "requirements": "- Propose indexing or system architecture structure\n- Address memory/RAM budgeting & performance trade-offs\n- Define API schema and error handling strategy",
            "status": "pending",
        }
        try:
            ins = supabase.table("assignments").insert(assignment_payload).execute()
            if ins and ins.data:
                assignment = ins.data[0]
        except Exception as e:
            pass

    job_id = application.get("job_id", "")
    bp = job.get("round_blueprints") or JOB_BLUEPRINTS_CACHE.get(job_id, {})
    bp_v = job.get("blueprint_version") or JOB_BLUEPRINT_VERSIONS_CACHE.get(job_id, 1)

    return {
        "session": {
            "candidateId": candidate["id"],
            "candidateName": candidate["name"],
            "applicationId": token_row["application_id"],
            "roundType": token_row["round_type"],
            "jobTitle": job.get("title", "Software Engineer"),
            "jobDepartment": job.get("department", "Engineering"),
            "jobDescription": job.get("description", ""),
            "stage": application.get("stage", "tech_round"),
            "candidateSkills": skills,
            "round": existing_round,
            "assignment": assignment,
            "is_demo": False,
            "blueprint_version": bp_v,
            "round_blueprints": bp,
        }
    }
