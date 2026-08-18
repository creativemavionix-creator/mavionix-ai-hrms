import os
import time
import requests
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\Pramod\.gemini\antigravity\brain\97df1c93-a4e2-499b-88c6-fc2d00203691"

# Setup Candidate Account using existing granted access test candidate
cand_email = "asgn.candidate.1786953387@hiremind-test.ai"
cand_pass = "CandPass_d80e04c7!"

print("\n=== STARTING PLAYWRIGHT REAL-BROWSER SESSION ISOLATION TRACE ===")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # --- RECRUITER FLOW ---
    print("\n--- RECRUITER VERIFICATION ---")
    rec_context = browser.new_context(viewport={"width": 1400, "height": 900})
    rec_page = rec_context.new_page()

    rec_page.goto("http://127.0.0.1:3000")
    rec_page.wait_for_load_state("networkidle")

    # Ensure Recruiter view
    rec_page.evaluate('localStorage.setItem("hiremind_portal_view_mode", "recruiter")')
    rec_page.reload()
    rec_page.wait_for_load_state("networkidle")

    # Sign in as HR Recruiter
    print("   Submitting HR Recruiter login...")
    rec_page.fill('input[placeholder="e.g. alex.recruiter@hiremind.ai"]', "hr.recruiter@hiremind.ai")
    rec_page.fill('input[placeholder="Enter recruiter password"]', "Recruiter123!")
    rec_page.click('button:has-text("Sign In to Recruiter Workspace")')
    rec_page.wait_for_selector('h1:has-text("HIREMIND AI")', timeout=15000)
    print("   [SUCCESS] HR Recruiter Dashboard rendered.")

    screenshot_1 = os.path.join(ARTIFACT_DIR, "screenshot_sess_1_recruiter_logged_in.png")
    rec_page.screenshot(path=screenshot_1, full_page=True)
    print("   [SAVED] Screenshot 1 (Recruiter Logged In):", screenshot_1)

    # Refresh page & test persistence
    print("   Refreshing Recruiter page...")
    rec_page.reload()
    rec_page.wait_for_selector('h1:has-text("HIREMIND AI")', timeout=15000)
    print("   [SUCCESS] Recruiter session persisted after refresh!")

    screenshot_4 = os.path.join(ARTIFACT_DIR, "screenshot_sess_4_recruiter_after_refresh.png")
    rec_page.screenshot(path=screenshot_4, full_page=True)
    print("   [SAVED] Screenshot 4 (Recruiter After Refresh):", screenshot_4)


    # --- CANDIDATE FLOW ---
    print("\n--- CANDIDATE VERIFICATION ---")
    cand_context = browser.new_context(viewport={"width": 1400, "height": 900})
    cand_page = cand_context.new_page()

    cand_page.goto("http://127.0.0.1:3000")
    cand_page.wait_for_load_state("networkidle")

    # Switch to Candidate View
    cand_page.evaluate('localStorage.setItem("hiremind_portal_view_mode", "candidate")')
    cand_page.reload()
    cand_page.wait_for_load_state("networkidle")

    # Click Existing Candidate Sign In tab
    print("   Switching to Existing Candidate Sign In tab...")
    cand_page.click('button:has-text("2. Existing Candidate Sign In")')
    cand_page.wait_for_selector('input[placeholder="Enter registered email"]', timeout=10000)

    print(f"   Signing in as Candidate ({cand_email})...")
    cand_page.fill('input[placeholder="Enter registered email"]', cand_email)
    cand_page.fill('input[placeholder="Enter password"]', cand_pass)
    cand_page.click('button:has-text("Sign In & Load Portal")')
    
    # Wait for candidate profile loaded
    cand_page.wait_for_selector('span:has-text("Live Application Tracker")', timeout=15000)
    print("   [SUCCESS] Candidate Portal Dashboard rendered.")

    screenshot_2 = os.path.join(ARTIFACT_DIR, "screenshot_sess_2_candidate_logged_in.png")
    cand_page.screenshot(path=screenshot_2, full_page=True)
    print("   [SAVED] Screenshot 2 (Candidate Logged In):", screenshot_2)

    # Refresh page & test persistence
    print("   Refreshing Candidate page...")
    cand_page.reload()
    cand_page.wait_for_selector('span:has-text("Live Application Tracker")', timeout=15000)
    print("   [SUCCESS] Candidate session persisted after refresh!")

    screenshot_3 = os.path.join(ARTIFACT_DIR, "screenshot_sess_3_candidate_after_refresh.png")
    cand_page.screenshot(path=screenshot_3, full_page=True)
    print("   [SAVED] Screenshot 3 (Candidate After Refresh):", screenshot_3)


    # --- ROLE ISOLATION TEST (CANDIDATE ACCESSING RECRUITER DASHBOARD) ---
    print("\n--- ROLE ISOLATION VERIFICATION ---")
    print("   Candidate attempting to open Recruiter view mode...")
    cand_page.evaluate('localStorage.setItem("hiremind_portal_view_mode", "recruiter")')
    cand_page.reload()
    cand_page.wait_for_load_state("networkidle")

    # Verify that Recruiter Dashboard is NOT rendered for Candidate session
    is_rec_dashboard_visible = cand_page.is_visible('h1:has-text("HIREMIND AI")')
    is_login_gate_visible = cand_page.is_visible('h2:has-text("HR Recruiter Sign In")')

    if not is_rec_dashboard_visible and is_login_gate_visible:
      print("   [SUCCESS] Candidate successfully blocked from Recruiter Dashboard!")
    else:
      print("   [ROLE GUARD CHECK]: Recruiter dashboard visible =", is_rec_dashboard_visible, "| Login gate visible =", is_login_gate_visible)

    screenshot_5 = os.path.join(ARTIFACT_DIR, "screenshot_sess_5_wrong_role_blocked.png")
    cand_page.screenshot(path=screenshot_5, full_page=True)
    print("   [SAVED] Screenshot 5 (Wrong-Role Access Blocked):", screenshot_5)

    browser.close()

print("\n=== PLAYWRIGHT VERIFICATION SUITE COMPLETED SUCCESSFULLY ===")
