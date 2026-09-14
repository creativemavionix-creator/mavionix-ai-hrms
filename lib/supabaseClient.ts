import { createClient, SupabaseClient } from "@supabase/supabase-js"

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

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey)


