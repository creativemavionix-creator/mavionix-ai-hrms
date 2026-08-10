import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from supabase import create_client

print("--- Testing Pure Supabase Database Operations (No AI APIs) ---")
print(f"Connecting to Supabase at: {settings.supabase_url}")
client = create_client(settings.supabase_url, settings.supabase_service_role_key)

try:
    # Use the seeded application ID
    app_id = "1180990e-89c3-4d78-adbf-a3e3fbdf9ff5"
    now = datetime.now(timezone.utc).isoformat()

    # 1. Insert a dummy interview round
    round_payload = {
        "application_id": app_id,
        "round_type": "tech",
        "transcript": [
            {"role": "ai", "message": "What is recursion?", "timestamp": now},
            {"role": "candidate", "message": "Recursion is a function calling itself.", "timestamp": now}
        ],
        "status": "in_progress",
        "started_at": now
    }
    
    print("\n[Step 1] Inserting test round into 'ai_interview_rounds'...")
    insert_res = client.table("ai_interview_rounds").insert(round_payload).execute()
    if not insert_res.data:
        raise RuntimeError("Failed to insert round record.")
    
    round_id = insert_res.data[0]["id"]
    print(f"Success! Inserted Round ID: {round_id}")

    # 2. Select the record back to verify persistence
    print("\n[Step 2] Selecting round record back from database...")
    select_res = client.table("ai_interview_rounds").select("*").eq("id", round_id).maybe_single().execute()
    if not select_res or not select_res.data:
        raise RuntimeError("Failed to select round record.")
        
    db_row = select_res.data
    print(f"Success! Retrieved Status: '{db_row['status']}'")
    print(f"Retrieved Transcript length: {len(db_row['transcript'])} entries")

    # 3. Clean up test round
    print("\n[Step 3] Cleaning up test round record...")
    client.table("ai_interview_rounds").delete().eq("id", round_id).execute()
    print("Success! Test record cleaned up.")

    print("\nPure Supabase Database read/write verification PASSED successfully!")

except Exception as e:
    print(f"\nDatabase Operation Failed: {e}")
