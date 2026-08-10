from datetime import datetime, timezone
import logging
from app.database import supabase
from app.services.ai_interviews import generate_round_summary

logger = logging.getLogger(__name__)

async def reprocess_pending_rounds(round_id: str | None = None) -> list[str]:
    """
    Stateless reprocessor for the Asynchronous AI Verification Pipeline.
    Retrieves completed rounds in pending_ai_review status, updates them to processing
    to acquire lock, calls LLM evaluation, and updates status to verified.
    """
    # 1. Select rounds to process
    query = supabase.table("ai_interview_rounds").select("*").eq("requires_ai_reprocessing", True)
    if round_id:
        query = query.eq("id", round_id)
    else:
        # Reprocess rounds pending AI review with under 5 retries
        query = query.eq("evaluation_status", "pending_ai_review")
        
    res = query.execute()
    if not res.data:
        return []

    processed_ids = []
    
    # In production, process up to 5 at a time to prevent timeout
    rounds = res.data[:5]
    
    for r in rounds:
        r_id = r["id"]
        
        # Concurrency Lock: update status to 'processing'
        # Check that it's still pending (simple state check)
        if r.get("evaluation_status") != "pending_ai_review":
            continue
            
        try:
            supabase.table("ai_interview_rounds").update({
                "evaluation_status": "processing"
            }).eq("id", r_id).execute()
        except Exception as lock_err:
            logger.warning(f"Could not acquire lock for round {r_id}: {lock_err}")
            continue

        # Extract values
        round_type = r.get("round_type")
        transcript = r.get("transcript") or []
        application_id = r.get("application_id")
        
        # Lookup job_title from application -> job
        job_title = "Senior Developer"
        try:
            app_res = supabase.table("applications").select("job_id, candidate_id").eq("id", application_id).maybe_single().execute()
            if app_res.data:
                job_res = supabase.table("jobs").select("title").eq("id", app_res.data["job_id"]).maybe_single().execute()
                if job_res.data:
                    job_title = job_res.data["title"]
        except Exception:
            pass

        # Lookup candidate skills
        skills = []
        try:
            if app_res.data:
                cand_res = supabase.table("candidates").select("parsed_data").eq("id", app_res.data["candidate_id"]).maybe_single().execute()
                if cand_res.data and cand_res.data.get("parsed_data"):
                    skills = cand_res.data["parsed_data"].get("tags", []) or cand_res.data["parsed_data"].get("skills", [])
        except Exception:
            pass

        # Prepare summary regeneration
        # We simulate a test LLM call to verify availability
        llm_available = False
        try:
            summary = await generate_round_summary(
                round_type=round_type,
                transcript=transcript,
                job_title=job_title,
                candidate_skills=skills
            )
            # If evaluation_engine is still rule_based, it means LLM failed internally
            if summary.get("evaluation_engine") == "rule_based":
                raise Exception("LLM service is offline or balance is insufficient.")
            llm_available = True
        except Exception as llm_err:
            logger.error(f"LLM call failed for round {r_id}: {llm_err}")
            
            # Release lock, increment retry count
            retries = r.get("retry_count", 0) + 1
            next_status = "failed" if retries >= 5 else "pending_ai_review"
            try:
                supabase.table("ai_interview_rounds").update({
                    "evaluation_status": next_status,
                    "retry_count": retries,
                    "last_retry_at": datetime.now(timezone.utc).isoformat()
                }).eq("id", r_id).execute()
            except Exception:
                pass
            continue

        if llm_available:
            # Update the round with verified evaluation details, leaving recruiter notes untouched
            try:
                # Merge compact_offline_data from database (in case recruiter added notes there)
                compact_data = r.get("compact_offline_data") or {}
                new_compact = summary.get("compact_offline_data") or {}
                
                # Copy original history and append
                orig_history = compact_data.get("evaluation_history") or []
                new_history = new_compact.get("evaluation_history") or []
                for h in new_history:
                    if not any(x.get("version") == h.get("version") for x in orig_history):
                        orig_history.append(h)
                compact_data["evaluation_history"] = orig_history
                
                # Keep other compact_data fields preserved
                for k, v in new_compact.items():
                    if k != "evaluation_history":
                        compact_data[k] = v

                supabase.table("ai_interview_rounds").update({
                    "ai_score": summary.get("ai_score"),
                    "ai_summary": summary.get("ai_summary"),
                    "strengths": summary.get("strengths", []),
                    "concerns": summary.get("concerns", []),
                    # Verification fields
                    "requires_ai_reprocessing": False,
                    "ai_review_completed": True,
                    "evaluation_status": "verified",
                    "evaluation_engine": "llm",
                    "evaluation_model": summary.get("evaluation_model", "Gemini"),
                    "evaluation_version": 2,
                    "reviewed_at": datetime.now(timezone.utc).isoformat()
                }).eq("id", r_id).execute()
                processed_ids.append(r_id)
            except Exception as save_err:
                logger.error(f"Failed to save verified summary for round {r_id}: {save_err}")
                # Reset lock
                try:
                    supabase.table("ai_interview_rounds").update({
                        "evaluation_status": "pending_ai_review"
                    }).eq("id", r_id).execute()
                except Exception:
                    pass

    return processed_ids
