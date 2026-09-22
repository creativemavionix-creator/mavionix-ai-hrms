import { createClient } from "@supabase/supabase-js"

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawKey &&
  !rawUrl.includes("YOUR_SUPABASE_PROJECT_ID") &&
  !rawKey.includes("YOUR_SUPABASE_ANON_KEY")
)

const supabaseUrl = isSupabaseConfigured ? rawUrl! : "https://placeholder.supabase.co"
const supabaseAnonKey = isSupabaseConfigured ? rawKey! : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder"

/**
 * Client-side Supabase client — uses anon key only.
 * All access is gated through RLS + candidate_tokens table.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Server-side Supabase client with service role for token validation.
 * Only used in API routes / Server Actions — never exposed to client.
 */
export function getServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey
  return createClient(supabaseUrl, serviceRoleKey)
}
