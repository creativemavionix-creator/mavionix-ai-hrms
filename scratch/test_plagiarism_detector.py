import sys
import os
import asyncio

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.services.plagiarism_detector import analyze_similarity
from app.services.ai_interviews import process_response, generate_round_summary

async def test_suite():
    print("=== RUNNING HEURISTIC COPY-PASTE & SIMILARITY ANALYZER TESTS ===")

    # 1. Test Documentation Similarity Matcher
    print("\n--- 1. Testing Verbatim Documentation Matches ---")
    copied_decorator = (
        "A decorator is a design pattern in Python that allows a user to add new functionality "
        "to an existing object without modifying its structure."
    )
    res_doc = analyze_similarity(copied_decorator)
    print("Copied Python Decorator result:")
    print("Suspected copy paste:", res_doc["suspected_copy_paste"])
    print("Risk Score:", res_doc["risk_score"])
    print("Reasons:", res_doc["reasons"])
    assert res_doc["suspected_copy_paste"] is True
    assert any("stored documentation" in r.lower() for r in res_doc["reasons"])

    # 2. Test Heuristic Structural Markdown Matcher
    print("\n--- 2. Testing Heuristic Structural Markdown Check ---")
    structured_md = (
        "To address this, we can design the system using the following components:\n"
        "* **Scalability:** We will scale out the worker nodes.\n"
        "* **High Availability:** We will set up multiple replicas.\n"
        "* **Monitoring:** We will deploy Prometheus and Grafana for dashboards."
    )
    res_struct = analyze_similarity(structured_md)
    print("Structured Markdown result:")
    print("Suspected copy paste:", res_struct["suspected_copy_paste"])
    print("Risk Score:", res_struct["risk_score"])
    print("Reasons:", res_struct["reasons"])
    assert res_struct["suspected_copy_paste"] is True
    assert any("bullet-list density" in r.lower() or "markdown" in r.lower() for r in res_struct["reasons"])

    # 3. Test Genuine Conversation Response
    print("\n--- 3. Testing Conversational Human Responses (Should NOT Flag) ---")
    human_response = (
        "Yes, I have worked with decorators before. I usually write custom decorators to log function "
        "execution time or authenticate API requests. It keeps the codebase dry."
    )
    res_human = analyze_similarity(human_response)
    print("Human Response result:")
    print("Suspected copy paste:", res_human["suspected_copy_paste"])
    print("Risk Score:", res_human["risk_score"])
    print("Reasons:", res_human["reasons"])
    assert res_human["suspected_copy_paste"] is False

    # 4. Test End-to-End process_response Integration
    print("\n--- 4. Testing End-to-End process_response Integration ---")
    transcript = [
        {"role": "ai", "message": "Can you explain what a decorator is in Python?", "timestamp": "2026-07-24T00:00:00Z", "memory": {"last_question": "Can you explain what a decorator is in Python?"}},
        {"role": "candidate", "message": copied_decorator, "timestamp": "2026-07-24T00:00:05Z"}
    ]
    
    # Process turn
    result = await process_response(
        round_type="tech",
        transcript=transcript,
        job_title="Python Developer",
        exchange_count=1
    )
    
    print("process_response returned dict:")
    print("Intent:", result.get("intent"))
    print("Suspected Copy Paste Flag:", result.get("suspected_copy_paste"))
    print("Copy Paste Risk Score:", result.get("copy_paste_risk_score"))
    print("Reasons list:", result.get("copy_paste_reasons"))
    
    # Assertions
    assert result.get("intent") == "copy_paste"
    assert result.get("suspected_copy_paste") is True
    assert result.get("copy_paste_risk_score") > 0.40
    
    # Verify that the flag is recorded on the transcript entry
    cand_entry = transcript[-1]
    assert cand_entry.get("suspected_copy_paste") is True
    assert cand_entry.get("copy_paste_risk_score") > 0.40

    # 5. Test Concerns Compilation inside generate_round_summary / _build_rule_summary
    print("\n--- 5. Testing Final Concerns Compilation ---")
    summary = await generate_round_summary(
        round_type="tech",
        transcript=transcript,
        job_title="Python Developer"
    )
    
    print("Generated summary concerns:")
    for c in summary.get("concerns", []):
        print("-", c.encode("ascii", "replace").decode("ascii"))
        
    assert any("⚠️ Suspected Copy-Paste" in c for c in summary.get("concerns", []))

    print("\n=== ALL HEURISTIC COPY-PASTE & SIMILARITY ANALYZER TESTS PASSED SUCCESSFULY! ===")

if __name__ == "__main__":
    asyncio.run(test_suite())
