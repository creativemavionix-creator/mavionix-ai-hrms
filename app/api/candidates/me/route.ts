import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing required Supabase environment variables.")
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})


export async function GET(request: NextRequest) {
  try {
    // 1. Extract Bearer Token from Authorization Header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized", detail: "Missing or malformed Authorization header." },
        { status: 401 }
      )
    }

    const token = authHeader.split(" ")[1]

    // 2. Validate Candidate Supabase Auth JWT Token
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData?.user) {
      return NextResponse.json(
        { error: "Unauthorized", detail: "Invalid, missing, or expired access token." },
        { status: 401 }
      )
    }

    const authUser = userData.user
    const authUserId = authUser.id
    const authUserEmail = authUser.email || ""

    // 3. Look up Candidate Record by real user_id column (or fallback parsed_data->user_id / email)
    let candidateRecord: any = null

    // First attempt: lookup by real user_id column or parsed_data->user_id
    const { data: candsByUserId } = await supabaseAdmin
      .from("candidates")
      .select("*, applications(*)")
      .or(`user_id.eq.${authUserId},parsed_data->>user_id.eq.${authUserId}`)
      .limit(1)

    if (candsByUserId && candsByUserId.length > 0) {
      candidateRecord = candsByUserId[0]
    } else if (authUserEmail) {
      // Fallback attempt: lookup by matching email
      const { data: candsByEmail } = await supabaseAdmin
        .from("candidates")
        .select("*, applications(*)")
        .eq("email", authUserEmail.toLowerCase())
        .limit(1)

      if (candsByEmail && candsByEmail.length > 0) {
        candidateRecord = candsByEmail[0]
      }
    }

    if (!candidateRecord) {
      return NextResponse.json(
        { candidate: null, applications: [], message: "No candidate profile found for this authenticated user." },
        { status: 404 }
      )
    }

    // 4. Return Candidate Profile, Linked Applications, & Active Assignment
    const applications = candidateRecord.applications || []
    let activeAssignment: any = null

    if (applications.length > 0 && applications[0].id) {
      const { data: asgnList } = await supabaseAdmin
        .from("assignments")
        .select("*")
        .eq("application_id", applications[0].id)
        .order("created_at", { ascending: false })
        .limit(1)

      if (asgnList && asgnList.length > 0) {
        activeAssignment = asgnList[0]
      }
    }

    return NextResponse.json(
      {
        candidate: {
          id: candidateRecord.id,
          name: candidateRecord.name,
          email: candidateRecord.email,
          phone: candidateRecord.phone,
          initials: candidateRecord.initials,
          user_id: candidateRecord.user_id || candidateRecord.parsed_data?.user_id || authUserId,
          parsed_data: candidateRecord.parsed_data || {},
          created_at: candidateRecord.created_at
        },
        applications: applications,
        active_assignment: activeAssignment
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error("GET /api/candidates/me error:", err)
    return NextResponse.json(
      { error: "Internal Server Error", detail: err?.message || "Unknown error" },
      { status: 500 }
    )
  }
}
