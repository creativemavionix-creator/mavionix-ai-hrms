import os
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\Pramod\.gemini\antigravity\brain\97df1c93-a4e2-499b-88c6-fc2d00203691"
cand_email = "palakarora1623@gmail.com"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1400, "height": 900})
    page = context.new_page()

    page.goto("http://127.0.0.1:3000")
    page.evaluate('localStorage.setItem("hiremind_portal_view_mode", "candidate")')
    page.reload()
    page.wait_for_load_state("networkidle")

    if page.is_visible('input[placeholder="Enter registered email"]'):
        page.fill('input[placeholder="Enter registered email"]', cand_email)
        page.fill('input[placeholder="Enter password"]', "Recruiter123!")
        page.click('button:has-text("Sign In & Load Portal")')
        page.wait_for_load_state("networkidle")

    page.wait_for_selector('text="SUBMITTED DELIVERABLES:"', timeout=15000)
    shot_path = os.path.join(ARTIFACT_DIR, "screenshot_candidate_submitted_github_link.png")
    page.screenshot(path=shot_path, full_page=True)
    print("SUCCESS! Saved screenshot to:", shot_path)
    browser.close()
