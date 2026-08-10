"""
Automatic AI shortlisting service.

Called after resume scoring completes. Applies three-tier logic:

1. Score ≥ threshold (default 75)  → auto-advance to "shortlisted", log it
2. Score in borderline range (threshold - 15 to threshold - 1) → flag for manual HR review
3. Score < borderline floor       → auto-reject, queue rejection email draft

Thresholds are read from the settings table:
  key: "shortlist_threshold" → {"value": 75, "borderline_floor": 60}
"""
from __future__ import annotations

import logging
from typing import Any

from app.database import supabase

logger = logging.getLogger(__name__)

# ── Defaults ──────────────────────────────────────────────────────────────────

DEFAULT_THRESHOLD = 75
DEFAULT_BORDERLINE_FLOOR = 60


def _load_thresholds() -> tuple[int, int]:
    """Load shortlist threshold and borderline floor from settings."""
    try:
        result = (
            supabase.table("settings")
            .select("value")
            .eq("key", "shortlist_threshold")
            .maybe_single()
            .execute()
        )
        if result.data and result.data.get("value"):
            val = result.data["value"]
            threshold = int(val.get("value", DEFAULT_THRESHOLD))
            floor = int(val.get("borderline_floor", threshold - 15))
            return threshold, floor
    except Exception as exc:
        logger.warning("Could not load shortlist thresholds: %s", exc)

    return DEFAULT_THRESHOLD, DEFAULT_BORDERLINE_FLOOR


def _log_activity(actor_name: str, action: str, context_label: str, log_type: str = "success") -> None:
    """Insert an activity log entry."""
    try:
        supabase.table("activity_logs").insert({
            "actor_name":    actor_name,
            "action":        action,
            "context_label": context_label,
            "log_type":      log_type,
        }).execute()
    except Exception as exc:
        logger.warning("Failed to log activity: %s", exc)


def _get_candidate_name(candidate_id: str) -> str:
    try:
        result = supabase.table("candidates").select("name").eq("id", candidate_id).maybe_single().execute()
        return result.data["name"] if result.data else "Unknown"
    except Exception:
        return "Unknown"


def _get_job_title(job_id: str) -> str:
    try:
        result = supabase.table("jobs").select("title").eq("id", job_id).maybe_single().execute()
        return result.data["title"] if result.data else "Unknown Role"
    except Exception:
        return "Unknown Role"


async def process_after_scoring(
    application_id: str,
    candidate_id: str,
    job_id: str,
    ai_score: int | None,
    job_title: str | None = None,
) -> dict[str, Any]:
    """
    Process auto-shortlisting logic after AI scoring is complete.

    Returns a dict with the action taken:
      {"action": "shortlisted"|"flagged_for_review"|"rejected"|"no_action", ...}
    """
    if ai_score is None:
        return {"action": "no_action", "reason": "No AI score available"}

    threshold, borderline_floor = _load_thresholds()
    candidate_name = _get_candidate_name(candidate_id)
    role = job_title or _get_job_title(job_id)

    result: dict[str, Any] = {
        "application_id": application_id,
        "ai_score": ai_score,
        "threshold": threshold,
        "borderline_floor": borderline_floor,
    }

    if ai_score >= threshold:
        # ── TIER 1: Auto-shortlist ────────────────────────────────────────────
        try:
            from app.services.stage_machine import advance_stage
            await advance_stage(
                application_id=application_id,
                new_stage="shortlisted",
                actor_name="AI System",
                reason=f"Auto-shortlisted (score {ai_score} ≥ threshold {threshold})",
            )
            result["action"] = "shortlisted"
            result["message"] = f"AI shortlisted {candidate_name} for {role} — score {ai_score}/100"

            _log_activity(
                actor_name=candidate_name,
                action=f"AI shortlisted (score: {ai_score}/100 ≥ threshold: {threshold}) for",
                context_label=role,
                log_type="success",
            )

            logger.info("Auto-shortlisted %s (score=%d, threshold=%d)", candidate_name, ai_score, threshold)

        except Exception as exc:
            logger.error("Failed to auto-shortlist %s: %s", application_id, exc)
            result["action"] = "error"
            result["error"] = str(exc)

    elif ai_score >= borderline_floor:
        # ── TIER 2: Borderline — flag for manual HR review ────────────────────
        try:
            supabase.table("applications").update({
                "flagged": True,
                "stage": "screened",
            }).eq("id", application_id).execute()

            result["action"] = "flagged_for_review"
            result["message"] = f"Borderline score ({ai_score}) — flagged for HR review"

            _log_activity(
                actor_name=candidate_name,
                action=f"flagged for manual HR review (borderline score: {ai_score}/{threshold}) for",
                context_label=role,
                log_type="warning",
            )

            logger.info("Flagged for review %s (score=%d, borderline range %d-%d)",
                        candidate_name, ai_score, borderline_floor, threshold - 1)

        except Exception as exc:
            logger.error("Failed to flag %s for review: %s", application_id, exc)
            result["action"] = "error"
            result["error"] = str(exc)

    else:
        # ── TIER 3: Below borderline — auto-reject + queue rejection email ────
        try:
            from app.services.stage_machine import advance_stage
            await advance_stage(
                application_id=application_id,
                new_stage="rejected",
                actor_name="AI System",
                reason=f"Auto-rejected (score {ai_score} < borderline floor {borderline_floor})",
            )

            result["action"] = "rejected"
            result["message"] = f"Auto-rejected {candidate_name} (score {ai_score} < {borderline_floor})"

            _log_activity(
                actor_name=candidate_name,
                action=f"auto-rejected by AI (score: {ai_score} < floor: {borderline_floor}) for",
                context_label=role,
                log_type="error",
            )

            # Queue a rejection email draft for HR to approve
            await _queue_rejection_draft(candidate_id, job_id, candidate_name, role)

            logger.info("Auto-rejected %s (score=%d < floor=%d)", candidate_name, ai_score, borderline_floor)

        except Exception as exc:
            logger.error("Failed to auto-reject %s: %s", application_id, exc)
            result["action"] = "error"
            result["error"] = str(exc)

    return result


async def _queue_rejection_draft(
    candidate_id: str,
    job_id: str,
    candidate_name: str,
    role: str,
) -> None:
    """
    Generate a rejection email draft using DeepSeek and save it as a pending message.
    HR can review and send it later from the Communication Center.
    """
    try:
        # Find the rejection channel
        chan_result = (
            supabase.table("communication_channels")
            .select("id")
            .eq("channel_id_code", "CHN-005")  # "Rejection Templates"
            .maybe_single()
            .execute()
        )
        if not chan_result.data:
            logger.warning("Rejection channel (CHN-005) not found, skipping draft")
            return

        channel_id = chan_result.data["id"]

        # Try to generate AI draft
        from openai import OpenAI
        from app.config import settings

        if not settings.deepseek_api_key:
            # No API key — create a simple template
            subject = f"Application Status Update - {role}"
            body = (
                f"Dear {candidate_name.split()[0]},\n\n"
                f"Thank you for your interest in the {role} position at HireMind AI. "
                f"After careful review, we have decided to move forward with other candidates "
                f"whose qualifications more closely align with our current needs.\n\n"
                f"We will keep your resume on file for future opportunities.\n\n"
                f"Best regards,\nHireMind AI Recruitment Team"
            )
        else:
            client = OpenAI(api_key=settings.deepseek_api_key, base_url="https://api.deepseek.com")
            response = client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": "You are an HR assistant. Write a professional, empathetic rejection email. Return only JSON: {\"subject\":\"...\",\"body\":\"...\"}"},
                    {"role": "user", "content": f"Candidate: {candidate_name}, Role: {role}. Write a concise, warm rejection email (under 100 words body)."},
                ],
                temperature=0.7,
                max_tokens=300,
            )
            import json, re
            raw = response.choices[0].message.content or ""
            cleaned = re.sub(r"```(?:json)?", "", raw).replace("```", "").strip()
            try:
                parsed = json.loads(cleaned)
                subject = parsed.get("subject", f"Application Update - {role}")
                body = parsed.get("body", "")
            except Exception:
                subject = f"Application Status Update - {role}"
                body = raw  # Use raw text as fallback

        # Save as pending message for HR approval
        supabase.table("messages").insert({
            "candidate_id": candidate_id,
            "channel_id":   channel_id,
            "subject":      subject,
            "body":         body,
            "status":       "pending",  # HR must approve before sending
        }).execute()

        logger.info("Queued rejection draft for %s via channel %s", candidate_name, channel_id)

    except Exception as exc:
        logger.warning("Failed to queue rejection draft for %s: %s", candidate_name, exc)
