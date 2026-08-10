import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

client = TestClient(app)
headers = {"Authorization": "Bearer demo-token"}

print("=== 1. Testing Regenerated Token Generation & Validation ===")
res1 = client.post("/api/portal/generate-token", json={
    "application_id": "1180990e-89c3-4d78-adbf-a3e3fbdf9ff5",
    "round_type": "tech"
}, headers=headers)
print("POST /generate-token Status:", res1.status_code)
if res1.status_code == 200:
    tok_data = res1.json()
    new_token = tok_data.get("token")
    print("New Token Issued:", new_token)
    
    # Validate the freshly generated token
    val_res = client.get(f"/api/portal/validate/{new_token}")
    print("GET /validate/{new_token} Status:", val_res.status_code)
    if val_res.status_code == 200:
        print("Validated Session Candidate:", val_res.json().get("session", {}).get("candidateName"))

print("\n=== 2. Testing Security Policy Guidance from Copilot ===")
cop_res = client.post("/api/recruiter-copilot/chat", json={
    "message": "What happens on 3 camera strikes?"
}, headers=headers)
print("Copilot Chat Status:", cop_res.status_code)
if cop_res.status_code == 200:
    c_data = cop_res.json()
    print("Intent Detected:", c_data.get("intent"))
    print("Badge:", c_data.get("metadata_badge", {}).get("source"))
