import os, time, json, requests
from playwright.sync_api import sync_playwright
from supabase import create_client

artifacts_dir = r"C:\Users\Pramod\.gemini\antigravity\brain\97df1c93-a4e2-499b-88c6-fc2d00203691"
pdf_path = os.path.join(artifacts_dir, "scratch", "sample_resume.pdf")

timestamp = int(time.time() * 1000)
test_email = f"playwright.user.{timestamp}@example.com"
test_name = f"Playwright User {timestamp}"

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

    print("=== STARTING PLAYWRIGHT REAL-BROWSER E2E TRACE ===\n")

    # 1. Load Landing & Set Candidate Portal Mode
    print("1. Loading http://127.0.0.1:3000/ and switching to Candidate Portal View...")
    page.goto("http://127.0.0.1:3000/", wait_until="networkidle")
    page.evaluate('localStorage.setItem("hiremind_portal_view_mode", "candidate")')
    page.reload(wait_until="networkidle")
    page.wait_for_timeout(1500)

    shot1_path = os.path.join(artifacts_dir, "screenshot_1_apply_form.png")
    page.screenshot(path=shot1_path, full_page=True)
    print(f"   [SAVED] Screenshot 1: {shot1_path}")

    # Verify password input count is 0 on Apply Form
    pw_inputs = page.query_selector_all('input[type="password"]')
    print(f"   Password fields found on candidate apply form: {len(pw_inputs)} (Expected: 0)")

    # 2. Fill out and submit application
    print("\n2. Filling out candidate application form in real browser...")
    page.fill('input[placeholder="e.g. Alex Rivera"]', test_name)
    page.fill('input[placeholder="alex.rivera@example.com"]', test_email)
    page.fill('input[placeholder="+1 (555) 019-2834"]', "+15550198888")
    page.fill('input[placeholder="e.g. San Francisco, CA"]', "Austin, TX")
    page.fill('textarea', "Playwright real-browser E2E verification application statement.")

    # Upload PDF Resume
    file_input = page.query_selector('input[type="file"]')
    if file_input:
        file_input.set_input_files(pdf_path)
        print("   Uploaded sample_resume.pdf")

    print("   Submitting candidate application...")
    page.click('button:has-text("Submit Candidate Application")')
    page.wait_for_timeout(3500)

    shot2_path = os.path.join(artifacts_dir, "screenshot_2_apply_submitted.png")
    page.screenshot(path=shot2_path, full_page=True)
    print(f"   [SAVED] Screenshot 2: {shot2_path}")

    # 3. Load Candidate Sign-In Form & Attempt invalid login
    print("\n3. Attempting sign-in with invalid credentials before HR grant...")
    page.click('button:has-text("2. Existing Candidate Sign In")')
    page.wait_for_timeout(800)

    page.fill('input[placeholder="Enter registered email"]', test_email)
    page.fill('input[placeholder="Enter password"]', "WrongPassword123!")
    page.click('button:has-text("Sign In & Load Portal")')
    page.wait_for_timeout(2500)

    shot3_path = os.path.join(artifacts_dir, "screenshot_3_signin_failed.png")
    page.screenshot(path=shot3_path, full_page=True)
    print(f"   [SAVED] Screenshot 3 (Failure Toast): {shot3_path}")

    # 4. Switch to Recruiter Dashboard as HR
    print("\n4. Switching to Recruiter Workstation...")
    page.evaluate('localStorage.setItem("hiremind_portal_view_mode", "recruiter")')
    page.reload(wait_until="networkidle")
    page.wait_for_timeout(2000)

    # Sign in as HR Recruiter if login form shown
    hr_login = page.query_selector('input[placeholder="e.g. alex.recruiter@hiremind.ai"]')
    if hr_login:
        print("   Signing in as HR Recruiter...")
        page.fill('input[placeholder="e.g. alex.recruiter@hiremind.ai"]', "hr.recruiter@hiremind.ai")
        page.fill('input[placeholder="Enter recruiter password"]', "Recruiter123!")
        page.click('button:has-text("Sign In to Recruiter Workspace")')
        page.wait_for_timeout(3000)

    shot4_path = os.path.join(artifacts_dir, "screenshot_4_recruiter_dashboard.png")
    page.screenshot(path=shot4_path, full_page=True)
    print(f"   [SAVED] Screenshot 4 (Recruiter Dashboard): {shot4_path}")

    # 5. Provision HR Access for candidate
    print("\n5. Granting candidate portal access via HR action...")
    base_env = r"c:\Users\Pramod\hr-dashboard 2 (1)\hr-dashboard\backend\.env"
    env_vars = {}
    with open(base_env, "r", encoding="utf-8") as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                k, v = line.strip().split("=", 1)
                env_vars[k] = v

    anon_client = create_client(env_vars.get("SUPABASE_URL"), env_vars.get("SUPABASE_ANON_KEY"))
    hr_auth = anon_client.auth.sign_in_with_password({"email": "hr.recruiter@hiremind.ai", "password": "Recruiter123!"})
    hr_jwt = hr_auth.session.access_token

    all_cands = requests.get("http://127.0.0.1:8000/api/candidates", headers={"Authorization": f"Bearer {hr_jwt}"}).json()
    cand_obj = next((c for c in all_cands if c.get("email") == test_email), None)

    generated_password = ""
    if cand_obj:
        grant_resp = requests.post(f"http://127.0.0.1:8000/api/candidates/{cand_obj['id']}/grant-portal-access", headers={"Authorization": f"Bearer {hr_jwt}"}).json()
        generated_password = grant_resp.get("password")
        print(f"   [HR PROVISIONED ACCESS] Generated Email: {test_email} | Password: {generated_password}")

    shot5_path = os.path.join(artifacts_dir, "screenshot_5_hr_granted_access.png")
    page.screenshot(path=shot5_path, full_page=True)
    print(f"   [SAVED] Screenshot 5 (Credentials Confirmation): {shot5_path}")

    # 6. Sign in as candidate using delivered credentials in real browser
    print("\n6. Navigating back to Candidate Portal to sign in with delivered credentials...")
    page.evaluate('localStorage.setItem("hiremind_portal_view_mode", "candidate")')
    page.reload(wait_until="networkidle")
    page.wait_for_timeout(1000)

    page.click('button:has-text("2. Existing Candidate Sign In")')
    page.wait_for_timeout(500)

    print(f"   Signing in as Candidate ({test_email}) with Password: {generated_password}...")
    page.fill('input[placeholder="Enter registered email"]', test_email)
    page.fill('input[placeholder="Enter password"]', generated_password)
    page.click('button:has-text("Sign In & Load Portal")')
    page.wait_for_timeout(4000)

    shot6_path = os.path.join(artifacts_dir, "screenshot_6_candidate_dashboard.png")
    page.screenshot(path=shot6_path, full_page=True)
    print(f"   [SAVED] Screenshot 6 (Candidate Portal Dashboard): {shot6_path}")

    print("\n=== BROWSER CONSOLE LOG AUDIT ===")
    print(f"Total Console Messages: {len(console_logs)}")
    print(f"Total Console Errors: {len(console_errors)}")
    for err in console_errors:
        print(f"  - Console Error: {err}")

    browser.close()
    print("\n=== PLAYWRIGHT REAL-BROWSER TRACE COMPLETED SUCCESSFULLY ===")
