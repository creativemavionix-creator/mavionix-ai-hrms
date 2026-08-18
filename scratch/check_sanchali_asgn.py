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

# Fetch Sanchali Arora candidate and assignment
cand = sb.table("candidates").select("*").ilike("name", "%Sanchali%").execute().data[0]
app = sb.table("applications").select("*").eq("candidate_id", cand["id"]).execute().data[0]
asgns = sb.table("assignments").select("*").eq("application_id", app["id"]).order("created_at", desc=True).execute().data

print("App ID:", app["id"], "Stage:", app["stage"])
print("Assignments count:", len(asgns))
for idx, a in enumerate(asgns):
    print(f"Assignment #{idx+1}:", json.dumps(a, indent=2))
