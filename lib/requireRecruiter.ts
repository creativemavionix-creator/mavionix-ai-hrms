import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const RECRUITER_ROLES = new Set(["super_admin", "hr_manager", "recruiter", "interviewer"])

function isRecruiterEmail(email?: string | null): boolean {
  if (!email) return false
  const e = email.toLowerCase().trim()
  return e === "hr.recruiter@hiremind.ai" || e.endsWith("@hiremind.ai") || e.endsWith("@mavionix.com")
}

export interface AuthCheckResult {
  authorized: boolean
  response?: NextResponse
  user?: any
}

export async function requireRecruiter(request: Request): Promise<AuthCheckResult> {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized", detail: "Missing or malformed Authorization header." },
        { status: 401 }
      ),
    }
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim()
  if (!token) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized", detail: "Empty access token." },
        { status: 401 }
      ),
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Server Configuration Error", detail: "Supabase environment variables unconfigured." },
        { status: 500 }
      ),
    }
  }

  // Create an unprivileged anon-key client to cryptographically verify user token with Supabase Auth
  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userError } = await anonClient.auth.getUser(token)
  if (userError || !userData?.user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized", detail: "Invalid or expired access token." },
        { status: 401 }
      ),
    }
  }

  const authUser = userData.user
  const email = authUser.email || ""

  // Lookup user profile in 'users' table to check role
  const { data: userProfile } = await anonClient
    .from("users")
    .select("role")
    .eq("id", authUser.id)
    .maybeSingle()

  const role = userProfile?.role

  const isAuthorizedRole = (role && RECRUITER_ROLES.has(role)) || isRecruiterEmail(email)

  if (!isAuthorizedRole) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Forbidden", detail: "Access restricted to authorized HR recruiter accounts." },
        { status: 403 }
      ),
    }
  }

  return { authorized: true, user: authUser }
}
