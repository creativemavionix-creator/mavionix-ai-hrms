import os
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

sb = create_client(env_vars['SUPABASE_URL'], env_vars['SUPABASE_SERVICE_ROLE_KEY'])

# 1. Fetch Candidate & Reset Password so we can log in cleanly
cand = sb.table("candidates").select("*").ilike("name", "%Sanchali%").execute().data[0]
cand_id = cand["id"]

# Grant fresh portal access / password
res = requests.post(f"http://127.0.0.1:8000/api/candidates/{cand_id}/grant-portal-access", 
    headers={"Authorization": "Bearer demo-token"},
    json={}
).json()
new_password = res.get("password", "CandidatePass123!")
print("Granted clean portal access for Sanchali Arora. Password:", new_password)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1400, "height": 900})
    page = context.new_page()

    page.goto("http://127.0.0.1:3000")
    page.evaluate('localStorage.clear()')
    page.evaluate('localStorage.setItem("hiremind_portal_view_mode", "candidate")')
    page.reload()
    page.wait_for_load_state("networkidle")

    # Sign in as candidate
    page.fill('input[placeholder="Enter registered email"]', cand["email"])
    page.fill('input[placeholder="Enter password"]', new_password)
    page.click('button:has-text("Sign In & Load Portal")')
    page.wait_for_load_state("networkidle")

    page.wait_for_selector('text="SUBMITTED DELIVERABLES:"', timeout=15000)
    shot_path = os.path.join(ARTIFACT_DIR, "screenshot_candidate_submitted_github_link.png")
    page.screenshot(path=shot_path, full_page=True)
    print("SUCCESS! Saved screenshot to:", shot_path)
    browser.close()
