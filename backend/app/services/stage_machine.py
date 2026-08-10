"""
Application stage-transition state machine.

Defines the valid forward transitions and provides `advance_stage()` which:
  1. Validates the transition is legal
  2. Updates the application stage
  3. Logs the transition to the activity_logs table

The pipeline stages in order:
  applied → screened → shortlisted → assignment_sent → assignment_submitted
  → assignment_reviewed → tech_round → tech_round_completed → interview_round
  → interview_round_completed → hr_round → hr_round_completed → offered → hired

`rejected` is a terminal state reachable from any non-terminal stage.
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import HTTPException

from app.database import supabase

logger = logging.getLogger(__name__)

# ── Ordered pipeline stages ───────────────────────────────────────────────────

PIPELINE_STAGES: list[str] = [
    "applied",
    "screened",
    "shortlisted",
    "assignment_sent",
    "assignment_submitted",
    "assignment_reviewed",
    "tech_round",
    "tech_round_completed",
    "interview_round",
    "interview_round_completed",
    "hr_round",
    "hr_round_completed",
    "offered",
    "hired",
]

# Build index map for O(1) ordering lookups
_STAGE_INDEX: dict[str, int] = {stage: i for i, stage in enumerate(PIPELINE_STAGES)}

# Terminal stages — no forward transition allowed from these
TERMINAL_STAGES = {"hired", "rejected", "waitlisted"}

# "rejected" and "waitlisted" can be reached from any non-terminal stage
SPECIAL_TARGETS = {"rejected", "waitlisted"}


def is_valid_transition(current_stage: str, new_stage: str) -> bool:
    """
    Check if transitioning from current_stage to new_stage is valid.

    Rules:
      - Cannot transition from a terminal stage (hired, rejected)
      - "rejected" is always a valid target from any non-terminal stage
      - Otherwise, new_stage must be strictly ahead of current_stage in the pipeline
    """
    if current_stage in TERMINAL_STAGES:
        return False

    if new_stage in SPECIAL_TARGETS:
        return True

    current_idx = _STAGE_INDEX.get(current_stage)
    new_idx = _STAGE_INDEX.get(new_stage)

    if current_idx is None or new_idx is None:
        return False

    # Must move forward (skip stages are allowed — e.g. screened → shortlisted)
    return new_idx > current_idx


def get_next_stage(current_stage: str) -> Optional[str]:
    """Return the immediate next stage in the pipeline, or None if at end."""
    idx = _STAGE_INDEX.get(current_stage)
    if idx is None or idx >= len(PIPELINE_STAGES) - 1:
        return None
    return PIPELINE_STAGES[idx + 1]


async def advance_stage(
    application_id: str,
    new_stage: str,
    actor_name: str = "System",
    reason: Optional[str] = None,
) -> dict:
    """
    Advance an application to a new pipeline stage.

    1. Fetches the current application (validates existence)
    2. Validates the transition is legal
    3. Updates the stage
    4. Logs the transition to activity_logs

    Args:
        application_id: UUID of the application
        new_stage: target stage (must be a valid forward transition)
        actor_name: who triggered the change (for the activity log)
        reason: optional context string for the log entry

    Returns:
        The updated application row dict

    Raises:
        HTTPException(404) if application not found
        HTTPException(422) if transition is invalid
    """
    # 1. Fetch current state
    result = (
        supabase.table("applications")
        .select("id, stage, candidate_id, job_id")
        .eq("id", application_id)
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Application not found.")

    app = result.data
    current_stage = app["stage"]

    # 2. Validate transition
    if not is_valid_transition(current_stage, new_stage):
        raise HTTPException(
            status_code=422,
            detail=(
                f"Invalid stage transition: '{current_stage}' → '{new_stage}'. "
                f"Current stage is {'terminal' if current_stage in TERMINAL_STAGES else 'behind the target'}."
            ),
        )

    # 3. Update stage
    update_result = (
        supabase.table("applications")
        .update({"stage": new_stage})
        .eq("id", application_id)
        .execute()
    )
    if not update_result.data:
        raise HTTPException(status_code=500, detail="Failed to update application stage.")

    updated_app = update_result.data[0]

    # 4. Look up candidate name and job title for the log
    candidate_name = actor_name
    job_title = "Unknown Role"

    try:
        cand_result = (
            supabase.table("candidates")
            .select("name")
            .eq("id", app["candidate_id"])
            .maybe_single()
            .execute()
        )
        if cand_result.data:
            candidate_name = cand_result.data["name"]

        job_result = (
            supabase.table("jobs")
            .select("title")
            .eq("id", app["job_id"])
            .maybe_single()
            .execute()
        )
        if job_result.data:
            job_title = job_result.data["title"]
    except Exception:
        pass  # Non-fatal — we still want the transition to succeed

    # 5. Log the transition
    action = f"stage advanced: {current_stage} → {new_stage}"
    if reason:
        action += f" ({reason})"

    try:
        supabase.table("activity_logs").insert({
            "actor_name":    candidate_name,
            "action":        action,
            "context_label": job_title,
            "log_type":      "success" if new_stage not in TERMINAL_STAGES else (
                "info" if new_stage == "hired" else "warning"
            ),
        }).execute()
    except Exception as exc:
        logger.warning("Failed to log stage transition: %s", exc)

    logger.info(
        "Application %s: %s → %s (actor=%s)",
        application_id, current_stage, new_stage, actor_name,
    )

    return updated_app


async def reject_application(
    application_id: str,
    actor_name: str = "System",
    reason: Optional[str] = None,
) -> dict:
    """Convenience wrapper to reject an application from any non-terminal stage."""
    return await advance_stage(application_id, "rejected", actor_name, reason)
