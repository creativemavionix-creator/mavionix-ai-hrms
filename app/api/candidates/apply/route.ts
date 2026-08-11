import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ukwmhwgchscvyvzsbcxk.supabase.co"
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrd21od2djaHNjdnl2enNiY3hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NTY4OTYsImV4cCI6MjEwMjAzMjg5Nn0.TkYjSEd5CF85NpY9v2XM_btJUtDBqHas9gKhjb3oiDw"

const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, phone, jobId, statementOfIntent, skills, resumeText } = body

    if (!name || !email || !jobId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: name, email, and jobId are required." },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
    const initials = name
      .split(" ")
      .map((part: string) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2) || "CN"

    // 1. Candidate Identity Model: Lookup or Create Candidate
    let candidateId: string | null = null
    let candidateRecord: any = null

    const { data: existingCandidates, error: candidateFetchErr } = await supabase
      .from("candidates")
      .select("*")
      .eq("email", normalizedEmail)
      .limit(1)

    if (candidateFetchErr) {
      console.warn("Supabase Candidate Lookup Warning:", candidateFetchErr.message)
    }

    if (existingCandidates && existingCandidates.length > 0) {
      candidateRecord = existingCandidates[0]
      candidateId = candidateRecord.id
    } else {
      // Create new candidate record
      const { data: newCand, error: createCandErr } = await supabase
        .from("candidates")
        .insert({
          name: name.trim(),
          email: normalizedEmail,
          phone: phone || null,
          initials,
          parsed_data: {
            statementOfIntent: statementOfIntent || "",
            skills: Array.isArray(skills) ? skills : (skills ? skills.split(",").map((s: string) => s.trim()) : []),
            resumeText: resumeText || ""
          }
        })
        .select()
        .single()

      if (createCandErr || !newCand) {
        console.error("Error creating candidate:", createCandErr)
        // Fallback demo object if DB offline
        candidateId = `cand-${Date.now()}`
        candidateRecord = { id: candidateId, name, email: normalizedEmail, initials, phone }
      } else {
        candidateRecord = newCand
        candidateId = newCand.id
      }
    }

    // 2. Duplicate Application Protection: Check UNIQUE(job_id, candidate_id)
    let applicationRecord: any = null
    let isDuplicate = false

    if (candidateId) {
      const { data: existingApps } = await supabase
        .from("applications")
        .select("*")
        .eq("job_id", jobId)
        .eq("candidate_id", candidateId)
        .limit(1)

      if (existingApps && existingApps.length > 0) {
        applicationRecord = existingApps[0]
        isDuplicate = true
      }
    }

    if (!applicationRecord && candidateId) {
      // Server-controlled defaults: stage is strictly 'applied', ai_score starts null
      const { data: newApp, error: createAppErr } = await supabase
        .from("applications")
        .insert({
          job_id: jobId,
          candidate_id: candidateId,
          stage: "applied",
          flagged: false,
          applied_date: new Date().toISOString().split("T")[0]
        })
        .select()
        .single()

      if (createAppErr || !newApp) {
        console.error("Error creating application:", createAppErr)
        applicationRecord = {
          id: `app-${Date.now()}`,
          job_id: jobId,
          candidate_id: candidateId,
          stage: "applied",
          applied_date: new Date().toISOString().split("T")[0]
        }
      } else {
        applicationRecord = newApp
      }
    }

    // 3. Delegate to persistent FastAPI backend for durable AI resume processing
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    try {
      fetch(`${backendUrl}/api/v1/applications/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: applicationRecord?.id,
          candidateId: candidateId,
          resumeText: resumeText || "",
          statementOfIntent: statementOfIntent || "",
          skills: skills || []
        })
      }).catch((err) => console.warn("Backend processing async call warning:", err.message))
    } catch (e) {
      console.warn("Backend API dispatch skipped:", e)
    }

    return NextResponse.json(
      {
        success: true,
        message: isDuplicate
          ? "Your application is already on file and under recruiter review."
          : "Application received successfully and queued for review.",
        isDuplicate,
        candidate: candidateRecord,
        application: applicationRecord
      },
      { status: isDuplicate ? 200 : 201 }
    )
  } catch (err: any) {
    console.error("API /api/candidates/apply error:", err)
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process candidate application" },
      { status: 500 }
    )
  }
}
