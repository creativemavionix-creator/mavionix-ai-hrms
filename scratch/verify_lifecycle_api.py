import json
from supabase import create_client

base_env = r'backend/.env'
env_vars = {}
with open(base_env, 'r', encoding='utf-8') as f:
    for line in f:
        if '=' in line and not line.startswith('#'):
            k, v = line.strip().split('=', 1)
            env_vars[k] = v

sb = create_client(env_vars['SUPABASE_URL'], env_vars['SUPABASE_SERVICE_ROLE_KEY'])

# Fetch Candidate Sanchali Arora
cand_res = sb.table("candidates").select("*").ilike("name", "%Sanchali%").execute()
cand = cand_res.data[0]
cand_id = cand["id"]

app_res = sb.table("applications").select("*").eq("candidate_id", cand_id).execute()
app_id = app_res.data[0]["id"]

asgn_res = sb.table("assignments").select("*").eq("application_id", app_id).order("created_at", desc=True).execute()
asgn_id = asgn_res.data[0]["id"]

# Update assignment with valid schema columns (submission_url, submission_text, status)
sb.table("assignments").update({
    "status": "submitted",
    "submission_url": "https://github.com/palak-in-progresss/Lyra-the-chatbot",
    "submission_text": "Lyra Chatbot implementation built with FastAPI, LangChain, and Redis async token rate limiting."
}).eq("id", asgn_id).execute()

sb.table("applications").update({"stage": "assignment_submitted"}).eq("id", app_id).execute()

print("DB SUCCESS: Assignment for Sanchali Arora updated to status 'submitted' with submission_url and submission_text!")
