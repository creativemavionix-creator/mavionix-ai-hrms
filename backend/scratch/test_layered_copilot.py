import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

client = TestClient(app)
headers = {"Authorization": "Bearer demo-token"}

print("=== 1. Testing Platform Guide (How to Add Candidate) ===")
res1 = client.post("/api/recruiter-copilot/chat", json={
    "message": "How do I add a candidate to the dashboard?"
}, headers=headers)
print("Status Code:", res1.status_code)
if res1.status_code == 200:
    data = res1.json()
    print("Intent:", data.get("intent"))
    badge = str(data.get("metadata_badge")).replace("\u2713", "[VERIFIED]")
    print("Metadata Badge:", badge)

print("\n=== 2. Testing Security Policy (3-Strike Rule) ===")
res2 = client.post("/api/recruiter-copilot/chat", json={
    "message": "What is the 3 strike tab switch policy?"
}, headers=headers)
print("Status Code:", res2.status_code)
if res2.status_code == 200:
    data = res2.json()
    print("Intent:", data.get("intent"))
    badge = str(data.get("metadata_badge")).replace("\u2713", "[VERIFIED]")
    print("Metadata Badge:", badge)

print("\n=== 3. Testing Context Awareness & Relative Pronoun ('she') ===")
res3 = client.post("/api/recruiter-copilot/chat", json={
    "message": "Why was she ranked first?",
    "page_context": {
        "active_tab": "candidates",
        "current_candidate_name": "Priya Sharma",
        "current_candidate_id": "c1"
    }
}, headers=headers)
print("Status Code:", res3.status_code)
if res3.status_code == 200:
    data = res3.json()
    print("Intent:", data.get("intent"))
    print("Candidate Evaluated:", data.get("skill_data", {}).get("candidate", {}).get("name"))

print("\n=== 4. Testing Universal Search (React developer score above 80) ===")
res4 = client.post("/api/recruiter-copilot/chat", json={
    "message": "Find React developers with score above 80"
}, headers=headers)
print("Status Code:", res4.status_code)
if res4.status_code == 200:
    data = res4.json()
    print("Intent:", data.get("intent"))
    print("Applied Filters:", data.get("skill_data", {}).get("applied_filters"))

print("\n=== 5. Testing Off-Topic Guardrail (Recipe for pizza) ===")
res5 = client.post("/api/recruiter-copilot/chat", json={
    "message": "What is the best recipe for making pizza?"
}, headers=headers)
print("Status Code:", res5.status_code)
if res5.status_code == 200:
    data = res5.json()
    print("Intent:", data.get("intent"))
    clean_msg = data.get("message", "").encode("ascii", "ignore").decode("ascii").replace("\n", " ")
    print("Response Snippet:", clean_msg[:120])

print("\n=== 6. Testing DB RAG Regression (Compare Candidates) ===")
res6 = client.post("/api/recruiter-copilot/chat", json={
    "message": "Compare Priya and Aisha"
}, headers=headers)
print("Status Code:", res6.status_code)
if res6.status_code == 200:
    data = res6.json()
    print("Intent:", data.get("intent"))
    print("Comparison Matrix Rows:", len(data.get("comparison_matrix", [])))
