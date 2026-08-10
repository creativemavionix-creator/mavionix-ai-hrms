import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

client = TestClient(app)

print("=== Candidate Portal Backend Endpoint Audit ===")

# 1. Validate Token (demo and token)
try:
    res1 = client.get("/api/portal/validate/demo")
    print("GET /api/portal/validate/demo:", res1.status_code)
    if res1.status_code != 200:
        print("  Error:", res1.text)
except Exception as e:
    print("Exception on validate/demo:", e)

# 2. Portal Generate Token
try:
    res2 = client.post("/api/portal/generate-token", json={
        "candidate_id": "c1",
        "application_id": "1180990e-89c3-4d78-adbf-a3e3fbdf9ff5",
        "round_type": "tech"
    })
    print("POST /api/portal/generate-token:", res2.status_code)
    if res2.status_code == 200:
        t_data = res2.json()
        token = t_data.get("token")
        print("Generated Token:", token)
        res3 = client.get(f"/api/portal/validate/{token}")
        print(f"GET /api/portal/validate/{token}:", res3.status_code)
        if res3.status_code != 200:
            print("  Error:", res3.text)
    else:
        print("  Error:", res2.text)
except Exception as e:
    print("Exception on generate-token:", e)

# 3. Start Round
try:
    res4 = client.post("/api/applications/1180990e-89c3-4d78-adbf-a3e3fbdf9ff5/start-round/tech", headers={"Authorization": "Bearer demo-token"})
    print("POST /start-round/tech:", res4.status_code)
    if res4.status_code != 200:
        print("  Error:", res4.text)
    else:
        r_data = res4.json()
        round_id = r_data.get("round", {}).get("id")
        print("Round ID:", round_id)
        # 4. Respond
        if round_id:
            res5 = client.post(
                f"/api/applications/1180990e-89c3-4d78-adbf-a3e3fbdf9ff5/round/{round_id}/respond",
                json={"message": "I use PyTorch FSDP and DeepSpeed for distributed training."},
                headers={"Authorization": "Bearer demo-token"}
            )
            print("POST /respond:", res5.status_code)
            if res5.status_code != 200:
                print("  Error:", res5.text)
except Exception as e:
    print("Exception on start-round/respond:", e)

print("=== Candidate Portal Audit Complete ===")
