import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

client = TestClient(app)
token = "pc1I7r1xvBbURTIYJ5mrvt2fhy8Q39j7-JX4FsiktPY"

print("--- Testing GET /api/portal/validate/{token} ---")
res = client.get(f"/api/portal/validate/{token}")
print("Status Code:", res.status_code)
if res.status_code == 200:
    data = res.json()
    session = data.get("session", {})
    print("Candidate Name:", session.get("candidateName"))
    print("Job Title:", session.get("jobTitle"))
    print("Assignment Title:", session.get("assignment", {}).get("title"))
    print("Assignment Status:", session.get("assignment", {}).get("status"))
else:
    print("Error:", res.text)
