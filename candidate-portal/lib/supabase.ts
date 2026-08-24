import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be defined."
  )
}

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
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error(
      "Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY is required for getServiceClient()."
    )
  }
  return createClient(supabaseUrl!, serviceRoleKey)
}
