import os
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\Pramod\.gemini\antigravity\brain\97df1c93-a4e2-499b-88c6-fc2d00203691"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1400, "height": 900})
    page.goto("http://127.0.0.1:3000")
    page.evaluate('localStorage.setItem("hiremind_portal_view_mode", "recruiter")')
    page.reload()
    page.wait_for_load_state("networkidle")
    
    screenshot_path = os.path.join(ARTIFACT_DIR, "screenshot_clean_recruiter_gate.png")
    page.screenshot(path=screenshot_path, full_page=True)
    print("Screenshot saved to:", screenshot_path)
    browser.close()
