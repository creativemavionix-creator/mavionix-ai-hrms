import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

client = TestClient(app)

print("Testing GET /api/jobs/stats via TestClient...")
res = client.get("/api/jobs/stats", headers={"Authorization": "Bearer demo-token"})
print("Status Code:", res.status_code)
print("Response JSON:", res.json())

print("\nTesting POST /api/jobs via TestClient...")
job_payload = {
    "title": "Senior Frontend Developer",
    "department": "Engineering",
    "location": "Bangalore / Hybrid",
    "priority": "medium",
    "status": "active",
    "description": "- React / Zustand\n- Tailwind CSS\n- Git"
}
res_post = client.post("/api/jobs", json=job_payload, headers={"Authorization": "Bearer demo-token"})
print("Status Code:", res_post.status_code)
print("Response JSON:", res_post.json())
