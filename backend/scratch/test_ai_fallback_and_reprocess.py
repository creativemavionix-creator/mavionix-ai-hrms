import os
import sys
import asyncio
import uuid
from datetime import datetime, timezone
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import supabase
from app.services.re_evaluator import reprocess_pending_rounds

async def run_test():
    print("=" * 65)
    print(" AI FALLBACK & OFFLINE REPROCESSING TEST SUITE ")
    print("=" * 65)

    dummy_app_id = "1180990e-89c3-4d78-adbf-a3e3fbdf9ff5" # Priya Sharma's app ID
    test_round_id = str(uuid.uuid4())

    transcript = [
        {"role": "ai", "message": "What is your approach to handling massive datasets and model parallelization in PyTorch?"},
        {"role": "candidate", "message": "I use PyTorch Fully Sharded Data Parallel (FSDP) and DeepSpeed ZeRO-3. I split model weights across GPUs, use gradient checkpointing to reduce VRAM, and optimize batch size with mixed precision (fp16)."}
    ]

    print("\n[PHASE 1] Simulating Offline / API Down Mode...")
    print("-> Primary Gemini API: HTTP 429 Quota Exceeded (Simulated)")
    print("-> Engaging Fallback Engine: Rule-Based Keyword & Struct Scoring...")

    # Insert record into ai_interview_rounds as if saved during offline mode
    offline_round_payload = {
        "id": test_round_id,
        "application_id": dummy_app_id,
        "round_type": "tech",
        "transcript": transcript,
        "status": "completed",
        "ai_score": 62, # Preliminary rule score
        "ai_summary": "[PROVISIONAL - RULE BASED] Candidate mentioned technical keywords (PyTorch, FSDP, DeepSpeed) but detailed LLM reasoning is pending verification.",
        "strengths": ["Rule-based keyword match: PyTorch, FSDP, DeepSpeed"],
        "concerns": ["Awaiting full LLM verification"],
        "requires_ai_reprocessing": True,
        "ai_review_completed": False,
        "evaluation_status": "pending_ai_review",
        "evaluation_engine": "rule_based",
        "evaluation_model": "Rule-Based Engine v1.0",
        "evaluation_version": 1,
    }

    try:
        supabase.table("ai_interview_rounds").insert(offline_round_payload).execute()
        print(f"[OK] Saved Rule-Based Fallback Round to DB!")
        print(f"     Round ID: {test_round_id}")
        print("     • Initial Score (Rule-Based): 62/100")
        print("     • Evaluation Engine: rule_based")
        print("     • Evaluation Status: pending_ai_review")
        print("     • Requires Reprocessing: True")
    except Exception as e:
        print(f"[ERR] Failed to insert test round: {e}")
        return

    print("\n[PHASE 2] Simulating Gemini / AI Service Coming Back Online...")
    print("-> Triggering Asynchronous AI Reprocessing Service...")

    # Mock the LLM output to simulate Gemini returning full verified evaluation
    mock_verified_summary = {
        "ai_score": 92,
        "ai_summary": "Candidate demonstrated expert mastery of distributed model training in PyTorch, correctly explaining FSDP, DeepSpeed ZeRO-3, gradient checkpointing, and FP16 mixed-precision VRAM optimization.",
        "strengths": [
            "Demonstrated hands-on experience with PyTorch FSDP & DeepSpeed ZeRO-3",
            "Clear understanding of GPU memory optimization via gradient checkpointing",
            "Articulated multi-GPU parallelization trade-offs clearly"
        ],
        "concerns": [
            "Could elaborate further on communication overhead during all-reduce steps"
        ],
        "evaluation_engine": "llm",
        "evaluation_model": "Gemini 2.0 Flash",
        "evaluation_version": 2,
    }

    with patch("app.services.re_evaluator.generate_round_summary", return_value=mock_verified_summary):
        processed_ids = await reprocess_pending_rounds(round_id=test_round_id)

    print(f"[OK] Reprocessing Pipeline Executed Successfully!")
    print(f"     Processed Round IDs: {processed_ids}")

    # 3. Query DB to verify updated LLM score and reasoning
    res = supabase.table("ai_interview_rounds").select("*").eq("id", test_round_id).maybe_single().execute()
    if res and res.data:
        updated = res.data
        print("\n" + "=" * 65)
        print(" REPROCESSED RESULT VERIFICATION (POST-AI RE-EVALUATION) ")
        print("=" * 65)
        print("• Original Rule-Based Score: 62/100")
        print("• Verified AI Score:       ", updated.get("ai_score"), "/100")
        print("• Evaluation Engine:       ", updated.get("evaluation_engine"))
        print("• Evaluation Model:        ", updated.get("evaluation_model"))
        print("• Evaluation Status:       ", updated.get("evaluation_status"))
        print("• AI Review Completed:     ", updated.get("ai_review_completed"))
        print("• Requires Reprocessing:   ", updated.get("requires_ai_reprocessing"))
        print("\n• Upgraded AI Summary Reasoning:")
        print(" ", updated.get("ai_summary"))
        print("\n• Upgraded Strengths:")
        for s in updated.get("strengths", []):
            print("   -", s)
        print("\n• Upgraded Areas to Improve:")
        for c in updated.get("concerns", []):
            print("   -", c)
        print("=" * 65)

    # Clean up test round
    supabase.table("ai_interview_rounds").delete().eq("id", test_round_id).execute()
    print("Cleaned up test record.")

if __name__ == "__main__":
    asyncio.run(run_test())
