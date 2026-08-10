"""
Final recommendation service.

Triggered when hr_round_completed is reached. Aggregates all scores,
computes a weighted final score, and generates an AI reasoning summary.

Weights (configurable via settings table key: "final_score_weights"):
  Resume       20%
  Assignment   20%
  Tech Round   25%
  Interview    25%
  HR Round     10%
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any

from openai import OpenAI

from app.config import settings
from app.database import supabase

logger = logging.getLogger(__name__)

DEFAULT_WEIGHTS = {
    "resume": 0.20,
    "assignment": 0.20,
    "tech": 0.25,
    "interview": 0.25,
    "hr": 0.10,
}


def _client() -> OpenAI:
    return OpenAI(api_key=settings.deepseek_api_key, base_url="https://api.deepseek.com")


def _load_weights() -> dict[str, float]:
    try:
        result = supabase.table("settings").select("value").eq("key", "final_score_weights").maybe_single().execute()
        if result.data and result.data.get("value"):
            val = result.data["value"]
            return {
                "resume": val.get("resume", 20) / 100,
                "assignment": val.get("assignment", 20) / 100,
                "tech": val.get("tech", 25) / 100,
                "interview": val.get("interview", 25) / 100,
                "hr": val.get("hr", 10) / 100,
            }
    except Exception:
        pass
    return DEFAULT_WEIGHTS


def _recommendation_level(score: int) -> str:
    if score >= 85:
        return "strongly_recommended"
    if score >= 70:
        return "recommended"
    if score >= 55:
        return "consider"
    return "not_recommended"


async def generate_final_recommendation(application_id: str) -> dict[str, Any] | None:
    """
    Compute final recommendation for a candidate after all rounds complete.

    Pulls scores from:
      - applications.ai_score (resume)
      - assignments.score
      - ai_interview_rounds (tech, interview, hr)

    Returns the saved final_recommendations row, or None on failure.
    """
    # 1. Load weights
    weights = _load_weights()

    # 2. Fetch all scores
    app_result = supabase.table("applications").select("ai_score, candidate_id, job_id").eq("id", application_id).maybe_single().execute()
    if not app_result.data:
        logger.error("Application %s not found", application_id)
        return None
    app = app_result.data
    resume_score = app.get("ai_score") or 0

    # Assignment score
    assign_result = supabase.table("assignments").select("score").eq("application_id", application_id).maybe_single().execute()
    assignment_score = (assign_result.data or {}).get("score") or 0

    # Round scores
    rounds_result = supabase.table("ai_interview_rounds").select("round_type, ai_score, ai_summary, strengths, concerns").eq("application_id", application_id).execute()
    rounds = rounds_result.data or []

    tech_score = 0
    interview_score = 0
    hr_score = 0
    round_summaries = {}

    for r in rounds:
        rt = r.get("round_type")
        score = r.get("ai_score") or 0
        if rt == "tech":
            tech_score = score
        elif rt == "interview":
            interview_score = score
        elif rt == "hr":
            hr_score = score
        round_summaries[rt] = {
            "score": score,
            "summary": r.get("ai_summary", ""),
            "strengths": r.get("strengths", []),
            "concerns": r.get("concerns", []),
        }

    # 3. Calculate weighted final score
    final_score = round(
        resume_score * weights["resume"]
        + assignment_score * weights["assignment"]
        + tech_score * weights["tech"]
        + interview_score * weights["interview"]
        + hr_score * weights["hr"]
    )
    final_score = min(100, max(0, final_score))

    recommendation = _recommendation_level(final_score)

    # 4. Generate AI reasoning
    reasoning = await _generate_reasoning(
        resume_score=resume_score,
        assignment_score=assignment_score,
        tech_score=tech_score,
        interview_score=interview_score,
        hr_score=hr_score,
        final_score=final_score,
        recommendation=recommendation,
        round_summaries=round_summaries,
    )

    # 5. Save to final_recommendations
    payload = {
        "application_id": application_id,
        "resume_score": resume_score,
        "assignment_score": assignment_score,
        "tech_score": tech_score,
        "interview_score": interview_score,
        "hr_score": hr_score,
        "final_score": final_score,
        "recommendation": recommendation,
        "reasoning": reasoning,
    }

    # Upsert (in case re-run)
    existing = supabase.table("final_recommendations").select("id").eq("application_id", application_id).maybe_single().execute()
    if existing.data:
        supabase.table("final_recommendations").update(payload).eq("application_id", application_id).execute()
        result_row = {**existing.data, **payload}
    else:
        insert_result = supabase.table("final_recommendations").insert(payload).execute()
        result_row = insert_result.data[0] if insert_result.data else payload

    # 6. Log activity
    try:
        cand = supabase.table("candidates").select("name").eq("id", app["candidate_id"]).maybe_single().execute()
        cand_name = cand.data["name"] if cand.data else "Candidate"
        job = supabase.table("jobs").select("title").eq("id", app["job_id"]).maybe_single().execute()
        job_title = job.data["title"] if job.data else "Role"

        rec_label = recommendation.replace("_", " ").upper()
        supabase.table("activity_logs").insert({
            "actor_name": cand_name,
            "action": f"AI final recommendation: {rec_label} (score: {final_score}/100) for",
            "context_label": job_title,
            "log_type": "success" if final_score >= 70 else "warning",
        }).execute()
    except Exception:
        pass

    logger.info("Final recommendation for %s: %s (score=%d)", application_id, recommendation, final_score)
    return result_row


async def _generate_reasoning(
    resume_score: int,
    assignment_score: int,
    tech_score: int,
    interview_score: int,
    hr_score: int,
    final_score: int,
    recommendation: str,
    round_summaries: dict,
) -> str:
    """Generate 2-3 sentence reasoning for the recommendation using DeepSeek."""
    prompt = f"""You are a senior HR analyst writing the final recommendation reasoning for a candidate.

Scores:
- Resume: {resume_score}/100
- Assignment: {assignment_score}/100
- Technical Round: {tech_score}/100
- Behavioral Interview: {interview_score}/100
- HR Round: {hr_score}/100
- Final Weighted Score: {final_score}/100
- Recommendation: {recommendation.replace('_', ' ')}

Round summaries:
{json.dumps(round_summaries, indent=2)}

Write exactly 2-3 sentences explaining WHY this recommendation was made.
Be specific — reference the strongest and weakest areas.
Return only the plain text reasoning, no JSON, no quotes."""

    try:
        client = _client()
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "You are a concise HR analyst. Write only the reasoning text."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.4,
            max_tokens=200,
        )
        text = (response.choices[0].message.content or "").strip()
        return text if text else f"Final score of {final_score}/100 maps to: {recommendation.replace('_', ' ')}."
    except Exception as exc:
        logger.warning("Reasoning generation failed: %s", exc)
        return f"Candidate achieved a final weighted score of {final_score}/100 across all evaluation stages, resulting in a '{recommendation.replace('_', ' ')}' classification."
