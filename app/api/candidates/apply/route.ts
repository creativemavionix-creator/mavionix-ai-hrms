import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { analyzeCandidateResume } from "@/lib/geminiScoring"
import { logStageTransition } from "@/lib/stageHistory"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ukwmhwgchscvyvzsbcxk.supabase.co"
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrd21od2djaHNjdnl2enNiY3hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NTY4OTYsImV4cCI6MjEwMjAzMjg5Nn0.TkYjSEd5CF85NpY9v2XM_btJUtDBqHas9gKhjb3oiDw"

const supabase = createClient(supabaseUrl, supabaseKey)

// Asynchronous Gemini AI Resume Scoring (Non-blocking)
async function runAsyncAiScoring(
  applicationId: string,
  candidateId: string,
  body: any,
  userApiKey?: string
) {
  try {
    // 1. Update status to 'processing'
    await supabase.from("applications").update({ ai_processing_status: "processing" }).eq("id", applicationId)

    const aiAnalysis = await analyzeCandidateResume({
      name: (body.name || "").trim(),
      jobTitle: body.jobId || "Senior Backend Engineer",
      resumeText: body.resumeText || "",
      statementOfIntent: body.statementOfIntent || "",
      technicalImpact: body.technicalImpact || "",
      outageLesson: body.outageLesson || "",
      skills: body.skills || [],
      yearsExp: body.yearsExp || "3-5 years",
      userApiKey
    })

    // 2. Upsert AI report to public.ai_reports table
    const { error: rError } = await supabase.from("ai_reports").upsert({
      application_id: applicationId,
      candidate_id: candidateId,
      skill_score: aiAnalysis.skill_score,
      exp_score: aiAnalysis.exp_score,
      edu_score: aiAnalysis.edu_score,
      proj_score: aiAnalysis.proj_score,
      confidence: aiAnalysis.confidence,
      sentiment_score: aiAnalysis.sentiment_score,
      insights: aiAnalysis.insights,
      tags: aiAnalysis.tags,
      verification_status: aiAnalysis.verification_status
    }, { onConflict: "application_id" })

    if (rError) {
      console.warn("AI Report Upsert Warning:", rError.message)
    }

    // 3. Update application with score, match quality, and set ai_processing_status = 'completed'
    const matchQuality = aiAnalysis.overall_score >= 85 ? "excellent" : aiAnalysis.overall_score >= 70 ? "strong" : "moderate"
    await supabase.from("applications").update({
      ai_score: aiAnalysis.overall_score,
      match_quality: matchQuality,
      ai_processing_status: "completed"
    }).eq("id", applicationId)
  } catch (err: any) {
    console.error("Async AI Scoring Failure:", err?.message || err)
    // AI failure must NOT crash application; mark status as 'failed' for recruiter manual review
    await supabase.from("applications").update({ ai_processing_status: "failed" }).eq("id", applicationId)
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      name, email, phone, jobId, location, linkedInUrl, githubUrl,
      yearsExp, workPreference, noticePeriod, statementOfIntent,
      technicalImpact, outageLesson, skills, resumeText, resumeFileName,
      authUserId: providedAuthUserId
    } = body

    if (!name || !email || !jobId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: name, email, and target position are required." },
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

    // 1. Authenticate Request via Supabase Auth Session Token or Provided authUserId
    let authUserId: string | null = providedAuthUserId || null
    const authHeader = req.headers.get("authorization")
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim()
      try {
        const { data: { user } } = await supabase.auth.getUser(token)
        if (user) {
          authUserId = user.id
        }
      } catch (authErr) {
        console.warn("Supabase Auth Token Verification Notice:", authErr)
      }
    }

    // 2. Candidate Resolution (by auth_user_id or normalized email)
    let candidateId: string | null = null
    let candidateRecord: any = null

    // First try lookup by auth_user_id if available
    if (authUserId) {
      const { data: candsByAuth } = await supabase
        .from("candidates")
        .select("*")
        .eq("auth_user_id", authUserId)
        .limit(1)

      if (candsByAuth && candsByAuth.length > 0) {
        candidateRecord = candsByAuth[0]
        candidateId = candidateRecord.id
      }
    }

    // Fallback lookup by email
    if (!candidateRecord) {
      const { data: candsByEmail } = await supabase
        .from("candidates")
        .select("*")
        .eq("email", normalizedEmail)
        .limit(1)

      if (candsByEmail && candsByEmail.length > 0) {
        candidateRecord = candsByEmail[0]
        candidateId = candidateRecord.id

        // Link auth_user_id if available and not set
        if (authUserId && !candidateRecord.auth_user_id) {
          await supabase.from("candidates").update({ auth_user_id: authUserId }).eq("id", candidateId)
          candidateRecord.auth_user_id = authUserId
        }
      }
    }

    const parsedDataObj = {
      location: location || "",
      linkedInUrl: linkedInUrl || "",
      githubUrl: githubUrl || "",
      yearsExp: yearsExp || "3-5 years",
      workPreference: workPreference || "Remote",
      noticePeriod: noticePeriod || "Immediate",
      statementOfIntent: statementOfIntent || "",
      technicalImpact: technicalImpact || "",
      outageLesson: outageLesson || "",
      skills: Array.isArray(skills) ? skills : (skills ? skills.split(",").map((s: string) => s.trim()) : []),
      resumeText: resumeText || "",
      resumeFileName: resumeFileName || "uploaded_resume.pdf"
    }

    if (candidateRecord) {
      // Update existing candidate profile details
      const { data: updatedCand } = await supabase
        .from("candidates")
        .update({
          name: name.trim(),
          phone: phone || candidateRecord.phone,
          parsed_data: parsedDataObj,
          ...(authUserId ? { auth_user_id: authUserId } : {})
        })
        .eq("id", candidateId)
        .select()
        .single()

      if (updatedCand) candidateRecord = updatedCand
    } else {
      // Create new candidate record
      const { data: newCand, error: createCandErr } = await supabase
        .from("candidates")
        .insert({
          name: name.trim(),
          email: normalizedEmail,
          phone: phone || null,
          initials,
          ...(authUserId ? { auth_user_id: authUserId } : {}),
          parsed_data: parsedDataObj
        })
        .select()
        .single()

      if (createCandErr || !newCand) {
        console.error("Database Candidate creation error:", createCandErr?.message || createCandErr)
        return NextResponse.json(
          { success: false, error: `Candidate Persistence Failed: ${createCandErr?.message || "Unknown DB error"}` },
          { status: 500 }
        )
      } else {
        candidateRecord = newCand
        candidateId = newCand.id
      }
    }

    // 3. Resolve target job UUID in public.jobs table
    let targetJobUuid: string | null = null
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    if (uuidRegex.test(jobId)) {
      targetJobUuid = jobId
    } else {
      const { data: foundJobs } = await supabase
        .from("jobs")
        .select("id")
        .or(`job_code.eq.${jobId},title.ilike.%${jobId}%`)
        .limit(1)

      if (foundJobs && foundJobs.length > 0) {
        targetJobUuid = foundJobs[0].id
      } else {
        const { data: anyJob } = await supabase.from("jobs").select("id").limit(1)
        if (anyJob && anyJob.length > 0) {
          targetJobUuid = anyJob[0].id
        } else {
          const { data: createdJob } = await supabase
            .from("jobs")
            .insert({
              job_code: jobId.length <= 20 ? jobId : "JOB-101",
              title: "Senior Backend Engineer",
              department: "Engineering",
              location: "Remote",
              status: "active",
              priority: "high"
            })
            .select("id")
            .single()
          targetJobUuid = createdJob?.id || null
        }
      }
    }

    // 4. Duplicate Application Protection: Stable (job_id, candidate_id) relation
    let applicationRecord: any = null
    let isDuplicate = false

    if (candidateId && targetJobUuid) {
      const { data: existingApps } = await supabase
        .from("applications")
        .select("*")
        .eq("job_id", targetJobUuid)
        .eq("candidate_id", candidateId)
        .limit(1)

      if (existingApps && existingApps.length > 0) {
        applicationRecord = existingApps[0]
        isDuplicate = true
      }
    }

    if (!applicationRecord && candidateId && targetJobUuid) {
      // Set application_stage = 'applied' and ai_processing_status = 'pending'
      const { data: newApp, error: createAppErr } = await supabase
        .from("applications")
        .insert({
          job_id: targetJobUuid,
          candidate_id: candidateId,
          stage: "applied",
          ai_processing_status: "pending",
          flagged: false,
          applied_date: new Date().toISOString().split("T")[0]
        })
        .select()
        .single()

      if (createAppErr || !newApp) {
        console.error("Database Application creation error:", createAppErr?.message || createAppErr)
        return NextResponse.json(
          { success: false, error: `Application Persistence Failed: ${createAppErr?.message || "Unknown DB error"}` },
          { status: 500 }
        )
      } else {
        applicationRecord = newApp
        await logStageTransition(newApp.id, null, "applied", "candidate", "Candidate submitted application")
      }
    }

    // 5. Create Activity Log Entry
    try {
      await supabase.from("activity_logs").insert({
        event_type: "candidate_application_submitted",
        candidate_id: candidateId,
        application_id: applicationRecord?.id || null,
        details: {
          candidate_name: name,
          candidate_email: normalizedEmail,
          job_id: targetJobUuid,
          is_duplicate: isDuplicate
        }
      })
    } catch (actErr) {
      console.warn("Activity log creation notice:", actErr)
    }

    // 6. Trigger Asynchronous Gemini AI Resume Scoring (Non-blocking)
    if (applicationRecord?.id && candidateId && !isDuplicate) {
      runAsyncAiScoring(
        applicationRecord.id,
        candidateId,
        body,
        req.headers.get("x-gemini-api-key") || undefined
      )
    }

    // 7. Return 201 Created (or 200 for duplicate) immediately!
    return NextResponse.json(
      {
        success: true,
        message: isDuplicate
          ? "Your application is already on file and under recruiter review."
          : "Application submitted. Your profile is currently under review.",
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
