import os
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\Pramod\.gemini\antigravity\brain\97df1c93-a4e2-499b-88c6-fc2d00203691"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    
    # 1. Capture AssignProjectModal in Recruiter Workspace
    context1 = browser.new_context(viewport={"width": 1400, "height": 900})
    page1 = context1.new_page()
    page1.goto("http://127.0.0.1:3000")
    page1.evaluate('localStorage.setItem("hiremind_portal_view_mode", "recruiter")')
    page1.reload()
    page1.wait_for_load_state("networkidle")

    page1.fill('input[placeholder="e.g. alex.recruiter@hiremind.ai"]', "hr.recruiter@hiremind.ai")
    page1.fill('input[placeholder="Enter recruiter password"]', "Recruiter123!")
    page1.click('button:has-text("Sign In to Recruiter Workspace")')
    page1.wait_for_selector('h1:has-text("HIREMIND AI")', timeout=15000)

    page1.click('button:has-text("CANDIDATES")')
    page1.wait_for_selector('h1:has-text("CANDIDATE")', timeout=15000)

    # Click first VIEW DOSSIER button
    page1.click('button:has-text("VIEW DOSSIER")')
    page1.wait_for_selector('button:has-text("Send Task")', timeout=10000)

    # Click Send Task inside dossier modal
    page1.click('button:has-text("Send Task")')
    page1.wait_for_selector('text="RECRUITER TASK ASSIGNMENT WORKSTATION"', timeout=10000)

    # Click +5 Days preset button
    page1.click('button:has-text("+5 Days")')
    page1.wait_for_timeout(500)

    modal_shot_path = os.path.join(ARTIFACT_DIR, "screenshot_assign_modal_high_contrast.png")
    page1.screenshot(path=modal_shot_path, full_page=True)
    print("Assign Modal Screenshot saved to:", modal_shot_path)

    browser.close()
