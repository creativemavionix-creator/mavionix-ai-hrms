import os
import time
import requests
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\Pramod\.gemini\antigravity\brain\97df1c93-a4e2-499b-88c6-fc2d00203691"

cand_name = "Realtime Test Applicant"
cand_email = f"realtime.{int(time.time())}@example.com"

print("1. Submitting new candidate application via API with required fields...")
apply_res = requests.post("http://127.0.0.1:3000/api/candidates/apply", json={
    "name": cand_name,
    "email": cand_email,
    "position": "Senior Fullstack Engineer",
    "jobId": "Senior Fullstack Engineer",
    "statementOfIntent": "Super passionate about AI and recruitment systems."
})

print("   Apply response status:", apply_res.status_code)
print("   Apply response data:", apply_res.json())

print("\n2. Launching browser as HR Recruiter to verify candidate appearance on portal...")
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1400, "height": 900})
    page = context.new_page()

    page.goto("http://127.0.0.1:3000")
    page.evaluate('localStorage.setItem("hiremind_portal_view_mode", "recruiter")')
    page.reload()
    page.wait_for_load_state("networkidle")

    # Sign in as HR Recruiter
    print("   Signing in as HR Recruiter...")
    page.fill('input[placeholder="e.g. alex.recruiter@hiremind.ai"]', "hr.recruiter@hiremind.ai")
    page.fill('input[placeholder="Enter recruiter password"]', "Recruiter123!")
    page.click('button:has-text("Sign In to Recruiter Workspace")')
    page.wait_for_selector('h1:has-text("HIREMIND AI")', timeout=15000)

    # Click CANDIDATES tab
    page.click('button:has-text("CANDIDATES")')
    page.wait_for_selector('h1:has-text("CANDIDATE")', timeout=15000)

    # Check if newly applied candidate appears in table
    is_cand_visible = page.is_visible(f'text="{cand_name}"')
    print(f"   [SUCCESS] Candidate '{cand_name}' visible in Recruiter Table:", is_cand_visible)

    screenshot_path = os.path.join(ARTIFACT_DIR, "screenshot_candidate_appeared_in_recruiter.png")
    page.screenshot(path=screenshot_path, full_page=True)
    print("   Saved screenshot to:", screenshot_path)

    browser.close()
