import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

client = TestClient(app)

print("--- Testing Candidates API Endpoints ---")

# 1. GET Candidate Stats
print("\n[Step 1] GET /api/candidates/stats...")
res = client.get("/api/candidates/stats", headers={"Authorization": "Bearer demo-token"})
print("Status:", res.status_code)
print("Data:", res.json())

# 2. GET Candidates List
print("\n[Step 2] GET /api/candidates...")
res_list = client.get("/api/candidates", headers={"Authorization": "Bearer demo-token"})
print("Status:", res_list.status_code)
print("Count:", len(res_list.json()) if res_list.status_code == 200 else res_list.text)

print("\nCandidate API Test Completed!")
