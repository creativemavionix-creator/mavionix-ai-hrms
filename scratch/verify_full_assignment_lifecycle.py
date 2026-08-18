import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\Pramod\.gemini\antigravity\brain\97df1c93-a4e2-499b-88c6-fc2d00203691"

cand_email = "palakarora1623@gmail.com"

print("Running full assignment lifecycle verification in Playwright browser...")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1400, "height": 900})
    page = context.new_page()

    # Step 1: Candidate Portal - Submit Deliverables
    page.goto("http://127.0.0.1:3000")
    page.evaluate('localStorage.setItem("hiremind_portal_view_mode", "candidate")')
    page.reload()
    page.wait_for_load_state("networkidle")

    # Enter email & sign in
    page.fill('input[placeholder="Enter registered email"]', cand_email)
    page.fill('input[placeholder="Enter password"]', "Recruiter123!") # or grant password if saved
    page.click('button:has-text("Sign In & Load Portal")')
    
    # Wait for dashboard load
    page.wait_for_selector('h4:has-text("DISTRIBUTED MICROSERVICES")', timeout=15000)

    # Fill deliverables
    page.fill('input[placeholder="https://github.com/yourusername/take-home-project"]', "https://github.com/palak-in-progresss/Lyra-the-chatbot")
    page.fill('textarea[placeholder="Detail your system design choices, architecture trade-offs, and instructions to run..."]', "Lyra chatbot implementation with FastAPI and LangChain.")

    # Submit
    page.click('button:has-text("Submit Project Task Deliverables")')
    page.wait_for_selector('text="Your assignment has been submitted and is under review"', timeout=15000)
    print("STEP 1 SUCCESS: Candidate submitted deliverables on candidate portal!")

    # Step 2: Recruiter Portal - Open Dossier & Review
    page.evaluate('localStorage.setItem("hiremind_portal_view_mode", "recruiter")')
    page.reload()
    page.wait_for_load_state("networkidle")

    # Navigate to Candidates view
    page.click('button:has-text("Candidates"), div:has-text("CANDIDATES")')
    page.wait_for_selector('text="Sanchali Arora"', timeout=15000)

    # Click on Sanchali Arora to open dossier
    page.click('td:has-text("Sanchali Arora")')
    page.wait_for_selector('text="CANDIDATE SUBMITTED DELIVERABLES"', timeout=15000)

    print("STEP 2 SUCCESS: Recruiter opened Dossier and verified submitted deliverables!")
    shot1 = os.path.join(ARTIFACT_DIR, "screenshot_dossier_submitted_deliverables.png")
    page.screenshot(path=shot1, full_page=True)

    # Click Approve & Advance to Tech Round
    page.click('button:has-text("APPROVE & ADVANCE TO TECH ROUND")')
    page.wait_for_selector('text="Assignment approved"', timeout=15000)
    print("STEP 3 SUCCESS: Recruiter approved assignment and advanced stage to tech_round!")

    # Step 3: Candidate Portal - Verify Congrats & Next Round Banner
    page.evaluate('localStorage.setItem("hiremind_portal_view_mode", "candidate")')
    page.reload()
    page.wait_for_load_state("networkidle")

    page.wait_for_selector('text="CONGRATULATIONS! ASSIGNMENT APPROVED"', timeout=15000)
    print("STEP 4 SUCCESS: Candidate portal verified congrats banner & Launch AI Interview button!")

    shot2 = os.path.join(ARTIFACT_DIR, "screenshot_candidate_approved_congrats.png")
    page.screenshot(path=shot2, full_page=True)
    print("Saved final screenshot to:", shot2)

    browser.close()
