import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

client = TestClient(app)

print("--- 1. Testing GET /api/recruiter-copilot/daily-brief ---")
res1 = client.get("/api/recruiter-copilot/daily-brief", headers={"Authorization": "Bearer demo-token"})
print("Status Code:", res1.status_code)
if res1.status_code == 200:
    print("Brief Data:", res1.json().get("summary"))

print("\n--- 2. Testing POST /api/recruiter-copilot/chat (Compare Candidates) ---")
res2 = client.post(
    "/api/recruiter-copilot/chat",
    json={"message": "Compare Priya and Aisha"},
    headers={"Authorization": "Bearer demo-token"}
)
print("Status Code:", res2.status_code)
if res2.status_code == 200:
    data = res2.json()
    print("Intent Detected:", data.get("intent"))
    print("Confidence Score:", data.get("confidence_score"), "%")
    print("Sources:", data.get("sources"))
    print("Candidates in Matrix:", len(data.get("comparison_matrix", [])))

print("\n--- 3. Testing POST /api/recruiter-copilot/chat (Why is Priya ranked first?) ---")
res3 = client.post(
    "/api/recruiter-copilot/chat",
    json={"message": "Why is Priya ranked first?"},
    headers={"Authorization": "Bearer demo-token"}
)
print("Status Code:", res3.status_code)
if res3.status_code == 200:
    data = res3.json()
    print("Intent Detected:", data.get("intent"))
    print("Follow up chips:", data.get("follow_up_chips"))
    print("Action Buttons:", data.get("action_buttons"))

print("\n--- 4. Testing POST /api/recruiter-copilot/chat (Pipeline Health) ---")
res4 = client.post(
    "/api/recruiter-copilot/chat",
    json={"message": "Show me pipeline health and drop off statistics"},
    headers={"Authorization": "Bearer demo-token"}
)
print("Status Code:", res4.status_code)
if res4.status_code == 200:
    data = res4.json()
    print("Skill:", data.get("skill_data", {}).get("skill"))
    drop_stage = str(data.get("skill_data", {}).get("largest_drop_stage")).replace("\u2192", "->")
    print("Largest Drop Stage:", drop_stage)
