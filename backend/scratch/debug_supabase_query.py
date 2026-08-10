import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from supabase import create_client

client = create_client(settings.supabase_url, settings.supabase_service_role_key)
app_id = "1180990e-89c3-4d78-adbf-a3e3fbdf9ff5"
round_type = "tech"

print("Running test query...")
try:
    existing = client.table("ai_interview_rounds").select("id, status").eq("application_id", app_id).eq("round_type", round_type).maybe_single().execute()
    print("existing type:", type(existing))
    print("existing:", existing)
    if existing:
        print("existing.data:", existing.data)
except Exception as e:
    print("Query failed:", e)
