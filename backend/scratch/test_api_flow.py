import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.database import supabase
from app.auth import get_current_user
from app.schemas.users import CurrentUser

mock_user = CurrentUser(
    id="ba98bd4b-5fdb-4f4a-bc66-24f949235c99",
    email="admin@hiremind.test",
    name="Test Admin",
    role="super_admin",
    token="mock-token"
)
app.dependency_overrides[get_current_user] = lambda: mock_user

client = TestClient(app)
app_id = "1180990e-89c3-4d78-adbf-a3e3fbdf9ff5"

print("--- Testing API Flow with Live Supabase & AI ---")

try:
    # 2. Start the Technical Round via API
    print("\n[Step 1] Starting Technical Round via API...")
    start_res = client.post(f"/api/applications/{app_id}/start-round/tech")
    if start_res.status_code != 200:
        print(f"FAILED to start round: {start_res.status_code} - {start_res.text}")
        sys.exit(1)
    
    start_data = start_res.json()
    round_id = start_data["round"]["id"]
    first_question = start_data.get("firstQuestion") or "Let's begin."
    print(f"Round started successfully (Round ID: {round_id})")
    print(f"AI Interviewer: {first_question}")

    # 3. Respond as Candidate
    candidate_answer = "I would use Python and PyTorch to design the vector search engine. For high-throughput requirements, I would build an HNSW index to achieve sub-20ms search times. We'd also implement product quantization to budget our RAM usage."
    print(f"\n[Step 2] Submitting Candidate Answer: {candidate_answer}...")
    
    respond_payload = {
        "message": candidate_answer,
        "candidate_skills": ["Python", "PyTorch", "NLP", "FastAPI"]
    }
    respond_res = client.post(f"/api/applications/{app_id}/round/{round_id}/respond", json=respond_payload)
    if respond_res.status_code != 200:
        print(f"FAILED to respond: {respond_res.status_code} - {respond_res.text}")
        sys.exit(1)
        
    respond_data = respond_res.json()
    print("Answer processed successfully!")
    print(f"AI Next Question: {respond_data['message']}")
    print(f"Current Answer Score: {respond_data.get('answer_score')}/10")

    # 4. Verify DB storage
    print("\n[Step 3] Verifying data storage in Supabase...")
    db_res = supabase.table("ai_interview_rounds").select("*").eq("id", round_id).maybe_single().execute()
    if not db_res or not db_res.data:
        print("Round data not found in Supabase!")
        sys.exit(1)
        
    round_db = db_res.data
    transcript = round_db.get("transcript", [])
    print(f"Verified round status in DB: {round_db['status']}")
    print(f"Verified transcript length in DB: {len(transcript)} entries stored")
    print(f"Verified first turn contains candidate response: {any(t['role'] == 'candidate' for t in transcript)}")

    print("\nLIVE END-TO-END SUPABASE & AI TEST PASSED SUCCESSFULLY!")

except Exception as e:
    print(f"\nError during API flow test: {e}")
