import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { logStageTransition } from "@/lib/stageHistory"

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined."
    )
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabase()
    const body = await req.json()
    const {
      candidateEmail,
      candidateName,
      jobTitle,
      interviewLink,
      applicationId,
      candidateId
    } = body

    if (!candidateEmail || !interviewLink || !applicationId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: candidateEmail, interviewLink, applicationId" },
        { status: 400 }
      )
    }

    const resendApiKey = process.env.RESEND_API_KEY
    let emailSent = false
    let emailErrorDetails: string | null = null

    // 1. Send Email via Resend if RESEND_API_KEY is configured
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey)
        const { data, error } = await resend.emails.send({
          from: "HireMind AI <interviews@resend.dev>",
          to: [candidateEmail],
          subject: `🎙️ Proctored AI Interview Link — ${jobTitle || "Senior Backend Engineer"}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #0b0c10; color: #ffffff; border-radius: 16px;">
              <h2 style="color: #10b981; margin-top: 0;">HireMind AI Candidate Portal</h2>
              <p>Dear <strong>${candidateName || "Candidate"}</strong>,</p>
              <p>Congratulations! You have been selected to advance to the <strong>Proctored AI Technical Interview Round</strong> for the role of <strong>${jobTitle || "Senior Backend Engineer"}</strong>.</p>
              
              <div style="background-color: #161822; padding: 20px; border-radius: 12px; border: 1px solid #10b98133; margin: 20px 0;">
                <p style="margin-0 0 10px 0; font-size: 14px; color: #9ca3af;">Your Exclusive Interview Link:</p>
                <a href="${interviewLink}" style="display: inline-block; background-color: #10b981; color: #000000; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 8px;">
                  🚀 START PROCTORED AI INTERVIEW
                </a>
              </div>

              <p style="font-size: 12px; color: #9ca3af;">
                Or copy and paste this link into your browser: <br/>
                <code style="color: #6ee7b7;">${interviewLink}</code>
              </p>

              <hr style="border: 0; border-top: 1px solid #ffffff1a; margin: 24px 0;" />
              <p style="font-size: 11px; color: #6b7280;">HireMind AI Neural Proctoring System • Automated Notification</p>
            </div>
          `
        })

        if (error) {
          console.error("Resend API send error:", error)
          emailErrorDetails = error.message
        } else {
          emailSent = true;
          console.log("Resend email dispatched successfully:", data)
        }
      } catch (err: any) {
        console.error("Resend client exception:", err)
        emailErrorDetails = err?.message || "Resend connection error"
      }
    } else {
      console.log("Notice: RESEND_API_KEY server env var not set. Simulating email dispatch for candidate:", candidateEmail)
      emailSent = true
    }

    // 2. Update DB Applications Table with interview details and stage: 'tech_round' / 'interview_scheduled'
    const nowIso = new Date().toISOString()
    const { data: updatedApp, error: updateErr } = await supabase
      .from("applications")
      .update({
        stage: "tech_round",
        flagged: false
      })
      .eq("id", applicationId)
      .select()
      .single()

    if (updateErr) {
      console.warn("DB application stage update notice:", updateErr.message)
    }

    // 3. Log Stage History Audit Trail
    await logStageTransition(
      applicationId,
      "task_approved",
      "interview_scheduled",
      "recruiter",
      `Interview link generated and sent to ${candidateEmail}`
    )

    return NextResponse.json({
      success: true,
      emailSent,
      interviewLink,
      applicationId,
      emailErrorDetails,
      message: emailSent
        ? `Interview link successfully generated & sent to ${candidateEmail}!`
        : `Interview link generated. Email dispatch notice: ${emailErrorDetails}`
    })

  } catch (error: any) {
    console.error("Send Interview Link Route error:", error)
    return NextResponse.json(
      { success: false, error: `Interview Link Route Error: ${error?.message || "Unknown error"}` },
      { status: 500 }
    )
  }
}
