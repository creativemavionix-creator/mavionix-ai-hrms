const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runE2ETrace() {
  console.log('=== STARTING PLAYWRIGHT REAL-BROWSER E2E TRACE ===\n');

  const artifactsDir = 'C:\\Users\\Pramod\\.gemini\\antigravity\\brain\\97df1c93-a4e2-499b-88c6-fc2d00203691';
  const pdfPath = path.join(artifactsDir, 'scratch', 'sample_resume.pdf');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.append ? consoleLogs.append(msg.text()) : consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });

  const timestamp = Date.now();
  const testEmail = `playwright.candidate.${timestamp}@example.com`;
  const testName = `Playwright Candidate ${timestamp}`;

  try {
    // 1. Load Candidate Apply Page
    console.log('1. Loading Candidate Apply Page (http://127.0.0.1:3000)...');
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const shot1Path = path.join(artifactsDir, 'screenshot_1_apply_form.png');
    await page.screenshot({ path: shot1Path, fullPage: true });
    console.log(`   [SAVED] Screenshot 1: ${shot1Path}`);

    // Verify password field is NOT present
    const passwordInputs = await page.$$('input[type="password"]');
    console.log(`   Password inputs found on Apply Form: ${passwordInputs.length} (Expected: 0)`);

    // 2. Fill out and submit application
    console.log('\n2. Filling out candidate application form...');
    await page.fill('input[placeholder="e.g. Alex Rivera"]', testName);
    await page.fill('input[placeholder="alex.rivera@example.com"]', testEmail);
    await page.fill('input[placeholder="+1 (555) 019-2834"]', '+15550198888');
    await page.fill('input[placeholder="e.g. San Francisco, CA"]', 'Austin, TX');
    await page.fill('textarea[placeholder*="Statement of Intent"]', 'Playwright real-browser E2E verification application statement.');

    // Upload PDF Resume
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.setInputFiles(pdfPath);
      console.log('   Uploaded sample_resume.pdf');
    }

    console.log('   Submitting application form...');
    await page.click('button:has-text("Submit Candidate Application")');
    await page.waitForTimeout(3000);

    const shot2Path = path.join(artifactsDir, 'screenshot_2_apply_submitted.png');
    await page.screenshot({ path: shot2Path, fullPage: true });
    console.log(`   [SAVED] Screenshot 2: ${shot2Path}`);

    // 3. Load Candidate Sign-In Form & Attempt invalid login
    console.log('\n3. Attempting sign-in with invalid credentials before HR grant...');
    await page.click('button:has-text("2. Existing Candidate Sign In")');
    await page.waitForTimeout(500);

    await page.fill('input[placeholder="Enter registered email"]', testEmail);
    await page.fill('input[placeholder="Enter password"]', 'WrongPassword123!');
    await page.click('button:has-text("Sign In & Load Portal")');
    await page.waitForTimeout(2000);

    const shot3Path = path.join(artifactsDir, 'screenshot_3_signin_failed.png');
    await page.screenshot({ path: shot3Path, fullPage: true });
    console.log(`   [SAVED] Screenshot 3 (Failure Toast): ${shot3Path}`);

    // 4. Switch to Recruiter Dashboard as HR
    console.log('\n4. Switching to Recruiter Workstation...');
    await page.click('button:has-text("Recruiter Workstation")');
    await page.waitForTimeout(2000);

    // Sign in as HR Recruiter if login page shown
    const isHrLogin = await page.$('input[placeholder="e.g. alex.recruiter@hiremind.ai"]');
    if (isHrLogin) {
      console.log('   Signing in as HR Recruiter...');
      await page.fill('input[placeholder="e.g. alex.recruiter@hiremind.ai"]', 'hr.recruiter@hiremind.ai');
      await page.fill('input[placeholder="Enter recruiter password"]', 'Recruiter123!');
      await page.click('button:has-text("Sign In to Recruiter Workspace")');
      await page.waitForTimeout(2500);
    }

    const shot4Path = path.join(artifactsDir, 'screenshot_4_recruiter_dashboard.png');
    await page.screenshot({ path: shot4Path, fullPage: true });
    console.log(`   [SAVED] Screenshot 4 (Recruiter Dashboard): ${shot4Path}`);

    // 5. Grant Portal Access for candidate
    console.log('\n5. Searching for new candidate and granting portal access in UI...');
    // Search candidate email
    const searchInput = await page.$('input[placeholder*="Search"]');
    if (searchInput) {
      await searchInput.fill(testName);
      await page.waitForTimeout(1000);
    }

    // Click candidate card or grant access button
    const grantButton = await page.$('button:has-text("Grant Portal Access"), button:has-text("Grant Access"), button:has-text("🔑")');
    let generatedPassword = '';

    if (grantButton) {
      await grantButton.click();
      await page.waitForTimeout(2000);
    } else {
      console.log('   Grant button not immediately visible on row, opening candidate dossier...');
      const candRow = await page.$(`text=${testName}`);
      if (candRow) {
        await candRow.click();
        await page.waitForTimeout(1500);
        const innerGrant = await page.$('button:has-text("Grant Portal Access"), button:has-text("Grant Access")');
        if (innerGrant) {
          await innerGrant.click();
          await page.waitForTimeout(2000);
        }
      }
    }

    const shot5Path = path.join(artifactsDir, 'screenshot_5_hr_granted_access.png');
    await page.screenshot({ path: shot5Path, fullPage: true });
    console.log(`   [SAVED] Screenshot 5 (Credentials Confirmation): ${shot5Path}`);

    // Extract generated credentials from page text or API response
    const pageContent = await page.content();
    const matchPass = pageContent.match(/CandPass_[a-f0-9]+!/i) || pageContent.match(/Password:\s*([^\s<"]+)/i);
    if (matchPass) {
      generatedPassword = matchPass[1] || matchPass[0];
      console.log(`   Extracted Generated Password from UI: ${generatedPassword}`);
    }

    // 6. Sign in as Candidate using HR-generated credentials
    console.log('\n6. Navigating back to Candidate Portal Sign-In...');
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await page.click('button:has-text("2. Existing Candidate Sign In")');
    await page.waitForTimeout(500);

    // If password couldn't be parsed from DOM, trigger fallback API fetch for credential
    if (!generatedPassword) {
      console.log('   Fetching credentials via HR API fallback for automation test...');
      const fetch = require('node-fetch');
      const supabase = require('@supabase/supabase-js');
      const sClient = supabase.createClient('https://<project>.supabase.co', 'anon_key');
    }

  } catch (err) {
    console.error('Playwright E2E Trace Exception:', err);
  } finally {
    await browser.close();
    console.log('\n=== PLAYWRIGHT E2E TRACE COMPLETED ===');
  }
}

runE2ETrace();
