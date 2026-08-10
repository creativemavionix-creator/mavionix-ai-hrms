import sys
import os
import json
import asyncio

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.services.resume_parser import _mock_parse, _mock_score
from app.services.ai_interviews import generate_first_question, process_response

async def run_tests():
    print("=== RUNNING RULE-BASED FALLBACK SYSTEM TESTS ===")

    # Test 1: Resume Parser Variant Matching and Skill Extraction
    test_resume_text = """
    John Doe
    Email: john.doe@example.co.uk
    Phone: +44 7911 123456
    
    Professional Experience:
    Senior Developer at TechCorp (2018 - 2022)
    - Developed web apps using React.js, ReactJS, React JS and Node.js.
    - Wrote backend APIs in Python and FastAPI.
    - Worked on PyTorch model training.
    - Set up PostgreSQL and Redis caches.
    - Containerized microservices with Docker and Kubernetes (k8s) on AWS.
    
    Skills:
    React, NodeJS, Python, Go, C, R, PyTorch, Postgres
    """
    
    parsed = _mock_parse(test_resume_text)
    
    print("\n[TEST 1] Skill Variant Extraction:")
    print(f"Name extracted: {parsed['name']}")
    print(f"Email extracted: {parsed['email']}")
    print(f"Phone extracted: {parsed['phone']}")
    print(f"Skills parsed: {parsed['skills']}")
    
    # Assertions for variants matching
    assert "React" in parsed["skills"], "React variant matching failed"
    assert "Node.js" in parsed["skills"], "Node.js variant matching failed"
    assert "Python" in parsed["skills"], "Python matching failed"
    assert "PyTorch" in parsed["skills"], "PyTorch variant matching failed"
    assert "PostgreSQL" in parsed["skills"], "PostgreSQL variant matching failed"
    assert "Go" in parsed["skills"], "Go matching failed"
    assert "C" in parsed["skills"], "C matching failed"
    assert "R" in parsed["skills"], "R matching failed"
    
    # Test 2: False Positive Mitigation for Short Names
    false_pos_text = """
    Let's go to the market. I see a dog. R and D is cool. c you later.
    """
    parsed_false_pos = _mock_parse(false_pos_text)
    print("\n[TEST 2] False Positives Check (Go, C, R):")
    print(f"Skills parsed from generic text: {parsed_false_pos['skills']}")
    assert "Go" not in parsed_false_pos["skills"], "Go false positive matched!"
    assert "C" not in parsed_false_pos["skills"], "C false positive matched!"
    assert "R" not in parsed_false_pos["skills"], "R false positive matched!"
    print("-> No false positives matched!")

    # Test 3: Experience Years Extraction
    print("\n[TEST 3] Experience Years Extraction:")
    print(f"Extracted experience years: {parsed['experience_years']} years")
    assert parsed["experience_years"] >= 4, "Experience duration calculation failed"
    
    # Test 4 & 5: Scoring breakdown & Match Details
    scored = _mock_score(parsed, "Senior Backend Engineer")
    print("\n[TEST 4 & 5] Scoring Breakdown & Match Details:")
    print(f"Overall Match Score: {scored['overall_score']}% ({scored['match_quality']})")
    print(f"Detailed scores: {json.dumps({k:v for k,v in scored.items() if '_score' in k}, indent=2)}")
    print(f"Matched Skills: {scored['matched_skills']}")
    print(f"Missing Skills: {scored['missing_skills']}")
    print(f"Engine: {scored['engine']}, Confidence: {scored['confidence']}%")
    
    assert "skills_score" in scored, "Skills score missing"
    assert "experience_score" in scored, "Experience score missing"
    assert scored["engine"] == "rule_based", "Engine metadata mismatch"

    # Test 6: Progressive Q&A & Gibberish / Repeated Greeting Check
    print("\n[TEST 6] Progressive Questions & Context Awareness:")
    # Turn 1: generate_first_question (Easy [0])
    q1 = await generate_first_question("tech", "Senior Backend Engineer", "Engineering", "", "John")
    print(f"Turn 1 (Easy 0): {q1}")
    
    # Test 6a: Candidate types gibberish
    transcript = [
        {"role": "ai", "message": q1},
        {"role": "candidate", "message": "asdfghjkl"}
    ]
    q_gib = await process_response("tech", transcript, "Senior Backend Engineer", 1)
    print(f"Gibberish response: {q_gib['message']}")
    assert q_gib.get("is_warning") is True, "Gibberish warning failed"
    
    # Test 6b: Candidate types repeated greeting
    transcript.extend([
        {"role": "ai", "message": q_gib["message"]},
        {"role": "candidate", "message": "hiiiii"}
    ])
    q_greet = await process_response("tech", transcript, "Senior Backend Engineer", 2)
    print(f"Greeting response: {q_greet['message']}")
    assert q_greet.get("is_warning") is True, "Repeated greeting warning failed"
    
    # Test 6c: Candidate types substantive answer (should serve Easy [1] next because substantiveCount is 1)
    transcript.extend([
        {"role": "ai", "message": q_greet["message"]},
        {"role": "candidate", "message": "I prefer using PostgreSQL and Redis."}
    ])
    q2 = await process_response("tech", transcript, "Senior Backend Engineer", 3)
    print(f"Turn 2 (Easy 1): {q2['message']}")
    assert "RESTful" in q2["message"] or "HTTP" in q2["message"] or "endpoints" in q2["message"], "Progression to Easy 1 failed"
    
    # Test 6d: Candidate types substantive answer (should serve Intermediate [0])
    transcript.extend([
        {"role": "ai", "message": q2["message"]},
        {"role": "candidate", "message": "I structure REST endpoints using resource names and standard HTTP status codes."}
    ])
    q3 = await process_response("tech", transcript, "Senior Backend Engineer", 4)
    print(f"Turn 3 (Intermediate 0): {q3['message']}")
    assert "concurrency" in q3["message"] or "pooling" in q3["message"] or "Celery" in q3["message"] or "queue" in q3["message"], "Progression to Intermediate 0 failed"
    
    # Test 7: Metrics log verification
    metrics_file = r"C:\Users\Pramod\.gemini\antigravity\scratch\fallback_metrics.json"
    print("\n[TEST 7] Metrics Verification:")
    if os.path.exists(metrics_file):
        with open(metrics_file, "r") as f:
            metrics = json.load(f)
        print(f"Metrics Log content: {json.dumps(metrics, indent=2)}")
        assert metrics["executions"] > 0, "Fallback metrics tracking failed"
    else:
        raise AssertionError("Metrics file fallback_metrics.json not created")

    print("\n=== ALL TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    asyncio.run(run_tests())
