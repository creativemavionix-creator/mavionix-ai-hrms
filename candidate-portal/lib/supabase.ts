import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

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
    // Fallback: use anon key (will be RLS-restricted)
    return createClient(supabaseUrl, supabaseAnonKey)
  }
  return createClient(supabaseUrl, serviceRoleKey)
}
