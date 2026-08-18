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

# 1. Fetch Candidate
cand_res = sb.table("candidates").select("*").ilike("name", "%Sanchali%").execute()
print("Candidate:", json.dumps(cand_res.data, indent=2))

if cand_res.data:
    for c in cand_res.data:
        cand_id = c["id"]
        app_res = sb.table("applications").select("*").eq("candidate_id", cand_id).execute()
        print("Applications for", c["name"], ":", json.dumps(app_res.data, indent=2))

        if app_res.data:
            for app in app_res.data:
                app_id = app["id"]
                asgn_res = sb.table("assignments").select("*").eq("application_id", app_id).order("created_at", desc=True).execute()
                print("Assignments for app", app_id, ":", json.dumps(asgn_res.data, indent=2))
