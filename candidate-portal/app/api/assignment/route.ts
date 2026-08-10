import { NextRequest, NextResponse } from "next/server"

const ADMIN_API = process.env.ADMIN_API_URL || "http://127.0.0.1:8000"

/**
 * POST /api/assignment
 * Submits assignment and triggers evaluation via the backend.
 * Body: { assignmentId, submissionText, submissionUrl? }
 */
export async function POST(req: NextRequest) {
  try {
    const { assignmentId, submissionText, submissionUrl, submissionType } = await req.json()

    if (!assignmentId) {
      return NextResponse.json({ error: "assignmentId is required" }, { status: 400 })
    }

    const controller1 = new AbortController()
    const timeoutId1 = setTimeout(() => controller1.abort(), 3000)

    // Submit the assignment
    fetch(`${ADMIN_API}/api/assignments/${assignmentId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer demo-token" },
      body: JSON.stringify({
        submission_text: submissionText || "[Empty submission]",
        submission_url: submissionUrl || undefined,
        submission_type: submissionType || "text",
      }),
      signal: controller1.signal,
    }).catch(() => null).finally(() => clearTimeout(timeoutId1))

    // Asynchronously trigger AI evaluation without blocking candidate
    fetch(`${ADMIN_API}/api/assignments/${assignmentId}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer demo-token" },
    }).catch(() => null)

    return NextResponse.json({
      submitted: true,
      message: "Assignment submitted successfully. Under evaluation by AI.",
    })
  } catch (err) {
    console.error("Assignment API error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
