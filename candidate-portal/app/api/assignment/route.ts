import { NextRequest, NextResponse } from "next/server"

const ADMIN_API = (process.env.ADMIN_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "")

/**
 * POST /api/assignment
 * Submits assignment work via the backend using the candidate's authorization token.
 * Body: { assignmentId, submissionText, submissionUrl?, token? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { assignmentId, submissionText, submissionUrl, submissionType } = body
    const token = body.token || body.session?.token || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")

    if (!assignmentId) {
      return NextResponse.json({ error: "assignmentId is required" }, { status: 400 })
    }

    const controller1 = new AbortController()
    const timeoutId1 = setTimeout(() => controller1.abort(), 5000)

    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    // Submit the assignment to FastAPI backend
    const backendRes = await fetch(`${ADMIN_API}/api/assignments/${assignmentId}/submit`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        submission_text: submissionText || "[Empty submission]",
        submission_url: submissionUrl || undefined,
        submission_type: submissionType || "text",
      }),
      signal: controller1.signal,
    }).catch(() => null).finally(() => clearTimeout(timeoutId1))

    if (backendRes && !backendRes.ok) {
      const errData = await backendRes.json().catch(() => ({}))
      return NextResponse.json({ error: errData.detail || "Assignment submission failed" }, { status: backendRes.status })
    }

    return NextResponse.json({
      submitted: true,
      message: "Assignment submitted successfully. Under evaluation by AI.",
    })
  } catch (err) {
    console.error("Assignment API error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
