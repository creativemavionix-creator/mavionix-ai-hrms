import sys
import os
import asyncio

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.services.ai_interviews import process_response, _classify_intent, generate_first_question

async def test_suite():
    print("=== RUNNING RULE-BASED STATE MACHINE TESTS ===")

    # Setup basic test variables
    job_title = "Senior Backend Engineer"
    round_type = "tech"
    candidate_skills = ["Python", "PostgreSQL", "Docker"]

    # Generate opener question first
    q1 = await generate_first_question(round_type, job_title, "Engineering", "", "John", candidate_skills)
    print(f"Turn 1 (Opener): {q1}\n")

    # 1. Greeting Check
    transcript = [
        {"role": "ai", "message": q1, "state": "Asking Question", "memory": {"last_question": q1}}
    ]
    
    # 1a. User says hello mid-interview
    transcript.append({"role": "candidate", "message": "hello interviewer!"})
    res_greet = await process_response(round_type, transcript, job_title, 1, candidate_skills)
    print(f"Greeting Intent response: {res_greet['message']}")
    assert res_greet["intent"] == "greeting", "Greeting intent check failed"
    assert "return to the current question" in res_greet["message"], "Greeting warning text check failed"
    assert res_greet["state"] == "Warning Candidate", "State machine transition failed"

    # 1b. Recovery after greeting
    transcript.append({
        "role": "ai", 
        "message": res_greet["message"], 
        "state": res_greet["state"], 
        "memory": res_greet["memory"]
    })
    
    # 2. Abuse Striking & Termination Check
    print("\n--- Testing Abuse Detection and Strike Escalation ---")
    transcript_abuse = [
        {"role": "ai", "message": q1, "state": "Asking Question", "memory": {"last_question": q1}}
    ]
    
    # Strike 1: Swear word
    transcript_abuse.append({"role": "candidate", "message": "this test is bullshit"})
    res_abuse1 = await process_response(round_type, transcript_abuse, job_title, 1, candidate_skills)
    print(f"Abuse Strike 1 response: {res_abuse1['message']}")
    assert res_abuse1["intent"] == "abuse", "Abuse detection failed"
    assert res_abuse1["memory"]["abuse_count"] == 1, "Abuse strike count failed"
    assert "keep this professional" in res_abuse1["message"]

    # Strike 2: Spam / Repeated letters
    transcript_abuse.append({
        "role": "ai", 
        "message": res_abuse1["message"], 
        "state": res_abuse1["state"], 
        "memory": res_abuse1["memory"]
    })
    transcript_abuse.append({"role": "candidate", "message": "zzzzzzzzzzzzzzz"})
    res_abuse2 = await process_response(round_type, transcript_abuse, job_title, 2, candidate_skills)
    print(f"Abuse Strike 2 response: {res_abuse2['message']}")
    assert res_abuse2["memory"]["abuse_count"] == 2, "Abuse strike count failed"
    assert "final warning" in res_abuse2["message"]

    # Strike 3: Keyboard smash / Termination
    transcript_abuse.append({
        "role": "ai", 
        "message": res_abuse2["message"], 
        "state": res_abuse2["state"], 
        "memory": res_abuse2["memory"]
    })
    transcript_abuse.append({"role": "candidate", "message": "qwrtypzsdfghj"})
    res_abuse3 = await process_response(round_type, transcript_abuse, job_title, 3, candidate_skills)
    print(f"Abuse Strike 3 response: {res_abuse3['message']}")
    assert res_abuse3["type"] == "complete", "Termination check failed"
    assert res_abuse3["state"] == "Closing Interview", "State complete lock check failed"
    assert "terminating" in res_abuse3["message"]

    # 3. Nervous reassurance
    print("\n--- Testing Nervous Candidate Support ---")
    transcript_nervous = [
        {"role": "ai", "message": q1, "state": "Asking Question", "memory": {"last_question": q1}},
        {"role": "candidate", "message": "I'm feeling very nervous right now"}
    ]
    res_nervous = await process_response(round_type, transcript_nervous, job_title, 1, candidate_skills)
    print(f"Nervous Candidate response: {res_nervous['message']}")
    assert res_nervous["intent"] == "nervous"
    assert "normal to feel a bit nervous" in res_nervous["message"]

    # 4. Skip Limit Check
    print("\n--- Testing Skipping Logic ---")
    transcript_skip = [
        {"role": "ai", "message": q1, "state": "Asking Question", "memory": {"last_question": q1, "skips_used": 0}}
    ]
    # First skip: Allowed, serves Turn 2 Q (Easy [1])
    transcript_skip.append({"role": "candidate", "message": "skip this"})
    res_skip1 = await process_response(round_type, transcript_skip, job_title, 1, candidate_skills)
    print(f"First Skip response: {res_skip1['message']}")
    assert res_skip1["intent"] == "skip"
    assert res_skip1["memory"]["skips_used"] == 1
    assert "skip" in res_skip1["message"]
    # Check that it serves next progressive technical question (RESTful/endpoints)
    assert "RESTful" in res_skip1["message"] or "HTTP" in res_skip1["message"] or "endpoints" in res_skip1["message"]

    # Second skip: Rejected
    transcript_skip.append({
        "role": "ai", 
        "message": res_skip1["message"], 
        "state": res_skip1["state"], 
        "memory": res_skip1["memory"]
    })
    transcript_skip.append({"role": "candidate", "message": "please skip this too"})
    res_skip2 = await process_response(round_type, transcript_skip, job_title, 2, candidate_skills)
    print(f"Second Skip response: {res_skip2['message']}")
    assert res_skip2["memory"]["skips_used"] == 2
    assert "only allow one skipped question" in res_skip2["message"]

    # 5. Clarification Boundary Check
    print("\n--- Testing Clarification Boundaries ---")
    transcript_clarify = [
        {"role": "ai", "message": q1, "state": "Asking Question", "memory": {"last_question": q1}}
    ]
    transcript_clarify.append({"role": "candidate", "message": "could you explain the question?"})
    res_clarify = await process_response(round_type, transcript_clarify, job_title, 1, candidate_skills)
    print(f"Clarification response: {res_clarify['message']}")
    assert res_clarify["intent"] == "clarification"
    assert "cannot reveal the expected solution" in res_clarify["message"]
    assert res_clarify["state"] == "Clarifying Answer"

    # 6. Interruption Recovery Check
    print("\n--- Testing Interruption Recovery ---")
    transcript_recovery = [
        {"role": "ai", "message": q1, "state": "Asking Question", "memory": {"last_question": q1}},
        {"role": "candidate", "message": "my page refreshed"}
    ]
    res_recovery = await process_response(round_type, transcript_recovery, job_title, 1, candidate_skills)
    print(f"Recovery response: {res_recovery['message']}")
    assert res_recovery["intent"] == "interruption_recovery"
    assert "restored your session" in res_recovery["message"]

    # 7. Answer Quality Metrics Check
    print("\n--- Testing Substantive Turn & Answer Quality Scoring ---")
    transcript_substantive = [
        {"role": "ai", "message": q1, "state": "Asking Question", "memory": {"last_question": q1}},
        {"role": "candidate", "message": "I build APIs using Python and FastAPI, storing records in PostgreSQL and cache values in Redis. We deploy in Docker containers."}
    ]
    res_sub = await process_response(round_type, transcript_substantive, job_title, 1, candidate_skills)
    print("Quality Scoring Metadata:", res_sub["quality_metadata"])
    assert res_sub["quality_metadata"]["answer_length"] > 10
    assert "python" in res_sub["quality_metadata"]["technical_keywords"]
    assert res_sub["quality_metadata"]["estimated_completeness"] > 0.3

    # 8. Completion Locking Check
    print("\n--- Testing Substantive Turn Completion Locking ---")
    # Build transcript with 6 substantive answers
    transcript_complete = [{"role": "ai", "message": q1, "state": "Asking Question", "memory": {"last_question": q1}}]
    q_curr = q1
    for i in range(5):
        transcript_complete.append({"role": "candidate", "message": "Python and PostgreSQL are key backend tech."})
        res_step = await process_response(round_type, transcript_complete, job_title, len(transcript_complete), candidate_skills)
        q_curr = res_step["message"]
        transcript_complete.append({
            "role": "ai",
            "message": q_curr,
            "state": res_step.get("state"),
            "memory": res_step.get("memory")
        })

    # The 6th substantive answer should complete the interview
    transcript_complete.append({"role": "candidate", "message": "Final answer regarding technical scaling."})
    res_last = await process_response(round_type, transcript_complete, job_title, len(transcript_complete), candidate_skills)
    print(f"Final turn response type: {res_last['type']}")
    print(f"Final turn message: {res_last['message']}")
    assert res_last["type"] == "complete"
    assert res_last["state"] == "Closing Interview"

    # Subsequent turn lockout check
    transcript_complete.append({
        "role": "ai",
        "message": res_last["message"],
        "state": res_last["state"],
        "memory": res_last["memory"]
    })
    transcript_complete.append({"role": "candidate", "message": "but wait, i have one more thing!"})
    res_locked = await process_response(round_type, transcript_complete, job_title, len(transcript_complete), candidate_skills)
    print(f"Lockout response: {res_locked['message']}")
    assert res_locked["type"] == "complete"
    assert "already completed" in res_locked["message"]

    print("\n=== ALL RULE-BASED STATE MACHINE TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    asyncio.run(test_suite())
