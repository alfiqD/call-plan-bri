import { createClient } from '@supabase/supabase-js'

const rawUrl = (import.meta?.env?.VITE_SUPABASE_URL || '').trim()
export const SUPABASE_URL = rawUrl.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '')
const SUPABASE_ANON_KEY = (import.meta?.env?.VITE_SUPABASE_ANON_KEY || '').trim()

/**
 * Validates whether Supabase environment variables are properly provided
 * and not default unconfigured placeholders.
 */
export function isSupabaseConfigured() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false
  if (SUPABASE_URL.includes('your-project') || SUPABASE_ANON_KEY.includes('your-anon-key')) return false
  try {
    const url = new URL(SUPABASE_URL)
    return Boolean(url.protocol && url.host)
  } catch {
    return false
  }
}

/**
 * Singleton Supabase Client with PKCE auth flow for browser security
 */
export const supabase = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  })
  : null
