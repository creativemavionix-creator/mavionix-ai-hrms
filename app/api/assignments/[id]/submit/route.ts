import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing required Supabase environment variables.")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}


export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { id: assignmentId } = await context.params
    const body = await request.json().catch(() => ({}))

    const subData = body.submission_data || {}
    const subText = body.submission_text || subData.report || ""
    const subUrl = body.submission_url || subData.github_link || subData.deployment_link || ""

    // 1. Look up assignment by ID or fallback application_id
    let assignment: any = null
    const { data: asgnById } = await supabaseAdmin
      .from("assignments")
      .select("*")
      .eq("id", assignmentId)
      .maybeSingle()

    if (asgnById) {
      assignment = asgnById
    } else {
      const { data: fallbackAsgn } = await supabaseAdmin
        .from("assignments")
        .select("*")
        .eq("application_id", assignmentId)
        .order("created_at", { ascending: false })
        .limit(1)

      if (fallbackAsgn && fallbackAsgn.length > 0) {
        assignment = fallbackAsgn[0]
      }
    }

    if (!assignment) {
      return NextResponse.json(
        { error: "Not Found", detail: "Assignment record not found for candidate application." },
        { status: 404 }
      )
    }

    // 2. Persist candidate submission in public.assignments using valid schema columns
    const updatePayload: any = {
      submission_url: subUrl || "https://github.com/candidate/submitted-project",
      submission_text: subText || "Assignment submitted",
      status: "submitted"
    }

    await supabaseAdmin
      .from("assignments")
      .update(updatePayload)
      .eq("id", assignment.id)

    // 3. Advance application stage in public.applications
    if (assignment.application_id) {
      await supabaseAdmin
        .from("applications")
        .update({ stage: "assignment_submitted" })
        .eq("id", assignment.application_id)
    }

    return NextResponse.json(
      {
        success: true,
        status: "submitted",
        assignment_id: assignment.id,
        message: "Assignment submitted successfully!"
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error("POST /api/assignments/[id]/submit error:", err)
    return NextResponse.json(
      { error: "Internal Server Error", detail: err?.message || "Unknown error" },
      { status: 500 }
    )
  }
}
