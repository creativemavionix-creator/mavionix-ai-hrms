import json
import requests
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
asgn = sb.table("assignments").select("*").eq("application_id", app["id"]).order("created_at", desc=True).execute().data[0]

print("Initial Application Stage:", app["stage"])

# 1. Test APPROVE Action
print("\n--- Testing APPROVE Action ---")
sb.table("applications").update({"stage": "tech_round"}).eq("id", app["id"]).execute()
app_after_approve = sb.table("applications").select("stage").eq("id", app["id"]).execute().data[0]
print("Stage after APPROVE:", app_after_approve["stage"])

# 2. Test REJECT Action
print("\n--- Testing REJECT Action ---")
sb.table("applications").update({"stage": "rejected"}).eq("id", app["id"]).execute()
app_after_reject = sb.table("applications").select("stage").eq("id", app["id"]).execute().data[0]
print("Stage after REJECT:", app_after_reject["stage"])

# 3. Restore to tech_round so candidate sees Congratulations banner
sb.table("applications").update({"stage": "tech_round"}).eq("id", app["id"]).execute()
print("\nRestored application stage to 'tech_round' for live candidate portal view!")
