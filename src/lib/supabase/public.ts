import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const isPublicSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder')
)

/**
 * Cookie-less anon client for public, crawler-facing output (sitemap, llms.txt,
 * metadata). It never reads the request, so it cannot leak a visitor's session
 * into cached output and only sees what RLS exposes to anonymous users.
 */
export function createPublicClient(): SupabaseClient | null {
  if (!isPublicSupabaseConfigured) return null
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
