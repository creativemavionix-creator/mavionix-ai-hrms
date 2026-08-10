import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

client = TestClient(app)
app_id = "1180990e-89c3-4d78-adbf-a3e3fbdf9ff5"

print("--- Testing GET /api/pipeline/{app_id}/history ---")

res = client.get(f"/api/pipeline/{app_id}/history", headers={"Authorization": "Bearer demo-token"})
print("Status Code:", res.status_code)
if res.status_code == 200:
    data = res.json()
    print("Success!")
    print("Candidate:", data.get("candidate_name"))
    print("Role:", data.get("job_title"))
    print("Current Stage:", data.get("current_stage"))
    print("Stages count:", len(data.get("stages", [])))
else:
    print("Error:", res.text)
