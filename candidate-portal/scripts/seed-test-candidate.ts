/**
 * Seed script: creates a test candidate row and generates a portal token.
 *
 * Usage (from candidate-portal directory):
 *   npx tsx scripts/seed-test-candidate.ts
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local for real Supabase.
 * For demo mode, hit the admin backend API directly instead.
 */

const ADMIN_API = process.env.ADMIN_API_URL || "http://localhost:8000"
const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL || "http://localhost:3001"

async function main() {
  console.log("\n╔══════════════════════════════════════════════╗")
  console.log("║  HIREMIND AI — TEST CANDIDATE SEEDER        ║")
  console.log("╚══════════════════════════════════════════════╝\n")

  // Step 1: Create a test candidate via the admin API (demo mode)
  console.log("[1/3] Creating test candidate via admin API...")

  // We'll use the admin API's generate-token endpoint
  // First check if there are existing candidates
  const candidatesRes = await fetch(`${ADMIN_API}/api/candidates`)
  const candidates = await candidatesRes.json()

  let candidateId: string
  let applicationId: string
  let candidateName: string

  if (candidates.length > 0) {
    // Use the first candidate that has an application
    const cand = candidates.find((c: any) => c.application_id) || candidates[0]
    candidateId = cand.id
    applicationId = cand.application_id
    candidateName = cand.name
    console.log(`   Using existing candidate: ${candidateName} (${candidateId})`)
    console.log(`   Application: ${applicationId}`)
  } else {
    console.log("   No candidates found. Please add a candidate via the admin dashboard first.")
    console.log("   Then re-run this script.")
    process.exit(1)
  }

  // Step 2: Generate portal token for tech round
  console.log("\n[2/3] Generating portal access token (tech round)...")

  const tokenRes = await fetch(`${ADMIN_API}/api/portal/generate-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      candidate_id: candidateId,
      application_id: applicationId,
      round_type: "tech",
      expires_in_hours: 168, // 1 week for testing
    }),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    console.error(`   Failed to generate token: ${err}`)
    process.exit(1)
  }

  const tokenData = await tokenRes.json()

  // Step 3: Print results
  console.log("\n[3/3] Test candidate ready!\n")
  console.log("┌──────────────────────────────────────────────────────────────┐")
  console.log(`│ CANDIDATE:    ${candidateName}`)
  console.log(`│ ROUND:        TECHNICAL`)
  console.log(`│ TOKEN:        ${tokenData.token.slice(0, 20)}...`)
  console.log(`│ EXPIRES:      ${tokenData.expires_at}`)
  console.log("├──────────────────────────────────────────────────────────────┤")
  console.log(`│ PORTAL URL:                                                  │`)
  console.log(`│ ${tokenData.url}`)
  console.log("└──────────────────────────────────────────────────────────────┘\n")

  console.log("→ Open the URL above in your browser to walk through the flow.")
  console.log("→ The admin dashboard will see results in real-time.\n")
}

main().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
