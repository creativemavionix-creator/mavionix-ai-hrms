import { NextRequest, NextResponse } from "next/server"

function getApiUrl(): string {
  const url = process.env.ADMIN_API_URL || process.env.NEXT_PUBLIC_API_URL
  if (!url) {
    const errorMsg = "Missing required environment variable: ADMIN_API_URL or NEXT_PUBLIC_API_URL"
    if (process.env.NODE_ENV === "development") {
      console.error(errorMsg)
    } else {
      throw new Error(errorMsg)
    }
  }
  return (url || "").replace(/\/$/, "")
}

/**
 * POST /api/assignment
 * Submits assignment work via the backend using the candidate's authorization token.
 * Body: { assignmentId, submissionText, submissionUrl?, token? }
 */
export async function POST(req: NextRequest) {
  try {
    const ADMIN_API = getApiUrl()
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

    const isDemoAllowed = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === "true"
    let backendRes: Response | null = null

    try {
      backendRes = await fetch(`${ADMIN_API}/api/assignments/${assignmentId}/submit`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          submission_text: submissionText || "[Empty submission]",
          submission_url: submissionUrl || undefined,
          submission_type: submissionType || "text",
        }),
        signal: controller1.signal,
      })
    } catch (fetchErr) {
      backendRes = null
    } finally {
      clearTimeout(timeoutId1)
    }

    if (!backendRes) {
      if (!isDemoAllowed && token !== "demo") {
        return NextResponse.json(
          { error: "Backend service unavailable", detail: "Could not connect to FastAPI backend." },
          { status: 502 }
        )
      }
      return NextResponse.json({
        submitted: true,
        message: "Assignment submitted in offline demo mode.",
      })
    }

    if (!backendRes.ok) {
      const errData = await backendRes.json().catch(() => ({}))
      return NextResponse.json(
        { error: errData.detail || errData.error || "Assignment submission failed" },
        { status: backendRes.status }
      )
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
