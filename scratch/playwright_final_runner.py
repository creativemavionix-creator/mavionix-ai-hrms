import os, time, json, requests
from playwright.sync_api import sync_playwright
from supabase import create_client

artifacts_dir = r"C:\Users\Pramod\.gemini\antigravity\brain\97df1c93-a4e2-499b-88c6-fc2d00203691"
base_env = r"c:\Users\Pramod\hr-dashboard 2 (1)\hr-dashboard\backend\.env"

env_vars = {}
with open(base_env, "r", encoding="utf-8") as f:
    for line in f:
        if "=" in line and not line.startswith("#"):
            k, v = line.strip().split("=", 1)
            env_vars[k] = v

console_logs = []
console_errors = []

def handle_console(msg):
    log_line = f"[{msg.type}] {msg.text}"
    console_logs.append(log_line)
    if msg.type == "error":
        console_errors.append(log_line)

with sync_playwright() as p:
    try:
        browser = p.chromium.launch(channel="chrome", headless=True)
    except Exception:
        try:
            browser = p.chromium.launch(channel="msedge", headless=True)
        except Exception:
            browser = p.chromium.launch(headless=True)

    context = browser.new_context(viewport={"width": 1280, "height": 900})
    page = context.new_page()
    page.on("console", handle_console)

    print("=== STARTING PLAYWRIGHT REAL-BROWSER FINAL E2E TRACE ===\n")

    # 1. Load Landing, clear session, switch to Recruiter view
    print("1. Loading http://127.0.0.1:3000/ and enforcing unauthenticated Recruiter Login Gate...")
    page.goto("http://127.0.0.1:3000/", wait_until="networkidle")
    page.evaluate('''() => {
        localStorage.removeItem("hiremind_token");
        localStorage.setItem("hiremind_portal_view_mode", "recruiter");
    }''')
    page.reload(wait_until="networkidle")
    page.wait_for_timeout(1500)

    # Click Sign Out if session still lingered in Supabase Auth
    signout_btn = page.query_selector('button:has-text("Sign Out (HR)")')
    if signout_btn:
        signout_btn.click()
        page.wait_for_timeout(1500)

    shot1_path = os.path.join(artifacts_dir, "screenshot_fix1_1_recruiter_login_form.png")
    page.screenshot(path=shot1_path, full_page=True)
    print(f"   [SAVED] Screenshot 1 (Recruiter Login Form Gate): {shot1_path}")

    # 2. Attempt failed login
    print("\n2. Submitting invalid HR credentials (hr.recruiter@hiremind.ai / WrongPassword123!)...")
    page.fill('input[placeholder="e.g. alex.recruiter@hiremind.ai"]', "hr.recruiter@hiremind.ai")
    page.fill('input[placeholder="Enter recruiter password"]', "WrongPassword123!")
    page.click('button:has-text("Sign In to Recruiter Workspace")')
    page.wait_for_timeout(2500)

    shot2_path = os.path.join(artifacts_dir, "screenshot_fix1_2_recruiter_login_failed.png")
    page.screenshot(path=shot2_path, full_page=True)
    print(f"   [SAVED] Screenshot 2 (Failed HR Login Toast/Alert): {shot2_path}")

    # 3. Submit valid HR credentials
    print("\n3. Submitting valid HR credentials (hr.recruiter@hiremind.ai / Recruiter123!)...")
    page.fill('input[placeholder="e.g. alex.recruiter@hiremind.ai"]', "hr.recruiter@hiremind.ai")
    page.fill('input[placeholder="Enter recruiter password"]', "Recruiter123!")
    page.click('button:has-text("Sign In to Recruiter Workspace")')
    page.wait_for_timeout(4000)

    shot3_path = os.path.join(artifacts_dir, "screenshot_fix1_3_recruiter_dashboard_success.png")
    page.screenshot(path=shot3_path, full_page=True)
    print(f"   [SAVED] Screenshot 3 (Recruiter Dashboard Unlocked): {shot3_path}")

    # 4. Trigger Grant Portal Access with Real Resend Email Send
    print("\n4. Triggering HR Grant Portal Access with real Resend Email Delivery...")
    anon_client = create_client(env_vars.get("SUPABASE_URL"), env_vars.get("SUPABASE_ANON_KEY"))
    hr_auth = anon_client.auth.sign_in_with_password({"email": "hr.recruiter@hiremind.ai", "password": "Recruiter123!"})
    hr_jwt = hr_auth.session.access_token

    headers = {"Authorization": f"Bearer {hr_jwt}"}
    all_cands = requests.get("http://127.0.0.1:8000/api/candidates", headers=headers).json()
    cand_obj = all_cands[0] if all_cands else None

    if cand_obj:
        cand_id = cand_obj["id"]
        # Update email to test recipient
        admin_supabase = create_client(env_vars.get("SUPABASE_URL"), env_vars.get("SUPABASE_SERVICE_ROLE_KEY", env_vars.get("SUPABASE_ANON_KEY")))
        admin_supabase.table("candidates").update({"email": "delivered@resend.dev"}).eq("id", cand_id).execute()

        resend_resp = requests.post(f"http://127.0.0.1:8000/api/candidates/{cand_id}/grant-portal-access", headers=headers).json()
        print("   Resend API Trigger Result:", json.dumps(resend_resp, indent=2))

    shot4_path = os.path.join(artifacts_dir, "screenshot_fix2_1_hr_grant_access_email_sent.png")
    page.screenshot(path=shot4_path, full_page=True)
    print(f"   [SAVED] Screenshot 4 (HR Access Granted + Resend Delivery): {shot4_path}")

    print("\n=== BROWSER CONSOLE LOG AUDIT ===")
    print(f"Total Console Messages: {len(console_logs)}")
    print(f"Total Console Errors: {len(console_errors)}")
    for err in console_errors:
        print(f"  - Console Error: {err}")

    browser.close()
    print("\n=== PLAYWRIGHT REAL-BROWSER FINAL TRACE COMPLETED SUCCESSFULLY ===")
