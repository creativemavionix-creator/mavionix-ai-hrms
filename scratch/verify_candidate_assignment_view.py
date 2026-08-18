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

cand_email = f"asgn.view.{int(time.time())}@example.com"
cand_name = "Assignment UI Contrast Candidate"

# 1. Register Candidate
app_res = requests.post("http://127.0.0.1:3000/api/candidates/apply", json={
    "name": cand_name,
    "email": cand_email,
    "position": "Senior Backend Engineer",
    "jobId": "Senior Backend Engineer",
    "statementOfIntent": "Testing high contrast assignment UI."
}).json()

cand_id = app_res["candidate"]["id"]
app_id = app_res["application"]["id"]

# 2. Assign Project Task via backend port 8000 with HR Token
asgn_res = requests.post(f"http://127.0.0.1:8000/api/applications/{app_id}/assignments", 
    headers={"Authorization": f"Bearer {hr_token}"},
    json={
        "title": "Distributed Microservices Rate Limiter & Async Router",
        "description": "Implement a high-throughput token bucket rate limiter middleware in Python FastAPI backed by Redis async pipelines. Include Docker Compose setup and documentation.",
        "requirements": "Implement a high-throughput token bucket rate limiter middleware in Python FastAPI backed by Redis async pipelines.",
        "deadline_date": "2026-08-25T23:59:59Z",
        "deliverables_required": ["github_link", "deployment_link", "report"]
    }
).json()
print("Assignment Created:", asgn_res)

# 3. Grant Portal Access
grant_res = requests.post(f"http://127.0.0.1:3000/api/candidates/{cand_id}/grant-portal-access", json={}).json()
password = grant_res["password"]

print("Logging in candidate:", cand_email)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1400, "height": 900})
    page = context.new_page()

    page.goto("http://127.0.0.1:3000")
    page.evaluate('localStorage.setItem("hiremind_portal_view_mode", "candidate")')
    page.reload()
    page.wait_for_load_state("networkidle")

    # Sign in
    page.fill('input[placeholder="name@company.com"]', cand_email)
    page.fill('input[placeholder="••••••••••••"]', password)
    page.click('button:has-text("Sign In to Portal")')
    page.wait_for_selector('h3:has-text("Stage 2: Take-Home Architecture Project Task")', timeout=15000)

    shot_path = os.path.join(ARTIFACT_DIR, "screenshot_candidate_assignment_dark_contrast.png")
    page.screenshot(path=shot_path, full_page=True)
    print("Candidate Assignment View screenshot saved to:", shot_path)

    browser.close()
