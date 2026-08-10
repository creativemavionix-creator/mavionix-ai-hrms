import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

client = TestClient(app)

print("--- Testing Recruiter Copilot Endpoints ---")
try:
    res1 = client.get("/api/recruiter-copilot/daily-brief")
    print("GET /daily-brief:", res1.status_code)
    if res1.status_code != 200:
        print("Response:", res1.text)
except Exception as e:
    print("Error on /daily-brief:", e)

try:
    res2 = client.post("/api/recruiter-copilot/chat", json={"message": "Show top candidates"})
    print("POST /chat (top candidates):", res2.status_code)
    if res2.status_code != 200:
        print("Response:", res2.text)
except Exception as e:
    print("Error on /chat:", e)

try:
    res3 = client.post("/api/recruiter-copilot/chat", json={"message": "Compare Priya and Aisha"})
    print("POST /chat (compare):", res3.status_code)
    if res3.status_code != 200:
        print("Response:", res3.text)
except Exception as e:
    print("Error on /chat (compare):", e)

try:
    res4 = client.post("/api/recruiter-copilot/chat", json={"message": "Why is Priya ranked first?"})
    print("POST /chat (explain):", res4.status_code)
    if res4.status_code != 200:
        print("Response:", res4.text)
except Exception as e:
    print("Error on /chat (explain):", e)

print("--- Testing Candidates List ---")
try:
    res5 = client.get("/api/candidates")
    print("GET /api/candidates:", res5.status_code)
    if res5.status_code != 200:
        print("Response:", res5.text)
except Exception as e:
    print("Error on /api/candidates:", e)
