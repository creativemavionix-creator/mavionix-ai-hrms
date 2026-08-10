import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from supabase import create_client

print(f"Connecting to Supabase URL: {settings.supabase_url}")
client = create_client(settings.supabase_url, settings.supabase_service_role_key)

tables_to_check = [
    "candidates",
    "jobs",
    "applications",
    "assignments",
    "ai_interview_rounds",
    "candidate_tokens",
    "activity_logs"
]

results = {}
for table in tables_to_check:
    try:
        res = client.table(table).select("*", count="exact").limit(1).execute()
        results[table] = f"EXISTS (Count: {res.count if hasattr(res, 'count') else len(res.data)})"
    except Exception as e:
        results[table] = f"MISSING OR ERROR: {str(e)[:100]}"

print("\n--- Supabase Database Status ---")
for t, status in results.items():
    print(f"Table '{t}': {status}")
