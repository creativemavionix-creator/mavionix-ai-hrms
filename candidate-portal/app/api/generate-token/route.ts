import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function getSupabase() {
  return createClient(supabaseUrl, supabaseKey)
}

/**
 * POST /api/generate-token
 *
 * Called by the admin dashboard when advancing a candidate to an AI round.
 * Generates a unique, short-lived token and returns the portal URL.
 *
 * Body: { candidateId, applicationId, roundType, expiresInHours? }
 */
export async function POST(req: NextRequest) {
  try {
    const { candidateId, applicationId, roundType, expiresInHours = 48 } = await req.json()

    if (!candidateId || !applicationId || !roundType) {
      return NextResponse.json(
        { error: "candidateId, applicationId, and roundType are required" },
        { status: 400 }
      )
    }

    if (!["tech", "interview", "hr"].includes(roundType)) {
      return NextResponse.json(
        { error: "roundType must be tech, interview, or hr" },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    // Generate a cryptographically secure token
    const token = crypto.randomBytes(32).toString("base64url")

    // Set expiration
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + expiresInHours)

    // Insert token
    const { data, error } = await supabase
      .from("candidate_tokens")
      .insert({
        candidate_id: candidateId,
        application_id: applicationId,
        token,
        round_type: roundType,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Token generation error:", error)
      return NextResponse.json({ error: "Failed to generate token" }, { status: 500 })
    }

    // Build the portal URL
    const portalBase = process.env.NEXT_PUBLIC_PORTAL_URL || "http://localhost:3001"
    const interviewUrl = `${portalBase}/interview?token=${token}`

    return NextResponse.json({
      token,
      url: interviewUrl,
      expiresAt: expiresAt.toISOString(),
      tokenId: data.id,
    })
  } catch (err) {
    console.error("Generate token error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
