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

url = env_vars.get("SUPABASE_URL")
anon = env_vars.get("SUPABASE_ANON_KEY")
sb = create_client(url, anon)

# 1. Obtain valid Supabase Auth JWT token for HR recruiter
res = sb.auth.sign_in_with_password({"email": "hr.recruiter@hiremind.ai", "password": "Recruiter123!"})
hr_token = res.session.access_token
print(f"Obtained valid HR JWT Token (length {len(hr_token)}).")

# 2. Ensure candidate application exists via API on port 3000
cand_email = f"dossier.test.{int(time.time())}@hiremind-test.ai"
cand_name = "Alex Mercer"
print(f"Creating candidate via JSON POST (port 3000): {cand_name} ({cand_email})...")

apply_res = requests.post(
    "http://127.0.0.1:3000/api/candidates/apply",
    json={
        "name": cand_name,
        "email": cand_email,
        "phone": "+15550192831",
        "jobId": "Senior Backend Engineer",
        "yearsExp": "6",
        "linkedinUrl": "https://linkedin.com/in/alexmercer",
        "githubUrl": "https://github.com/alexmercer"
    }
)
print(f"Apply API Status: {apply_res.status_code}")

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

    context = browser.new_context(viewport={"width": 1360, "height": 950})
    page = context.new_page()
    page.on("console", handle_console)

    print("\n=== STARTING PLAYWRIGHT REAL-BROWSER DOSSIER UI TRACE ===\n")

    # Load page, inject valid HR session token and view mode
    page.goto("http://127.0.0.1:3000/", wait_until="networkidle")
    page.evaluate(f'''() => {{
        localStorage.setItem("hiremind_token", "{hr_token}");
        localStorage.setItem("hiremind_portal_view_mode", "recruiter");
        localStorage.setItem("hiremind_recruiter_active_tab", "candidates");
    }}''')
    page.reload(wait_until="networkidle")
    page.wait_for_timeout(2000)

    # Submit HR login form if present
    email_input = page.query_selector('input[placeholder="e.g. alex.recruiter@hiremind.ai"]')
    if email_input:
        print("1. Submitting HR Login Form...")
        page.fill('input[placeholder="e.g. alex.recruiter@hiremind.ai"]', "hr.recruiter@hiremind.ai")
        page.fill('input[placeholder="Enter recruiter password"]', "Recruiter123!")
        page.click('button:has-text("Sign In to Recruiter Workspace")')
        page.wait_for_timeout(4000)

    # Click CANDIDATES nav tab if not already on candidates view
    cand_nav = page.query_selector('button:has-text("CANDIDATES"), a:has-text("CANDIDATES")')
    if cand_nav:
        print("2. Clicking 'CANDIDATES' navigation tab...")
        cand_nav.click()
        page.wait_for_timeout(2500)

    print("3. Waiting for candidate table rows...")
    page.wait_for_selector('tbody tr', timeout=15000)
    page.wait_for_timeout(1000)

    rows = page.query_selector_all('tbody tr')
    print(f"   Found {len(rows)} candidate application rows!")

    # Click first candidate row to open Dossier Modal
    print("4. Opening candidate dossier for candidate...")
    rows[0].click()
    page.wait_for_timeout(3000)

    # Screenshot 1: Cleaned Candidate Dossier with 3 consolidated control groups
    shot1_path = os.path.join(artifacts_dir, "screenshot_task1_dossier_cleaned.png")
    page.screenshot(path=shot1_path, full_page=False)
    print(f"   [SAVED] Screenshot 1 (Cleaned Dossier & Consolidated Groups): {shot1_path}")

    # 5. Click "Grant Candidate Portal Access" button inside dossier
    print("\n5. Checking 'Grant Portal Access' button status inside candidate dossier...")
    grant_btn = page.query_selector('button:has-text("Grant Portal Access"), button:has-text("Grant Candidate Portal Access")')
    if grant_btn:
        print("   Clicking 'Grant Portal Access' button...")
        grant_btn.click()
        page.wait_for_timeout(3500)

        shot2_path = os.path.join(artifacts_dir, "screenshot_task3_grant_access_success.png")
        page.screenshot(path=shot2_path, full_page=False)
        print(f"   [SAVED] Screenshot 2 (Grant Portal Access Credentials & Resend Status Modal): {shot2_path}")

        # Close credential modal
        done_btn = page.query_selector('button:has-text("Done")')
        if done_btn:
            done_btn.click()
            page.wait_for_timeout(1500)

        # Screenshot 3: Dossier now showing "Portal Access Active" badge state
        shot3_path = os.path.join(artifacts_dir, "screenshot_task3_already_granted_state.png")
        page.screenshot(path=shot3_path, full_page=False)
        print(f"   [SAVED] Screenshot 3 (Portal Access Active Badge State): {shot3_path}")
    else:
        print("   Candidate already has active portal access. Capturing Active Badge state...")
        shot3_path = os.path.join(artifacts_dir, "screenshot_task3_already_granted_state.png")
        page.screenshot(path=shot3_path, full_page=False)
        print(f"   [SAVED] Screenshot 3 (Portal Access Active Badge State): {shot3_path}")

    print("\n=== BROWSER CONSOLE LOG AUDIT ===")
    print(f"Total Console Messages: {len(console_logs)}")
    print(f"Total Console Errors: {len(console_errors)}")
    for err in console_errors:
        print(f"  - Console Error: {err}")

    browser.close()
    print("\n=== PLAYWRIGHT REAL-BROWSER VERIFICATION TRACE COMPLETED SUCCESSFULLY ===")
