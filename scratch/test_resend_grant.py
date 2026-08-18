import time, requests
from supabase import create_client

base_env = r"c:\Users\Pramod\hr-dashboard 2 (1)\hr-dashboard\backend\.env"
env_vars = {}
with open(base_env, "r", encoding="utf-8") as f:
    for line in f:
        if "=" in line and not line.startswith("#"):
            k, v = line.strip().split("=", 1)
            env_vars[k] = v

supabase_url = env_vars.get("SUPABASE_URL")
anon_key = env_vars.get("SUPABASE_ANON_KEY")

# 1. Sign in as HR to get JWT
anon_client = create_client(supabase_url, anon_key)
hr_auth = anon_client.auth.sign_in_with_password({"email": "hr.recruiter@hiremind.ai", "password": "Recruiter123!"})
hr_jwt = hr_auth.session.access_token

headers = {"Authorization": f"Bearer {hr_jwt}"}

# 2. Fetch candidate list
all_cands = requests.get("http://127.0.0.1:8000/api/candidates", headers=headers).json()
target_cand = all_cands[0] if all_cands else None

if target_cand:
    cand_id = target_cand["id"]
    # Update candidate email directly in Supabase candidates table
    service_role_key = env_vars.get("SUPABASE_SERVICE_ROLE_KEY", anon_key)
    admin_supabase = create_client(supabase_url, service_role_key)
    admin_supabase.table("candidates").update({"email": "delivered@resend.dev"}).eq("id", cand_id).execute()

    print(f"\nCalling grant-portal-access for candidate ID {cand_id} (email: delivered@resend.dev)...")

    grant_resp = requests.post(
        f"http://127.0.0.1:8000/api/candidates/{cand_id}/grant-portal-access",
        headers=headers
    ).json()

    print("\n=== RAW RESEND API ACCEPTANCE RESPONSE FROM BACKEND ===")
    print(grant_resp)
    print("=====================================================")
    print(f"email_sent: {grant_resp.get('email_sent')}")
    print(f"email_id: {grant_resp.get('email_id')}")
    print(f"email_error: {grant_resp.get('email_error')}")
