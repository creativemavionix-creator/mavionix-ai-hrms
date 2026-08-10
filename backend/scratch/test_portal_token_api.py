import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

client = TestClient(app)
app_id = "1180990e-89c3-4d78-adbf-a3e3fbdf9ff5"

print("--- Testing Candidate Portal Token Generation ---")
payload = {
    "candidate_id": "",
    "application_id": app_id,
    "round_type": "tech"
}

res = client.post("/api/portal/generate-token", json=payload, headers={"Authorization": "Bearer demo-token"})
print("Status Code:", res.status_code)
print("Response JSON:", res.json())
