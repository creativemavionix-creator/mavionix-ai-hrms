import os
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\Pramod\.gemini\antigravity\brain\97df1c93-a4e2-499b-88c6-fc2d00203691"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1400, "height": 900})
    page = context.new_page()

    page.goto("http://127.0.0.1:3001/interview?token=demo")
    page.wait_for_load_state("networkidle")

    # Take screenshot of the interview portal entry
    shot_path = os.path.join(ARTIFACT_DIR, "screenshot_interview_room_no_assignment.png")
    page.screenshot(path=shot_path, full_page=True)
    print("SUCCESS! Saved clean interview room screenshot to:", shot_path)
    browser.close()
