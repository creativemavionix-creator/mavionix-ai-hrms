import sys
import os
import asyncio
from datetime import datetime, timezone

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

import app.services.ai_interviews
from app.database import supabase
from app.services.ai_interviews import generate_round_summary
from app.services.re_evaluator import reprocess_pending_rounds

# ── MOCK FUNCTIONS FOR API CALLS ─────────────────────────────────────────────
def mock_call_gemini_fail(system_prompt, user_prompt):
    raise Exception("Simulated offline error (e.g. Insufficient Balance 402)")

def mock_call_gemini_success(system_prompt, user_prompt):
    return '{"ai_score": 92, "ai_summary": "Jane demonstrates advanced technical proficiency in Python and containerization. Highly structured responses.", "strengths": ["Advanced Python competency", "Docker containerization knowledge"], "concerns": []}'

async def test_suite():
    print("=== RUNNING ASYNCHRONOUS AI VERIFICATION PIPELINE TESTS ===")

    # Setup a clean test round inside the DB (via demo store/mock or real Supabase)
    test_round_id = "test-reproc-round-123"
    application_id = "test-app-id"
    job_title = "Senior Backend Engineer"
    candidate_skills = ["Python", "Docker"]

    # Delete any existing test round
    try:
        supabase.table("ai_interview_rounds").delete().eq("id", test_round_id).execute()
    except Exception:
        pass

    # Create dummy application and candidate
    try:
        supabase.table("applications").insert({
            "id": application_id,
            "job_id": "test-job-id",
            "candidate_id": "test-cand-id",
            "stage": "tech_round"
        }).execute()
        supabase.table("jobs").insert({
            "id": "test-job-id",
            "title": job_title
        }).execute()
        supabase.table("candidates").insert({
            "id": "test-cand-id",
            "name": "Jane Doe",
            "parsed_data": {"skills": candidate_skills}
        }).execute()
    except Exception:
        pass

    transcript = [
        {"role": "ai", "message": "Can you describe your experience with Python?", "timestamp": datetime.now(timezone.utc).isoformat()},
        {
            "role": "candidate",
            "message": "I build APIs in Python and deploy them in Docker containers.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "speaker": "candidate",
            "question": "Can you describe your experience with Python?",
            "candidate_answer": "I build APIs in Python and deploy them in Docker containers.",
            "turn": 1,
            "job_title": job_title
        }
    ]

    recruiter_notes = "Recruiter note:Jane communicated very clearly."

    # 1. Simulate Offline Completion
    print("\n--- 1. Simulating Offline Completion (Rule Fallback) ---")
    
    # Force LLM calls to fail using mock
    app.services.ai_interviews._call_gemini = mock_call_gemini_fail

    # Call summary generator (this should fall back to rule engine evaluation)
    prov_summary = await generate_round_summary(
        round_type="tech",
        transcript=transcript,
        job_title=job_title,
        candidate_skills=candidate_skills
    )

    # Insert round record into database with provisional summary and flags
    supabase.table("ai_interview_rounds").insert({
        "id": test_round_id,
        "application_id": application_id,
        "round_type": "tech",
        "transcript": transcript,
        "status": "completed",
        "ai_score": prov_summary.get("ai_score"),
        "ai_summary": prov_summary.get("ai_summary"),
        "strengths": prov_summary.get("strengths", []),
        "concerns": prov_summary.get("concerns", []),
        "compact_offline_data": prov_summary.get("compact_offline_data"),
        "completed_at": datetime.now(timezone.utc).isoformat(),
        # Save provisional flags
        "requires_ai_reprocessing": True,
        "ai_review_completed": False,
        "evaluation_status": "pending_ai_review",
        "evaluation_engine": "rule_based",
        "evaluation_model": prov_summary.get("evaluation_model", "Rule-Based Engine v1.0"),
        "evaluation_version": 1,
        "retry_count": 0
    }).execute()

    # Verify provisional status in DB
    round_db = supabase.table("ai_interview_rounds").select("*").eq("id", test_round_id).maybe_single().execute().data
    print("Database Evaluation status:", round_db.get("evaluation_status"))
    print("Evaluation Version:", round_db.get("evaluation_version"))
    print("Requires Reprocessing:", round_db.get("requires_ai_reprocessing"))
    assert round_db.get("evaluation_status") == "pending_ai_review"
    assert round_db.get("evaluation_version") == 1
    assert round_db.get("requires_ai_reprocessing") is True

    # 2. Concurrency Lock check
    print("\n--- 2. Simulating Concurrency Lock --")
    # If round is in processing state, reprocessor should skip it to avoid multiple workers reprocessing it
    supabase.table("ai_interview_rounds").update({"evaluation_status": "processing"}).eq("id", test_round_id).execute()
    proc_res = await reprocess_pending_rounds(test_round_id)
    print("Processed list (should be empty due to lock):", proc_res)
    assert len(proc_res) == 0, "Reprocessor failed to skip processing lock"

    # Reset back to pending
    supabase.table("ai_interview_rounds").update({"evaluation_status": "pending_ai_review"}).eq("id", test_round_id).execute()

    # 3. Retry Limit & Failed State Check
    print("\n--- 3. Testing Retry Limits and Failed State transition ---")
    # If the LLM continues to fail, after 5 retries, the status must shift to failed
    for i in range(5):
        # Trigger reprocess (mock is still set to fail)
        await reprocess_pending_rounds(test_round_id)

    round_failed = supabase.table("ai_interview_rounds").select("*").eq("id", test_round_id).maybe_single().execute().data
    print("Retry Count:", round_failed.get("retry_count"))
    print("Final Status:", round_failed.get("evaluation_status"))
    print("Requires Reprocessing:", round_failed.get("requires_ai_reprocessing"))
    assert round_failed.get("retry_count") >= 5
    assert round_failed.get("evaluation_status") == "failed"
    assert round_failed.get("requires_ai_reprocessing") is True # Stays true until successfully processed

    # Reset retry and status to test success path
    supabase.table("ai_interview_rounds").update({
        "evaluation_status": "pending_ai_review",
        "retry_count": 0,
        "compact_offline_data": {"evaluation_history": prov_summary["compact_offline_data"]["evaluation_history"], "recruiter_notes": recruiter_notes}
    }).eq("id", test_round_id).execute()

    # 4. Verified Recovery Check
    print("\n--- 4. Simulating Online Recovery and Reprocessing Success ---")
    # Restore LLM service mock to success
    app.services.ai_interviews._call_gemini = mock_call_gemini_success

    # Run verification reprocessor worker
    success_res = await reprocess_pending_rounds(test_round_id)
    print("Reprocessed Round IDs:", success_res)
    assert test_round_id in success_res, "Reprocessor failed to reprocess round"

    # Verify verified status in DB
    round_verified = supabase.table("ai_interview_rounds").select("*").eq("id", test_round_id).maybe_single().execute().data
    print("Database Evaluation status:", round_verified.get("evaluation_status"))
    print("Evaluation Version:", round_verified.get("evaluation_version"))
    print("Requires Reprocessing:", round_verified.get("requires_ai_reprocessing"))
    print("Evaluation Engine:", round_verified.get("evaluation_engine"))
    print("Evaluation Model:", round_verified.get("evaluation_model"))
    print("Evaluation History list:", round_verified.get("compact_offline_data", {}).get("evaluation_history"))

    assert round_verified.get("evaluation_status") == "verified"
    assert round_verified.get("evaluation_version") == 2
    assert round_verified.get("requires_ai_reprocessing") is False
    assert round_verified.get("evaluation_engine") == "llm"
    assert len(round_verified.get("compact_offline_data", {}).get("evaluation_history", [])) == 2

    # 5. Immutability and Recruiter Notes preservation check
    print("\n--- 5. Verifying Transcript Immutability and Recruiter Notes ---")
    # Transcript candidate entry message must remain unchanged
    cand_msg_db = round_verified["transcript"][-1]["message"]
    print("Original candidate message:", transcript[-1]["message"])
    print("Database candidate message:", cand_msg_db)
    assert cand_msg_db == transcript[-1]["message"], "Candidate message transcript was modified!"

    # Recruiter notes must be preserved
    saved_notes = round_verified.get("compact_offline_data", {}).get("recruiter_notes")
    print("Saved Recruiter Notes:", saved_notes)
    assert saved_notes == recruiter_notes, "Recruiter notes were lost during verification!"

    print("\n=== ALL DEFERRED REPROCESSOR PIPELINE TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    asyncio.run(test_suite())
