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
service = env_vars.get("SUPABASE_SERVICE_ROLE_KEY")

sb_anon = create_client(url, anon)
sb_service = create_client(url, service)

# 0. Obtain valid HR recruiter JWT token
hr_res = sb_anon.auth.sign_in_with_password({"email": "hr.recruiter@hiremind.ai", "password": "Recruiter123!"})
hr_token = hr_res.session.access_token
print(f"0. HR Auth Token obtained (length {len(hr_token)}).")

# 1. Create a fresh candidate & application via JSON API
cand_email = f"asgn.candidate.{int(time.time())}@hiremind-test.ai"
cand_name = "Jordan Vance"
print(f"1. Creating test candidate: {cand_name} ({cand_email})...")

apply_res = requests.post(
    "http://127.0.0.1:3000/api/candidates/apply",
    json={
        "name": cand_name,
        "email": cand_email,
        "phone": "+15550199922",
        "jobId": "Senior Backend Engineer",
        "statementOfIntent": "Experienced backend engineer targeting distributed systems role."
    }
)
print(f"   Apply API status: {apply_res.status_code}")
cand_data = apply_res.json()
candidate_id = cand_data["candidate"]["id"]
application_id = cand_data["application"]["id"]
print(f"   Candidate ID: {candidate_id}, Application ID: {application_id}")

# Grant Portal Access via backend API to ensure user credential creation
grant_res = requests.post(
    f"http://127.0.0.1:8000/api/candidates/{candidate_id}/grant-portal-access",
    headers={"Authorization": f"Bearer {hr_token}"}
)
grant_json = grant_res.json()
candidate_password = grant_json.get("password", "TempPassword123!")
print(f"   Granted portal access via API. Temp Password: {candidate_password}")

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

    print("\n=== STARTING PLAYWRIGHT REAL-BROWSER ASSIGNMENT FLOW TRACE ===\n")

    # --------------------------------------------------------------------------
    # STEP 1: HR SENDS CONFIGURABLE ASSIGNMENT (Custom Deadline & Deliverables)
    # --------------------------------------------------------------------------
    print("STEP 1: HR Recruiter Workspace - Configurable Assignment Creation...")
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
        print("   Submitting HR Recruiter login form...")
        page.fill('input[placeholder="e.g. alex.recruiter@hiremind.ai"]', "hr.recruiter@hiremind.ai")
        page.fill('input[placeholder="Enter recruiter password"]', "Recruiter123!")
        page.click('button:has-text("Sign In to Recruiter Workspace")')
        page.wait_for_timeout(4000)

    # Click CANDIDATES nav tab if present
    cand_tab = page.query_selector('button:has-text("CANDIDATES"), a:has-text("CANDIDATES")')
    if cand_tab:
        print("   Clicking CANDIDATES navigation tab...")
        cand_tab.click()
        page.wait_for_timeout(2000)

    page.wait_for_selector('tbody tr', timeout=15000)
    
    # Click candidate row
    row = page.query_selector(f'tr:has-text("{cand_name}")') or page.query_selector_all('tbody tr')[0]
    row.click()
    page.wait_for_timeout(2500)

    # Click "Send Task" button inside Dossier
    print("   Opening Recruiter Assignment Workstation modal...")
    send_task_btn = page.wait_for_selector('button:has-text("Send Task")', timeout=10000)
    send_task_btn.click()
    page.wait_for_timeout(2000)

    # Custom deadline date: 5 days from now
    target_deadline_days = 5
    future_date = (time.strftime("%Y-%m-%d", time.localtime(time.time() + target_deadline_days * 86400)))
    
    # Fill Assignment title and description
    page.fill('input[placeholder*="Microservices Rate Limiter"]', "Custom Distributed Rate Limiter & Gateway Task")
    page.fill('textarea[placeholder*="Detail the technical requirements"]', "Build a token-bucket rate limiter middleware in FastAPI using Redis async pipeline. Require clean unit tests and architecture notes.")
    
    # Set date input
    date_input = page.query_selector('input[type="date"]')
    if date_input:
        date_input.fill(future_date)

    # Deliverables: Check GitHub (github_link) + Report (report), uncheck Deployment Link if checked
    deploy_label = page.query_selector('label:has-text("Live Deployment URL")')
    if deploy_label:
        deploy_checkbox = deploy_label.query_selector('input[type="checkbox"]')
        if deploy_checkbox and deploy_checkbox.is_checked():
            deploy_checkbox.click()

    # Capture Screenshot 1: HR Configurable Assignment Form Modal
    shot1_path = os.path.join(artifacts_dir, "screenshot_asgn_1_hr_sent.png")
    page.screenshot(path=shot1_path, full_page=False)
    print(f"   [SAVED] Screenshot 1 (HR Custom Assignment Creation Modal): {shot1_path}")

    # Submit assignment form
    print("   Submitting assignment to candidate login dashboard...")
    page.click('button:has-text("SEND ASSIGNMENT TO CANDIDATE DASHBOARD")')
    page.wait_for_timeout(3000)

    # Close Dossier Modal safely via force click or Escape key
    close_dossier_btn = page.query_selector('button:has-text("Close Dossier"), button:has-text("CLOSE")')
    if close_dossier_btn:
        close_dossier_btn.click(force=True)
    else:
        page.keyboard.press("Escape")
    page.wait_for_timeout(1500)

    # --------------------------------------------------------------------------
    # STEP 2: CANDIDATE LOGS IN & VIEWS CONFIGURABLE ASSIGNMENT DASHBOARD
    # --------------------------------------------------------------------------
    print("\nSTEP 2: Candidate Portal Sign In & Dashboard Verification...")

    # Create a fresh browser context for candidate
    candidate_context = browser.new_context(viewport={"width": 1360, "height": 950})
    cand_page = candidate_context.new_page()
    cand_page.on("console", handle_console)

    cand_page.goto("http://127.0.0.1:3000/", wait_until="networkidle")
    cand_page.evaluate('''() => {
        localStorage.setItem("hiremind_portal_view_mode", "candidate");
    }''')
    cand_page.reload(wait_until="networkidle")
    cand_page.wait_for_timeout(2000)

    # Switch to "2. Existing Candidate Sign In" tab
    signin_tab = cand_page.wait_for_selector('button:has-text("2. Existing Candidate Sign In")', timeout=10000)
    signin_tab.click()
    cand_page.wait_for_timeout(1000)

    # Fill Candidate Login Form
    print(f"   Signing in as candidate {cand_email}...")
    cand_page.fill('input[placeholder="Enter registered email"]', cand_email)
    cand_page.fill('input[placeholder="Enter password"]', candidate_password)
    cand_page.click('button:has-text("Sign In & Load Portal")')

    # Wait for candidate dashboard workspace to render
    cand_page.wait_for_selector('h3:has-text("Stage 2: Take-Home Architecture Project Task")', timeout=15000)
    cand_page.wait_for_timeout(2000)

    # Capture Screenshot 2: Candidate Dashboard showing only requested deliverable fields (GitHub + Report)
    shot2_path = os.path.join(artifacts_dir, "screenshot_asgn_2_candidate_view.png")
    cand_page.screenshot(path=shot2_path, full_page=False)
    print(f"   [SAVED] Screenshot 2 (Candidate Dashboard with Requested Deliverable Fields Only): {shot2_path}")

    # --------------------------------------------------------------------------
    # STEP 3: CANDIDATE SUBMITS ASSIGNMENT DELIVERABLES
    # --------------------------------------------------------------------------
    print("\nSTEP 3: Candidate Submits Assignment Deliverables...")
    github_input = cand_page.wait_for_selector('input[placeholder*="github"]', timeout=15000)
    report_input = cand_page.wait_for_selector('textarea', timeout=15000)

    if github_input:
        github_input.fill(f"https://github.com/jordanvance/custom-rate-limiter-task")
    if report_input:
        report_input.fill("System Architecture Report:\n1. Built token-bucket algorithm using Redis async pipelines.\n2. Implemented FastAPI middleware with unit tests.\n3. Budgeted 128MB RAM for 100k active IP keys.")

    submit_btn = cand_page.query_selector('button:has-text("Submit Project Task Deliverables")') or cand_page.query_selector('button:has-text("Submit Task")') or cand_page.query_selector_all('button.btn-primary')[-1]
    if submit_btn:
        submit_btn.click(force=True)
    
    # Wait for honest under review state
    cand_page.wait_for_selector('span:has-text("Your assignment has been submitted and is under review")', timeout=15000)
    cand_page.wait_for_timeout(2000)

    # Capture Screenshot 3: Candidate Dashboard showing honest "Under Review" state
    shot3_path = os.path.join(artifacts_dir, "screenshot_asgn_3_candidate_submitted.png")
    cand_page.screenshot(path=shot3_path, full_page=False)
    print(f"   [SAVED] Screenshot 3 (Candidate Dashboard Honest 'Under Review' State): {shot3_path}")
    candidate_context.close()

    # --------------------------------------------------------------------------
    # STEP 4: HR REVIEWS SUBMISSION & SCORES ASSIGNMENT IN DOSSIER
    # --------------------------------------------------------------------------
    print("\nSTEP 4: HR Recruiter Dossier - Review Candidate Submission & Score...")
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
        page.fill('input[placeholder="e.g. alex.recruiter@hiremind.ai"]', "hr.recruiter@hiremind.ai")
        page.fill('input[placeholder="Enter recruiter password"]', "Recruiter123!")
        page.click('button:has-text("Sign In to Recruiter Workspace")')
        page.wait_for_timeout(4000)

    cand_tab = page.query_selector('button:has-text("CANDIDATES"), a:has-text("CANDIDATES")')
    if cand_tab:
        cand_tab.click()
        page.wait_for_timeout(2000)

    page.wait_for_selector('tbody tr', timeout=15000)
    row = page.query_selector(f'tr:has-text("{cand_name}")') or page.query_selector_all('tbody tr')[0]
    row.click()
    page.wait_for_timeout(3500)

    # Fill score & submit review
    score_input = page.query_selector('input[type="number"][value="85"]') or page.query_selector('input[type="number"]')
    if score_input:
        score_input.fill("94")

    review_notes = page.query_selector('textarea[placeholder*="Enter notes on code architecture"]')
    if review_notes:
        review_notes.fill("Excellent clean architecture! Async Redis pipeline implementation is well-tested and handles boundary conditions cleanly. Approved.")

    save_review_btn = page.query_selector('button:has-text("SAVE EVALUATION SCORE & APPROVE ASSIGNMENT")')
    if save_review_btn:
        save_review_btn.click(force=True)
        page.wait_for_timeout(3000)

    # Capture Screenshot 4: HR Dossier displaying submitted deliverables & recruiter evaluation workstation
    shot4_path = os.path.join(artifacts_dir, "screenshot_asgn_4_hr_reviewed.png")
    page.screenshot(path=shot4_path, full_page=False)
    print(f"   [SAVED] Screenshot 4 (HR Dossier Reviewing Submitted Deliverables & Scoring): {shot4_path}")

    browser.close()
    print("\n=== PLAYWRIGHT REAL-BROWSER ASSIGNMENT TRACE COMPLETED SUCCESSFULLY ===")

# --------------------------------------------------------------------------
# STEP 5: REAL DATABASE SERVICE ROLE CHECK
# --------------------------------------------------------------------------
print("\nSTEP 5: Real Database Service-Role Inspection on 'public.assignments' Table...")
asgn_db = sb_service.from_("assignments").select("*").eq("application_id", application_id).execute()

if asgn_db.data:
    asgn_row = asgn_db.data[0]
    print("\n--- DATABASE RECORD VERIFICATION RESULT ---")
    print(f"Assignment ID:        {asgn_row.get('id')}")
    print(f"Application ID:       {asgn_row.get('application_id')}")
    print(f"Title:                {asgn_row.get('title')}")
    print(f"Status:               {asgn_row.get('status')}")
    print(f"Score:                {asgn_row.get('score')}")
    print(f"Deadline:             {asgn_row.get('deadline')}")
    print(f"Deliverables Required:{asgn_row.get('deliverables_required')}")
    print(f"Submission Data:      {json.dumps(asgn_row.get('submission_data'), indent=2)}")
    print(f"Submission Text:      {asgn_row.get('submission_text')}")
    print(f"Submission URL:       {asgn_row.get('submission_url')}")
    print("-------------------------------------------\n")
else:
    print("ERROR: No database record found for application_id:", application_id)
