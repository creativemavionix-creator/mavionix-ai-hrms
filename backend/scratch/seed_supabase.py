import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from supabase import create_client

print(f"Connecting to Supabase at: {settings.supabase_url}")
client = create_client(settings.supabase_url, settings.supabase_service_role_key)

try:
    # 1. Insert a Job
    job_payload = {
        "job_code": "JOB-ML-001",
        "title": "Senior Machine Learning Engineer",
        "department": "AI Engineering",
        "location": "Remote / San Francisco",
        "status": "active",
        "priority": "high",
        "description": "Design, train, and deploy large language models and distributed vector search engines."
    }
    job_res = client.table("jobs").upsert(job_payload, on_conflict="job_code").execute()
    job = job_res.data[0]
    print(f"Job created/updated: {job['title']} (ID: {job['id']})")

    # 2. Insert a Candidate
    candidate_payload = {
        "name": "Priya Sharma",
        "email": "priya.sharma@example.com",
        "phone": "+1 (555) 234-5678",
        "initials": "PS",
        "parsed_data": {
            "skills": ["Python", "PyTorch", "NLP", "FastAPI", "Docker", "Vector Search"]
        }
    }
    cand_res = client.table("candidates").upsert(candidate_payload, on_conflict="email").execute()
    candidate = cand_res.data[0]
    print(f"Candidate created/updated: {candidate['name']} (ID: {candidate['id']})")

    # 3. Insert Application
    app_payload = {
        "job_id": job["id"],
        "candidate_id": candidate["id"],
        "stage": "tech_round",
        "ai_score": 88,
        "match_quality": "excellent"
    }
    app_res = client.table("applications").upsert(app_payload, on_conflict="job_id,candidate_id").execute()
    app = app_res.data[0]
    print(f"Application created/updated (ID: {app['id']})")

    # 4. Insert Take-Home Assignment
    assign_payload = {
        "application_id": app["id"],
        "title": "Design a Distributed Vector Database Search Engine",
        "description": "Design a high-throughput vector search system that indexes embeddings of size 1536 and supports sub-20ms cosine similarity searches across 10 million vectors.",
        "requirements": "- Propose indexing structure (HNSW or IVF-PQ)\n- Address RAM budgeting & quantization\n- Define API endpoints",
        "status": "pending"
    }
    assign_res = client.table("assignments").upsert(assign_payload, on_conflict="id").execute()
    print(f"Assignment created/updated")

    # 5. Insert Candidate Portal Token
    token_payload = {
        "candidate_id": candidate["id"],
        "application_id": app["id"],
        "token": "demo",
        "round_type": "tech",
        "used": False,
        "expires_at": "2030-01-01T00:00:00Z"
    }
    client.table("candidate_tokens").upsert(token_payload, on_conflict="token").execute()
    print(f"Candidate Token 'demo' active for portal URL: http://localhost:3001/interview?token=demo")

    print("\nSupabase Database Successfully Seeded!")

except Exception as e:
    print(f"\nError seeding Supabase: {e}")
