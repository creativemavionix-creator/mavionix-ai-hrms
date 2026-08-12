import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { analyzeCandidateResume } from "@/lib/geminiScoring"
import { logStageTransition } from "@/lib/stageHistory"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ukwmhwgchscvyvzsbcxk.supabase.co"
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrd21od2djaHNjdnl2enNiY3hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NTY4OTYsImV4cCI6MjEwMjAzMjg5Nn0.TkYjSEd5CF85NpY9v2XM_btJUtDBqHas9gKhjb3oiDw"

const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      name, email, phone, jobId, location, linkedInUrl, githubUrl,
      yearsExp, workPreference, noticePeriod, statementOfIntent,
      technicalImpact, outageLesson, skills, resumeText, resumeFileName
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

    // 2. Resolve valid UUID for public.jobs table foreign key constraint
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

    // 3. Duplicate Application Protection: Check UNIQUE(job_id, candidate_id)
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
      // Server-controlled canonical stage: starts at 'under_review', ai_score starts null
      const { data: newApp, error: createAppErr } = await supabase
        .from("applications")
        .insert({
          job_id: targetJobUuid,
          candidate_id: candidateId,
          stage: "under_review",
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
        await logStageTransition(newApp.id, "submitted", "under_review", "system", "Initial application submitted")
      }
    }

    // 4. Perform Real AI Resume Scoring via Gemini API & Persist to public.ai_reports table
    let aiReportRecord: any = null
    if (applicationRecord?.id && candidateId) {
      try {
        const userApiKey = req.headers.get("x-gemini-api-key") || undefined
        const aiAnalysis = await analyzeCandidateResume({
          name: name.trim(),
          jobTitle: jobId || "Senior Backend Engineer",
          resumeText: resumeText || "",
          statementOfIntent: statementOfIntent || "",
          technicalImpact: technicalImpact || "",
          outageLesson: outageLesson || "",
          skills: skills || [],
          yearsExp: yearsExp || "3-5 years",
          userApiKey
        })

        const { data: upsertedReport, error: rError } = await supabase.from("ai_reports").upsert({
          application_id: applicationRecord.id,
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
        }, { onConflict: "application_id" }).select().single()

        if (rError) {
          console.error("AI Report Upsert Error:", rError.message)
        } else {
          aiReportRecord = upsertedReport
        }

        // Update public.applications table with calculated overall AI score & match quality
        const matchQuality = aiAnalysis.overall_score >= 85 ? "excellent" : aiAnalysis.overall_score >= 70 ? "strong" : "moderate"
        const { data: updatedApp } = await supabase.from("applications").update({
          ai_score: aiAnalysis.overall_score,
          match_quality: matchQuality
        }).eq("id", applicationRecord.id).select().single()

        if (updatedApp) {
          applicationRecord = updatedApp
        }
      } catch (scoringErr: any) {
        console.error("Gemini Scoring Execution Warning:", scoringErr.message)
      }
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
