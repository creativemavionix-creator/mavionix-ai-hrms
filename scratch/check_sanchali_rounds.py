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

# Candidate Sanchali Arora
cand = sb.table("candidates").select("*").ilike("name", "%Sanchali%").execute().data[0]
app = sb.table("applications").select("*").eq("candidate_id", cand["id"]).execute().data[0]

print("Application ID:", app["id"], "Stage:", app["stage"])

rounds = sb.table("ai_interview_rounds").select("*").eq("application_id", app["id"]).execute().data
reports = sb.table("ai_reports").select("*").eq("application_id", app["id"]).execute().data
tokens = sb.table("candidate_tokens").select("*").eq("application_id", app["id"]).execute().data

print("\nAI Interview Rounds count:", len(rounds))
for idx, r in enumerate(rounds):
    print(f"Round #{idx+1}:", json.dumps(r, indent=2))

print("\nAI Reports count:", len(reports))
for idx, rep in enumerate(reports):
    print(f"Report #{idx+1}:", json.dumps(rep, indent=2))

print("\nCandidate Tokens count:", len(tokens))
for idx, tok in enumerate(tokens):
    print(f"Token #{idx+1}:", json.dumps(tok, indent=2))
