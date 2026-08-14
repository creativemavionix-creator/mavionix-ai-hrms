"""
Assignments router – /api/applications/{id}/assignments

POST /api/applications/{id}/generate-assignment  — AI-generate + send to candidate
POST /api/assignments/{id}/submit                — candidate submits their work
POST /api/assignments/{id}/evaluate              — AI evaluates the submission
GET  /api/assignments/{id}                       — fetch assignment details
GET  /api/applications/{id}/assignment           — fetch assignment by application
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.auth import get_current_user, require_role
from app.candidate_auth import (
    CandidateSession,
    get_current_candidate,
    require_candidate_application,
)
from app.database import supabase
from app.schemas.users import CurrentUser
from app.services.assignments import (
    ASSIGNMENT_ADVANCE_THRESHOLD,
    evaluate_submission,
    generate_assignment,
)
from app.services.stage_machine import advance_stage

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Assignments"])

CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]
HRStaffDep = Annotated[CurrentUser, Depends(require_role(
    "super_admin", "hr_manager", "recruiter", "interviewer"
))]
CandidateDep = Annotated[CandidateSession, Depends(get_current_candidate)]


# ── Request models ────────────────────────────────────────────────────────────

class AssignmentGenerateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    requirements: str | None = None
    deadline_days: int | None = Field(default=3, ge=1, le=30)


class SubmitRequest(BaseModel):
    submission_text: str | None = None
    submission_url: str | None = None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/api/applications/{application_id}/generate-assignment", status_code=status.HTTP_201_CREATED)
async def generate_and_send_assignment(
    application_id: str,
    user: HRStaffDep,
    body: AssignmentGenerateRequest | None = None,
):
    """
    Generate a role-appropriate assignment using DeepSeek or store recruiter-provided custom assignment details,
    save it, advance stage to 'assignment_sent', and queue an email to the candidate.
    """
    # 1. Fetch application + job + candidate
    app_result = (
        supabase.table("applications")
        .select("id, stage, candidate_id, job_id")
        .eq("id", application_id)
        .maybe_single()
        .execute()
    )
    if not app_result or not app_result.data:
        raise HTTPException(status_code=404, detail="Application not found.")
    app = app_result.data

    job_result = (
        supabase.table("jobs")
        .select("title, department, description")
        .eq("id", app["job_id"])
        .maybe_single()
        .execute()
    )
    if not job_result or not job_result.data:
        raise HTTPException(status_code=404, detail="Job not found.")
    job = job_result.data

    cand_result = (
        supabase.table("candidates")
        .select("id, name, email")
        .eq("id", app["candidate_id"])
        .maybe_single()
        .execute()
    )
    if not cand_result or not cand_result.data:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    candidate = cand_result.data

    # 2. Determine assignment title, description, requirements, and deadline
    days = (body.deadline_days if body and body.deadline_days and body.deadline_days > 0 else 3)
    deadline = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()

    if body and body.title and body.description:
        # Use recruiter-provided custom assignment details
        title = body.title.strip()
        description = body.description.strip()
        requirements = body.requirements.strip() if body.requirements else ""
    else:
        # Fall back to DeepSeek AI generation if custom assignment details are not provided
        assignment_data = await generate_assignment(
            job_title=job["title"],
            department=job["department"],
            job_description=job.get("description"),
        )
        title = assignment_data.get("title", f"Assignment: {job['title']}")
        description = assignment_data.get("description", "")
        requirements = assignment_data.get("requirements", "")

    # 3. Check for existing assignment to enforce idempotency and reassignment guards
    existing_asgn_result = (
        supabase.table("assignments")
        .select("*")
        .eq("application_id", application_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    existing_asgn = (
        existing_asgn_result.data[0]
        if existing_asgn_result and existing_asgn_result.data
        else None
    )

    if existing_asgn:
        curr_status = existing_asgn.get("status")
        if curr_status == "submitted":
            raise HTTPException(
                status_code=400,
                detail="Application already has a submitted assignment and cannot be reassigned.",
            )
        elif curr_status == "reviewed":
            raise HTTPException(
                status_code=400,
                detail="Application already has a reviewed assignment and cannot be reassigned.",
            )

    assignment_payload = {
        "application_id": application_id,
        "title": title,
        "description": description,
        "requirements": requirements,
        "status": "pending",
        "deadline": deadline,
    }

    if existing_asgn and existing_asgn.get("status") == "pending":
        # Update existing pending assignment in-place to preserve UUID & prevent duplicates
        update_res = (
            supabase.table("assignments")
            .update(assignment_payload)
            .eq("id", existing_asgn["id"])
            .execute()
        )
        if not update_res.data:
            raise HTTPException(status_code=500, detail="Failed to update existing assignment.")
        assignment = update_res.data[0]
    else:
        # Insert new assignment when no prior assignment exists
        insert_result = supabase.table("assignments").insert(assignment_payload).execute()
        if not insert_result.data:
            raise HTTPException(status_code=500, detail="Failed to save assignment.")
        assignment = insert_result.data[0]

    # 4. Advance stage to assignment_sent
    try:
        await advance_stage(
            application_id=application_id,
            new_stage="assignment_sent",
            actor_name=user.name,
            reason="Assignment generated and sent to candidate",
        )
    except Exception as exc:
        logger.warning("Stage advance failed: %s", exc)

    # 5. Queue email to candidate with assignment details
    try:
        # Find the email channel
        chan_result = (
            supabase.table("communication_channels")
            .select("id")
            .eq("channel_id_code", "CHN-001")
            .maybe_single()
            .execute()
        )
        if chan_result.data:
            email_body = (
                f"Dear {candidate['name'].split()[0]},\n\n"
                f"Congratulations on being shortlisted for the {job['title']} position!\n\n"
                f"We'd like you to complete the following assignment:\n\n"
                f"**{assignment['title']}**\n\n"
                f"{assignment['description']}\n\n"
                f"Requirements:\n{assignment['requirements']}\n\n"
                f"Deadline: 3 days from now\n"
                f"Submit via the candidate portal or reply to this email.\n\n"
                f"Best regards,\nHireMind AI Recruitment Team"
            )
            supabase.table("messages").insert({
                "candidate_id": candidate["id"],
                "channel_id": chan_result.data["id"],
                "subject": f"Assignment: {assignment['title']} — {job['title']}",
                "body": email_body,
                "status": "sent",
                "sent_at": datetime.now(timezone.utc).isoformat(),
            }).execute()
    except Exception as exc:
        logger.warning("Failed to queue assignment email: %s", exc)

    # 6. Log activity
    try:
        supabase.table("activity_logs").insert({
            "actor_name": candidate["name"],
            "action": f"assignment generated and sent ({assignment['title']}) for",
            "context_label": job["title"],
            "log_type": "info",
        }).execute()
    except Exception:
        pass

    return {
        "assignment": assignment,
        "message": f"Assignment '{assignment['title']}' sent to {candidate['name']}",
        "deadline": deadline,
    }


@router.post("/api/assignments/{assignment_id}/submit")
async def submit_assignment(assignment_id: str, body: SubmitRequest, candidate: CandidateDep):
    """
    Candidate submits their assignment work (text and/or URL).
    Sets assignment status to 'submitted' and stage to 'assignment_submitted'.
    """
    if not body.submission_text and not body.submission_url:
        raise HTTPException(status_code=422, detail="Provide either submission_text or submission_url.")

    # Fetch assignment
    assign_result = (
        supabase.table("assignments")
        .select("id, application_id, status, deadline")
        .eq("id", assignment_id)
        .maybe_single()
        .execute()
    )
    if not assign_result or not assign_result.data:
        raise HTTPException(status_code=404, detail="Assignment not found.")
    assignment = assign_result.data

    require_candidate_application(assignment["application_id"], candidate)

    if assignment["status"] == "reviewed":
        raise HTTPException(status_code=422, detail="Assignment already reviewed.")

    # Server-side deadline enforcement
    deadline_val = assignment.get("deadline")
    if deadline_val:
        try:
            deadline_str = str(deadline_val).replace("Z", "+00:00")
            deadline_dt = datetime.fromisoformat(deadline_str)
            if deadline_dt.tzinfo is None:
                deadline_dt = deadline_dt.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > deadline_dt:
                raise HTTPException(status_code=400, detail="Assignment submission deadline has expired.")
        except HTTPException:
            raise
        except Exception as e:
            logger.warning("Error parsing assignment deadline timestamp '%s': %s", deadline_val, e)

    # Update assignment with submission
    update_payload = {
        "submission_text": body.submission_text,
        "submission_url": body.submission_url,
        "status": "submitted",
    }
    supabase.table("assignments").update(update_payload).eq("id", assignment_id).execute()

    # Advance stage
    try:
        await advance_stage(
            application_id=assignment["application_id"],
            new_stage="assignment_submitted",
            actor_name="Candidate",
            reason="Candidate submitted assignment",
        )
    except Exception as exc:
        logger.warning("Stage advance failed: %s", exc)

    # Log
    try:
        supabase.table("activity_logs").insert({
            "actor_name": "Candidate",
            "action": "submitted assignment for review for",
            "context_label": "Assignment",
            "log_type": "info",
        }).execute()
    except Exception:
        pass

    return {"status": "submitted", "assignment_id": assignment_id}


@router.post("/api/assignments/{assignment_id}/evaluate")
async def evaluate_assignment(assignment_id: str, user: HRStaffDep):
    """
    AI-evaluate the candidate's submission using DeepSeek.
    Saves evaluation to ai_evaluation jsonb, sets stage to 'assignment_reviewed'.
    If score >= threshold, auto-advances to 'tech_round'.
    """
    # Fetch assignment with submission
    assign_result = (
        supabase.table("assignments")
        .select("*")
        .eq("id", assignment_id)
        .maybe_single()
        .execute()
    )
    if not assign_result or not assign_result.data:
        raise HTTPException(status_code=404, detail="Assignment not found.")
    assignment = assign_result.data

    if assignment["status"] == "pending":
        raise HTTPException(status_code=422, detail="Assignment not yet submitted.")

    # Run AI evaluation
    evaluation = await evaluate_submission(
        title=assignment["title"],
        description=assignment["description"],
        requirements=assignment.get("requirements"),
        submission_text=assignment.get("submission_text"),
        submission_url=assignment.get("submission_url"),
    )

    score = evaluation.get("score", 50)

    # Save evaluation
    supabase.table("assignments").update({
        "ai_evaluation": evaluation,
        "score": score,
        "status": "reviewed",
    }).eq("id", assignment_id).execute()

    # Advance stage to assignment_reviewed
    application_id = assignment["application_id"]
    try:
        await advance_stage(
            application_id=application_id,
            new_stage="assignment_reviewed",
            actor_name="AI System",
            reason=f"Assignment evaluated (score: {score}/100)",
        )
    except Exception as exc:
        logger.warning("Stage advance to assignment_reviewed failed: %s", exc)

    # If above threshold, auto-advance to tech_round
    if score >= ASSIGNMENT_ADVANCE_THRESHOLD:
        try:
            await advance_stage(
                application_id=application_id,
                new_stage="tech_round",
                actor_name="AI System",
                reason=f"Assignment score {score} ≥ threshold {ASSIGNMENT_ADVANCE_THRESHOLD}",
            )
            logger.info("Auto-advanced %s to tech_round (assignment score: %d)", application_id, score)
        except Exception as exc:
            logger.warning("Auto-advance to tech_round failed: %s", exc)

    # Log
    try:
        cand = supabase.table("applications").select("candidate_id").eq("id", application_id).maybe_single().execute()
        cand_name = "Candidate"
        if cand.data:
            cn = supabase.table("candidates").select("name").eq("id", cand.data["candidate_id"]).maybe_single().execute()
            if cn.data:
                cand_name = cn.data["name"]
        supabase.table("activity_logs").insert({
            "actor_name": cand_name,
            "action": f"assignment evaluated by AI (score: {score}/100) for",
            "context_label": assignment["title"],
            "log_type": "success" if score >= ASSIGNMENT_ADVANCE_THRESHOLD else "warning",
        }).execute()
    except Exception:
        pass

    return {
        "assignment_id": assignment_id,
        "score": score,
        "evaluation": evaluation,
        "advanced_to_tech_round": score >= ASSIGNMENT_ADVANCE_THRESHOLD,
    }


class RecruiterReviewRequest(BaseModel):
    recruiter_score: int
    override_reason: str = ""
    decision: str = "approved"  # "approved" | "rejected"
    rejection_reason_category: str | None = None
    notes: str = ""


@router.get("/api/assignments/{assignment_id}")
async def get_assignment(assignment_id: str, user: CurrentUserDep):
    """Fetch assignment details."""
    result = supabase.table("assignments").select("*").eq("id", assignment_id).maybe_single().execute()
    if not result or not result.data:
        raise HTTPException(status_code=404, detail="Assignment not found.")
    return result.data


@router.post("/api/assignments/{assignment_id}/recruiter-review")
async def recruiter_review_assignment(assignment_id: str, body: RecruiterReviewRequest, user: HRStaffDep):
    """
    Recruiter inspects candidate submission, reviews AI evaluation,
    overrides score (if needed), writes review notes, and approves/rejects candidate.
    Preserves audit trail: ai_score, recruiter_score, final_score, override_reason.
    """
    assign_result = supabase.table("assignments").select("*").eq("id", assignment_id).maybe_single().execute()
    if not assign_result or not assign_result.data:
        raise HTTPException(status_code=404, detail="Assignment not found.")
    assignment = assign_result.data

    ai_eval = assignment.get("ai_evaluation") or {}
    ai_score = assignment.get("score") or ai_eval.get("score") or 75
    final_score = body.recruiter_score

    review_audit = {
        "submission_id": assignment_id,
        "reviewer_id": user.id,
        "reviewer_name": user.name,
        "ai_score": ai_score,
        "recruiter_score": body.recruiter_score,
        "final_score": final_score,
        "override_reason": body.override_reason,
        "decision": body.decision,
        "rejection_reason_category": body.rejection_reason_category,
        "notes": body.notes,
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
    }

    # Column 'status' is PostgreSQL ENUM ('pending', 'submitted', 'reviewed').
    # Store decision ('approved' | 'rejected') inside recruiter_review JSONB, set assignment status to 'reviewed'.
    supabase.table("assignments").update({
        "score": final_score,
        "status": "reviewed",
        "recruiter_review": review_audit,
    }).eq("id", assignment_id).execute()

    application_id = assignment["application_id"]
    if body.decision == "approved":
        try:
            await advance_stage(application_id, "tech_round", user.name, f"Approved by recruiter ({user.name}) with score {final_score}")
        except Exception as e:
            logger.warn(f"Failed to advance stage to tech_round: {e}")
    else:
        try:
            await advance_stage(application_id, "rejected", user.name, f"Rejected by recruiter: {body.rejection_reason_category or 'Assignment review'}")
        except Exception as e:
            logger.warn(f"Failed to advance stage to rejected: {e}")

    return {
        "status": "reviewed",
        "decision": body.decision,
        "final_score": final_score,
        "review": review_audit,
    }
    """Fetch a single assignment by ID."""
    result = (
        supabase.table("assignments")
        .select("*")
        .eq("id", assignment_id)
        .maybe_single()
        .execute()
    )
    if not result or not result.data:
        raise HTTPException(status_code=404, detail="Assignment not found.")
    return result.data


@router.get("/api/applications/{application_id}/assignment")
async def get_assignment_by_application(application_id: str, user: CurrentUserDep):
    """Fetch the assignment for a specific application."""
    result = (
        supabase.table("assignments")
        .select("*")
        .eq("application_id", application_id)
        .maybe_single()
        .execute()
    )
    if not result or not result.data:
        raise HTTPException(status_code=404, detail="No assignment found for this application.")
    return result.data


@router.post("/api/applications/{application_id}/manual-shortlist-and-assign")
async def manual_shortlist_and_assign(application_id: str, user: HRStaffDep):
    """
    Manual override: shortlist a candidate (bypass AI threshold) and generate assignment.
    Used by HR for testing or when they disagree with the AI score.
    """
    # 1. Advance to shortlisted (skip validation by going directly)
    try:
        await advance_stage(application_id, "shortlisted", user.name, "Manual shortlist by HR (threshold override)")
    except Exception as exc:
        # May already be shortlisted — continue
        logger.warning("Stage advance to shortlisted skipped: %s", exc)

    # 2. Generate assignment (reuse the existing logic)
    app_result = supabase.table("applications").select("id, candidate_id, job_id").eq("id", application_id).maybe_single().execute()
    if not app_result or not app_result.data:
        raise HTTPException(status_code=404, detail="Application not found.")
    app = app_result.data

    job_result = supabase.table("jobs").select("title, department, description").eq("id", app["job_id"]).maybe_single().execute()
    if not job_result or not job_result.data:
        raise HTTPException(status_code=404, detail="Job not found.")
    job = job_result.data

    cand_result = supabase.table("candidates").select("id, name, email").eq("id", app["candidate_id"]).maybe_single().execute()
    if not cand_result.data:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    candidate = cand_result.data

    # Check if assignment already exists
    existing = supabase.table("assignments").select("id").eq("application_id", application_id).maybe_single().execute()
    if existing.data:
        return {"message": "Assignment already exists", "assignment_id": existing.data["id"], "already_exists": True}

    # Generate
    from datetime import timedelta
    assignment_data = await generate_assignment(job["title"], job["department"], job.get("description"))
    deadline = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()

    assignment_payload = {
        "application_id": application_id,
        "title": assignment_data.get("title", f"Assignment: {job['title']}"),
        "description": assignment_data.get("description", ""),
        "requirements": assignment_data.get("requirements", ""),
        "status": "pending",
        "deadline": deadline,
    }
    insert_result = supabase.table("assignments").insert(assignment_payload).execute()
    if not insert_result.data:
        raise HTTPException(status_code=500, detail="Failed to save assignment.")
    assignment = insert_result.data[0]

    # Advance to assignment_sent
    try:
        await advance_stage(application_id, "assignment_sent", user.name, "Assignment generated (manual shortlist)")
    except Exception:
        pass

    # Log
    supabase.table("activity_logs").insert({
        "actor_name": user.name,
        "action": f"manually shortlisted and generated assignment for",
        "context_label": job["title"],
        "log_type": "info",
    }).execute()

    return {"message": f"Shortlisted and assignment sent to {candidate['name']}", "assignment": assignment, "already_exists": False}
