import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

client = TestClient(app)
headers = {"Authorization": "Bearer demo-token"}

print("=== Testing Updated Camera Policy Guidance from Copilot ===")
res = client.post("/api/recruiter-copilot/chat", json={
    "message": "What is the 3 strike tab switch policy?"
}, headers=headers)
print("Copilot Chat Status:", res.status_code)
if res.status_code == 200:
    data = res.json()
    print("Intent Detected:", data.get("intent"))
    badge = str(data.get("metadata_badge")).replace("\u2713", "[VERIFIED]")
    print("Metadata Badge:", badge)
    summary = str(data.get("skill_data", {}).get("summary"))
    print("Policy Summary:", summary[:120])
