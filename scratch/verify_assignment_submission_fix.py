import os
import time
import requests
from supabase import create_client
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\Pramod\.gemini\antigravity\brain\97df1c93-a4e2-499b-88c6-fc2d00203691"

base_env = r'backend/.env'
env_vars = {}
with open(base_env, 'r', encoding='utf-8') as f:
    for line in f:
        if '=' in line and not line.startswith('#'):
            k, v = line.strip().split('=', 1)
            env_vars[k] = v

sb = create_client(env_vars['SUPABASE_URL'], env_vars['SUPABASE_ANON_KEY'])
hr_res = sb.auth.sign_in_with_password({'email': 'hr.recruiter@hiremind.ai', 'password': 'Recruiter123!'})
hr_token = hr_res.session.access_token

cand_email = f"asgn.submit.{int(time.time())}@example.com"
cand_name = "Assignment Submit Candidate"

# 1. Register Candidate
app_res = requests.post("http://127.0.0.1:3000/api/candidates/apply", json={
    "name": cand_name,
    "email": cand_email,
    "position": "Senior Backend Engineer",
    "jobId": "Senior Backend Engineer",
    "statementOfIntent": "Testing assignment submission end-to-end."
}).json()

cand_id = app_res["candidate"]["id"]
app_id = app_res["application"]["id"]

# 2. Assign Project Task via backend
asgn_res = requests.post(f"http://127.0.0.1:8000/api/applications/{app_id}/assignments", 
    headers={"Authorization": f"Bearer {hr_token}"},
    json={
        "title": "Distributed Microservices Rate Limiter & Async Router",
        "description": "Implement a high-throughput token bucket rate limiter middleware in Python FastAPI backed by Redis async pipelines.",
        "requirements": "Implement a high-throughput token bucket rate limiter middleware in Python FastAPI backed by Redis async pipelines.",
        "deadline_date": "2026-08-25T23:59:59Z",
        "deliverables_required": ["github_link", "report"]
    }
).json()

# 3. Grant Portal Access via backend port 8000
grant_res = requests.post(f"http://127.0.0.1:8000/api/candidates/{cand_id}/grant-portal-access", 
    headers={"Authorization": f"Bearer {hr_token}"},
    json={}
).json()
password = grant_res["password"]

print("Logging in candidate in real browser:", cand_email)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1400, "height": 900})
    page = context.new_page()

    page.goto("http://127.0.0.1:3000")
    page.evaluate('localStorage.setItem("hiremind_portal_view_mode", "candidate")')
    page.reload()
    page.wait_for_load_state("networkidle")

    # Sign in
    page.fill('input[placeholder="Enter registered email"]', cand_email)
    page.fill('input[placeholder="Enter password"]', password)
    page.click('button:has-text("Sign In & Load Portal")')
    page.wait_for_selector('h4:has-text("Distributed Microservices")', timeout=15000)

    # Fill in GitHub repo & notes
    page.fill('input[placeholder="https://github.com/yourusername/take-home-project"]', "https://github.com/test/microservices-rate-limiter")
    page.fill('textarea[placeholder="Detail your system design choices, architecture trade-offs, and instructions to run..."]', "Implemented Redis async pipeline rate limiter with token bucket algorithm.")

    # Click Submit
    page.click('button:has-text("Submit Project Task Deliverables")')

    # Wait for success toast / submitted state
    page.wait_for_selector('text="Your assignment has been submitted and is under review"', timeout=15000)
    print("SUCCESS: Assignment submitted and verified in candidate UI!")

    shot_path = os.path.join(ARTIFACT_DIR, "screenshot_assignment_submitted_success.png")
    page.screenshot(path=shot_path, full_page=True)
    print("Saved success screenshot to:", shot_path)

    browser.close()
