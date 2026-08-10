import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

client = TestClient(app)
headers = {"Authorization": "Bearer demo-token"}

endpoints = [
    ("GET", "/api/dashboard/stats"),
    ("GET", "/api/jobs"),
    ("GET", "/api/candidates"),
    ("GET", "/api/ai-reports/stats"),
    ("GET", "/api/interviews/stats"),
    ("GET", "/api/interviews"),
    ("GET", "/api/communications/channels"),
    ("GET", "/api/settings"),
    ("GET", "/api/pipeline/stages"),
    ("GET", "/api/applications/1180990e-89c3-4d78-adbf-a3e3fbdf9ff5/history"),
    ("GET", "/api/recruiter-copilot/daily-brief"),
    ("POST", "/api/recruiter-copilot/chat"),
]

print("=== Comprehensive API Endpoint Health Audit ===")

for method, ep in endpoints:
    try:
        if method == "GET":
            res = client.get(ep, headers=headers)
        else:
            res = client.post(ep, json={"message": "Show top candidates"}, headers=headers)
        print(f"[{res.status_code}] {method} {ep}")
        if res.status_code >= 500:
            print(f"  ❌ SERVER ERROR: {res.text[:300]}")
    except Exception as exc:
        print(f"  ❌ EXCEPTION on {ep}: {exc}")

print("=== Audit Complete ===")
