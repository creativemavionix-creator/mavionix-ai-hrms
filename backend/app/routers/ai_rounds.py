"""
AI Interview Rounds router.

POST /api/applications/{id}/start-round/{round_type}  — start a new AI round
POST /api/applications/{id}/round/{round_id}/respond  — candidate responds
GET  /api/applications/{id}/rounds                    — list all rounds for an app
GET  /api/rounds/{round_id}                           — get full round with transcript
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth import get_current_user, require_role
from app.candidate_auth import (
    CandidateSession,
    get_current_candidate,
    require_candidate_application,
    require_candidate_round_type,
)
from app.config import settings
from app.database import supabase
from app.rate_limiter import enforce_rate_limit, hash_candidate_token
from app.routers.jobs import JOB_BLUEPRINTS_CACHE

from app.schemas.users import CurrentUser
from app.services.ai_interviews import (
    generate_first_question,
    generate_round_summary,
    process_response,
)
from app.services.stage_machine import advance_stage

logger = logging.getLogger(__name__)

router = APIRouter(tags=["AI Rounds"])

CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]
HRStaffDep = Annotated[CurrentUser, Depends(require_role(
    "super_admin", "hr_manager", "recruiter", "interviewer"
))]
CandidateDep = Annotated[CandidateSession, Depends(get_current_candidate)]

# Stage mapping for round types
ROUND_STAGE_MAP = {
    "tech": {"start": "tech_round", "complete": "tech_round_completed"},
    "interview": {"start": "interview_round", "complete": "interview_round_completed"},
    "speaking": {"start": "speaking_round", "complete": "speaking_round_completed"},
    "hr": {"start": "hr_round", "complete": "hr_round_completed"},
}

from typing import Any
DEMO_ROUNDS: dict[str, Any] = {}


# Auto-chain: after one round completes, which round starts next?
NEXT_ROUND = {
    "tech": "interview",
    "interview": "speaking",
    "speaking": "hr",
    "hr": None,  # HR is the final round
}


class RespondRequest(BaseModel):
    message: str
    candidate_skills: list[str] | None = None
    speaking_metrics: dict | None = None


class StrikeRequest(BaseModel):
    strikes: int


# ── Start Round ───────────────────────────────────────────────────────────────

@router.post("/api/applications/{application_id}/start-round/{round_type}")
async def start_round(application_id: str, round_type: str, candidate: CandidateDep):
    """
    Start an AI interview round (tech, interview, or hr).
    Creates the ai_interview_rounds row and generates the first question.
    """
    require_candidate_application(application_id, candidate)
    require_candidate_round_type(round_type, candidate)

    # Rate limit: 5 requests per minute per candidate token (hashed)
    enforce_rate_limit(
        key=f"ai:start:candidate:{hash_candidate_token(candidate.token)}",
        max_hits=5,
        window_seconds=60,
    )

    if round_type not in ROUND_STAGE_MAP:

        raise HTTPException(status_code=422, detail=f"Invalid round_type. Must be: tech, interview, hr")

    # Fetch application
    if application_id.startswith("demo") or settings.demo_mode:
        app = {"id": application_id, "candidate_id": "demo-cand-001", "job_id": "demo-job-001", "stage": "tech_round"}
    else:
        try:
            app_result = supabase.table("applications").select("id, candidate_id, job_id, stage").eq("id", application_id).maybe_single().execute()
            if not app_result or not getattr(app_result, "data", None):
                raise HTTPException(status_code=404, detail=f"Application {application_id} not found.")
            app = app_result.data
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=404, detail=f"Application {application_id} not found.")

    # Check if round already exists and is in progress
    existing = supabase.table("ai_interview_rounds").select("id, status").eq("application_id", application_id).eq("round_type", round_type).maybe_single().execute()
    if existing and existing.data and existing.data["status"] == "in_progress":
        # Return existing round
        round_data = supabase.table("ai_interview_rounds").select("*").eq("id", existing.data["id"]).maybe_single().execute()
        return {"round": round_data.data if round_data else None, "message": "Round already in progress", "resumed": True}

    if existing and existing.data and existing.data["status"] == "completed":
        raise HTTPException(status_code=422, detail=f"The {round_type} round is already completed.")

    # Get job and candidate context
    job = supabase.table("jobs").select("*").eq("id", app["job_id"]).maybe_single().execute()
    job_data = job.data if job else None
    if not job_data:
        job_data = {"title": "Software Engineer", "department": "Engineering", "description": ""}

    round_blueprints = job_data.get("round_blueprints") or JOB_BLUEPRINTS_CACHE.get(app["job_id"], {})
    round_bp = round_blueprints.get(round_type, {})
    custom_qs = round_bp.get("custom_questions", [])

    cand = supabase.table("candidates").select("name, parsed_data").eq("id", app["candidate_id"]).maybe_single().execute()
    cand_data = cand.data if cand else None
    if not cand_data:
        cand_data = {"name": "Candidate", "parsed_data": None}

    # Extract skills from parsed_data
    skills = []
    if cand_data.get("parsed_data") and isinstance(cand_data["parsed_data"], dict):
        skills = cand_data["parsed_data"].get("tags", []) or cand_data["parsed_data"].get("skills", [])

    # Generate first question
    first_question = await generate_first_question(
        round_type=round_type,
        job_title=job_data["title"],
        department=job_data["department"],
        job_description=job_data.get("description"),
        candidate_name=cand_data["name"],
        candidate_skills=skills,
        custom_questions=custom_qs,
    )

    # Create the round record
    now = datetime.now(timezone.utc).isoformat()
    initial_transcript = [
        {"role": "ai", "message": first_question, "timestamp": now}
    ]

    round_payload = {
        "application_id": application_id,
        "round_type": round_type,
        "transcript": initial_transcript,
        "status": "in_progress",
        "started_at": now,
    }
    round_row = None
    try:
        insert_result = supabase.table("ai_interview_rounds").insert(round_payload).execute()
        if insert_result and insert_result.data:
            round_row = insert_result.data[0]
    except Exception:
        pass

    if not round_row:
        round_row = {
            "id": f"demo-round-{len(DEMO_ROUNDS) + 1}",
            "application_id": application_id,
            "round_type": round_type,
            "transcript": initial_transcript,
            "status": "in_progress",
            "started_at": now,
        }
    DEMO_ROUNDS[round_row["id"]] = round_row

    # Mark token as used when round actually starts
    if candidate and candidate.token:
        try:
            supabase.table("candidate_tokens").update({"used": True}).eq("token", candidate.token).execute()
        except Exception:
            pass

    # Advance stage
    start_stage = ROUND_STAGE_MAP[round_type]["start"]

    try:
        await advance_stage(application_id, start_stage, cand_data.get("name", "Candidate"), f"{round_type} round started")
    except Exception as exc:
        logger.warning("Stage advance to %s failed: %s", start_stage, exc)


    # Log
    try:
        supabase.table("activity_logs").insert({
            "actor_name": cand_data["name"],
            "action": f"started AI {round_type} round for",
            "context_label": job_data["title"],
            "log_type": "info",
        }).execute()
    except Exception:
        pass

    return {
        "round": round_row,
        "first_question": first_question,
        "message": f"{round_type.capitalize()} round started",
        "resumed": False,
    }


# ── Respond ───────────────────────────────────────────────────────────────────

@router.post("/api/applications/{application_id}/round/{round_id}/respond")
async def respond_to_round(application_id: str, round_id: str, body: RespondRequest, candidate: CandidateDep):
    """
    Candidate responds to a question. AI evaluates and either asks a follow-up
    or signals round completion.
    """
    require_candidate_application(application_id, candidate)

    # Rate limit: 10 requests per minute per candidate token (hashed)
    enforce_rate_limit(
        key=f"ai:respond:candidate:{hash_candidate_token(candidate.token)}",
        max_hits=10,
        window_seconds=60,
    )

    # Fetch the round

    round_data = None
    try:
        round_result = supabase.table("ai_interview_rounds").select("*").eq("id", round_id).maybe_single().execute()
        if round_result and round_result.data:
            round_data = round_result.data
    except Exception:
        pass

    if not round_data:
        round_data = DEMO_ROUNDS.get(round_id)

    if not round_data:
        r_type = candidate.round_type
        # Fallback demo round structure
        round_data = {
            "id": round_id,
            "application_id": application_id,
            "round_type": r_type,
            "status": "in_progress",
            "transcript": [{"role": "ai", "message": f"Welcome to the {r_type} round.", "timestamp": datetime.now(timezone.utc).isoformat()}],
        }
        DEMO_ROUNDS[round_id] = round_data

    if round_data["application_id"] != candidate.application_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Round does not belong to your authorized application.")

    require_candidate_round_type(round_data["round_type"], candidate)

    # Get job context for question generation
    app_result = supabase.table("applications").select("job_id").eq("id", application_id).maybe_single().execute()
    job_title = "Software Engineer"
    if app_result and app_result.data:
        job = supabase.table("jobs").select("title").eq("id", app_result.data["job_id"]).maybe_single().execute()
        if job and job.data:
            job_title = job.data["title"]

    now = datetime.now(timezone.utc).isoformat()
    transcript = round_data.get("transcript") or []
    cand_entry = {"role": "candidate", "message": body.message, "timestamp": now}
    if body.speaking_metrics:
        cand_entry["speaking_metrics"] = body.speaking_metrics
    transcript.append(cand_entry)

    # Count exchanges (an exchange = one AI question + one candidate answer)
    exchange_count = sum(1 for t in transcript if t["role"] == "candidate")

    # Process with AI
    ai_result = await process_response(
        round_type=round_data["round_type"],
        transcript=transcript,
        job_title=job_title,
        exchange_count=exchange_count,
        candidate_skills=body.candidate_skills,
        speaking_metrics=body.speaking_metrics,
    )

    # Append AI's response to transcript with metadata
    ai_message = ai_result.get("message", "")
    new_entry = {
        "role": "ai",
        "message": ai_message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "answer_score": ai_result.get("answer_score"),
    }
    for key in ["state", "memory", "quality_metadata", "intent", "intent_confidence", "is_warning", "is_duplicate", "is_plagiarism", "suspected_plagiarism"]:
        if key in ai_result:
            new_entry[key] = ai_result[key]
            
    transcript.append(new_entry)

    is_complete = ai_result.get("type") == "complete"

    if is_complete:
        # Get candidate skills for integrity checks
        skills = body.candidate_skills or []
        if not skills:
            try:
                app_details = supabase.table("applications").select("candidate_id").eq("id", application_id).maybe_single().execute()
                if app_details and app_details.data:
                    cand = supabase.table("candidates").select("parsed_data").eq("id", app_details.data["candidate_id"]).maybe_single().execute()
                    if cand and cand.data and cand.data.get("parsed_data") and isinstance(cand.data["parsed_data"], dict):
                        skills = cand.data["parsed_data"].get("tags", []) or cand.data["parsed_data"].get("skills", [])
            except Exception:
                pass

        # Generate full round summary
        summary = await generate_round_summary(
            round_type=round_data["round_type"],
            transcript=transcript,
            job_title=job_title,
            candidate_skills=skills,
        )

        # Update round as completed
        supabase.table("ai_interview_rounds").update({
            "transcript": transcript,
            "status": "completed",
            "ai_score": summary.get("ai_score"),
            "ai_summary": summary.get("ai_summary"),
            "strengths": summary.get("strengths", []),
            "concerns": summary.get("concerns", []),
            "compact_offline_data": summary.get("compact_offline_data"),
            "completed_at": datetime.now(timezone.utc).isoformat(),
            # Reprocessing tracking fields
            "requires_ai_reprocessing": summary.get("requires_ai_reprocessing", False),
            "ai_review_completed": summary.get("ai_review_completed", True),
            "evaluation_status": summary.get("evaluation_status", "verified"),
            "evaluation_engine": summary.get("evaluation_engine", "llm"),
            "evaluation_model": summary.get("evaluation_model", "Gemini"),
            "evaluation_version": summary.get("evaluation_version", 2),
            "reviewed_at": summary.get("reviewed_at"),
        }).eq("id", round_id).execute()

        # Advance stage to {round_type}_completed
        complete_stage = ROUND_STAGE_MAP[round_data["round_type"]]["complete"]
        try:
            await advance_stage(application_id, complete_stage, "AI System", f"{round_data['round_type']} round completed (score: {summary.get('ai_score')})")
        except Exception as exc:
            logger.warning("Stage advance failed: %s", exc)

        # Log
        cand = supabase.table("applications").select("candidate_id").eq("id", application_id).maybe_single().execute()
        cand_name = "Candidate"
        if cand.data:
            cn = supabase.table("candidates").select("name").eq("id", cand.data["candidate_id"]).maybe_single().execute()
            if cn.data:
                cand_name = cn.data["name"]

        try:
            supabase.table("activity_logs").insert({
                "actor_name": cand_name,
                "action": f"completed AI {round_data['round_type']} round (score: {summary.get('ai_score')}/100) for",
                "context_label": job_title,
                "log_type": "success",
            }).execute()
        except Exception:
            pass

        # Auto-chain: start next round if applicable
        next_round_type = NEXT_ROUND.get(round_data["round_type"])
        auto_started_next = None
        if next_round_type and summary.get("ai_score", 0) >= 55:
            try:
                # Create the next round automatically
                next_stage = ROUND_STAGE_MAP[next_round_type]["start"]
                await advance_stage(application_id, next_stage, "AI System", f"Auto-chained from {round_data['round_type']} round")
                auto_started_next = next_round_type
                logger.info("Auto-chained: %s → %s for app %s", round_data["round_type"], next_round_type, application_id)
            except Exception as exc:
                logger.warning("Auto-chain to %s failed: %s", next_round_type, exc)

        # If HR round just completed, generate final recommendation
        final_rec = None
        if round_data["round_type"] == "hr":
            try:
                from app.services.final_recommendation import generate_final_recommendation
                final_rec = await generate_final_recommendation(application_id)
                logger.info("Final recommendation generated for %s", application_id)
            except Exception as exc:
                logger.warning("Final recommendation failed: %s", exc)

        round_data["transcript"] = transcript
        round_data["status"] = "completed"
        round_data["summary"] = summary
        DEMO_ROUNDS[round_id] = round_data

        return {
            "type": "complete",
            "message": ai_message,
            "answer_score": ai_result.get("answer_score"),
            "summary": summary,
            "round_complete": True,
            "auto_started_next_round": auto_started_next,
            "final_recommendation": final_rec,
        }
    else:
        # Update transcript (round continues)
        round_data["transcript"] = transcript
        DEMO_ROUNDS[round_id] = round_data
        try:
            supabase.table("ai_interview_rounds").update({
                "transcript": transcript,
            }).eq("id", round_id).execute()
        except Exception:
            pass

        return {
            "type": "question",
            "message": ai_message,
            "answer_score": ai_result.get("answer_score"),
            "exchange_number": exchange_count,
            "round_complete": False,
        }


@router.post("/api/applications/{application_id}/round/{round_id}/strike")
async def report_strike(application_id: str, round_id: str, body: StrikeRequest, candidate: CandidateDep):
    """
    Update the candidate's browser strikes in the database.
    If strikes >= 3, force compile evaluation and abort interview.
    """
    require_candidate_application(application_id, candidate)

    # Fetch round details
    round_data = None
    if round_id in DEMO_ROUNDS:
        round_data = DEMO_ROUNDS[round_id]
    else:
        try:
            r = supabase.table("ai_interview_rounds").select("*").eq("id", round_id).maybe_single().execute()
            if r.data:
                round_data = r.data
        except Exception:
            pass

    if not round_data:
        # Fallback to demo structure if not found
        round_data = {
            "id": round_id,
            "application_id": application_id,
            "round_type": candidate.round_type,
            "transcript": [],
            "status": "in_progress",
            "browser_strike_count": 0,
        }

    if round_data["application_id"] != candidate.application_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Round does not belong to your authorized application.")

    require_candidate_round_type(round_data["round_type"], candidate)

    strikes = body.strikes
    round_data["browser_strike_count"] = strikes
    
    # Try updating database
    try:
        supabase.table("ai_interview_rounds").update({
            "browser_strike_count": strikes
        }).eq("id", round_id).execute()
    except Exception:
        pass

    if strikes >= 3:
        # Fetch job title
        job_title = "ML Engineer"
        try:
            app_result = supabase.table("applications").select("job_id").eq("id", application_id).maybe_single().execute()
            if app_result.data:
                job_res = supabase.table("jobs").select("title").eq("id", app_result.data["job_id"]).maybe_single().execute()
                if job_res.data:
                    job_title = job_res.data["title"]
        except Exception:
            pass

        # Fetch skills
        skills = []
        try:
            app_details = supabase.table("applications").select("candidate_id").eq("id", application_id).maybe_single().execute()
            if app_details.data:
                cand = supabase.table("candidates").select("parsed_data").eq("id", app_details.data["candidate_id"]).maybe_single().execute()
                if cand.data and cand.data.get("parsed_data") and isinstance(cand.data["parsed_data"], dict):
                    skills = cand.data["parsed_data"].get("tags", []) or cand.data["parsed_data"].get("skills", [])
        except Exception:
            pass

        transcript = round_data.get("transcript") or []
        summary = await generate_round_summary(
            round_type=round_data["round_type"],
            transcript=transcript,
            job_title=job_title,
            candidate_skills=skills,
        )

        # Force termination text
        summary["concerns"] = (summary.get("concerns") or []) + [
            "🚫 Interview terminated automatically: Candidate navigated away from the browser tab 3 times."
        ]
        summary["ai_summary"] = "[TERMINATED] " + summary.get("ai_summary", "")

        # Update round status in db
        try:
            supabase.table("ai_interview_rounds").update({
                "status": "completed",
                "ai_score": summary.get("ai_score"),
                "ai_summary": summary.get("ai_summary"),
                "strengths": summary.get("strengths", []),
                "concerns": summary.get("concerns", []),
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", round_id).execute()
        except Exception:
            pass

        round_data["status"] = "completed"
        round_data["summary"] = summary
        DEMO_ROUNDS[round_id] = round_data

        return {
            "type": "complete",
            "message": "This interview has been terminated due to tab leaves.",
            "round_complete": True,
            "summary": summary,
        }

    DEMO_ROUNDS[round_id] = round_data
    return {
        "type": "strike_synced",
        "browser_strike_count": strikes,
        "round_complete": False,
    }


@router.post("/api/applications/{application_id}/round/{round_type}/reset")
async def reset_round(application_id: str, round_type: str, user: CurrentUserDep):
    """
    Reset an interview round:
    1. Delete the round record from ai_interview_rounds
    2. Reset the application stage back to the start stage of the round
    """
    if round_type not in ROUND_STAGE_MAP:
        raise HTTPException(status_code=422, detail="Invalid round_type")

    # 1. Delete round row
    try:
        supabase.table("ai_interview_rounds").delete().eq("application_id", application_id).eq("round_type", round_type).execute()
    except Exception:
        pass

    # Clean from demo storage
    rounds_to_delete = [rid for rid, r in DEMO_ROUNDS.items() if r.get("application_id") == application_id and r.get("round_type") == round_type]
    for rid in rounds_to_delete:
        DEMO_ROUNDS.pop(rid, None)

    # 2. Reset application stage back to the start stage
    start_stage = ROUND_STAGE_MAP[round_type]["start"]
    try:
        supabase.table("applications").update({"stage": start_stage}).eq("id", application_id).execute()
    except Exception:
        pass

    # Log transition
    try:
        await advance_stage(application_id, start_stage, user.name, f"Restarted {round_type} round (recruiter request)")
    except Exception:
        pass

    return {"message": f"Successfully restarted {round_type} round."}


# ── Get rounds ────────────────────────────────────────────────────────────────

@router.get("/api/applications/{application_id}/rounds")
async def list_rounds(application_id: str, user: HRStaffDep):
    """List all AI interview rounds for an application."""
    result = (
        supabase.table("ai_interview_rounds")
        .select("*")
        .eq("application_id", application_id)
        .order("created_at")
        .execute()
    )
    return result.data or []


@router.get("/api/rounds/{round_id}")
async def get_round(round_id: str, user: HRStaffDep):
    """Fetch a single round with full transcript."""
    result = supabase.table("ai_interview_rounds").select("*").eq("id", round_id).maybe_single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Round not found.")
    return result.data


# ── Final Recommendation ──────────────────────────────────────────────────────

@router.get("/api/applications/{application_id}/recommendation")
async def get_recommendation(application_id: str, user: HRStaffDep):
    """Fetch the final recommendation for an application (if it exists)."""
    result = supabase.table("final_recommendations").select("*").eq("application_id", application_id).maybe_single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="No recommendation yet.")
    return result.data


@router.post("/api/applications/{application_id}/approve-offer")
async def approve_for_offer(application_id: str, user: HRStaffDep):
    """HR approves the candidate for an offer — advances stage to 'offered'."""
    # Check current stage first
    app = supabase.table("applications").select("stage").eq("id", application_id).maybe_single().execute()
    if not app.data:
        raise HTTPException(status_code=404, detail="Application not found.")

    current = app.data["stage"]
    if current == "offered":
        # Already at offered — just log the HR confirmation
        pass
    elif current == "hired":
        pass  # Already hired
    else:
        try:
            await advance_stage(application_id, "offered", user.name, "HR approved for offer")
        except Exception as exc:
            raise HTTPException(status_code=422, detail=str(exc))

    # Log HR confirmation
    app_full = supabase.table("applications").select("candidate_id, job_id").eq("id", application_id).maybe_single().execute()
    if app_full.data:
        cand = supabase.table("candidates").select("name").eq("id", app_full.data["candidate_id"]).maybe_single().execute()
        job = supabase.table("jobs").select("title").eq("id", app_full.data["job_id"]).maybe_single().execute()
        supabase.table("activity_logs").insert({
            "actor_name": user.name,
            "action": "approved for offer (HR decision) for",
            "context_label": job.data["title"] if job.data else "Role",
            "log_type": "success",
        }).execute()

    return {"status": "offered", "application_id": application_id}


@router.post("/api/applications/{application_id}/reject-final")
async def reject_final(application_id: str, user: HRStaffDep):
    """HR rejects the candidate — advances stage to 'rejected'."""
    app = supabase.table("applications").select("stage").eq("id", application_id).maybe_single().execute()
    if not app.data:
        raise HTTPException(status_code=404, detail="Application not found.")

    if app.data["stage"] == "rejected":
        return {"status": "rejected", "application_id": application_id}

    try:
        await advance_stage(application_id, "rejected", user.name, "HR rejected after review")
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return {"status": "rejected", "application_id": application_id}


@router.post("/api/applications/{application_id}/generate-recommendation")
async def trigger_recommendation(application_id: str, user: HRStaffDep):
    """Manually trigger final recommendation generation (useful if auto-trigger didn't fire)."""
    from app.services.final_recommendation import generate_final_recommendation
    result = await generate_final_recommendation(application_id)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to generate recommendation.")
    return result


from app.auth import require_internal_or_hr

@router.post("/api/applications/reevaluate-offline-rounds")
async def reevaluate_offline_rounds(payload: dict | None = None, user: CurrentUser = Depends(require_internal_or_hr)):
    """
    Recalculates offline rule-evaluated interview rounds using the LLM service
    once API connectivity is restored.
    """
    body = payload or {}
    target_round_id = body.get("roundId")

    from app.services.re_evaluator import reprocess_pending_rounds
    processed = await reprocess_pending_rounds(target_round_id)

    return {
        "success": True,
        "message": f"Successfully re-evaluated {len(processed)} offline round(s) with AI!",
        "reevaluated_count": len(processed),
        "reevaluated_round_ids": processed,
    }
