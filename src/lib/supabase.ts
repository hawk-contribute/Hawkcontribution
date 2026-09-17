import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const isSupabaseConfigured = Boolean(url && anonKey)

if (!isSupabaseConfigured) {
  console.error(
    '[hawk-contribute] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Auth cannot reach the project until these are set at build time (GitHub Actions secrets for Pages).',
  )
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // handled explicitly in consumeAuthCallback
    flowType: 'pkce',
  },
})

/** Magic-link redirect must include Vite base (e.g. /Hawkcontribution/). */
export function authRedirectTo(): string {
  const base = import.meta.env.BASE_URL || '/'
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const path = base.endsWith('/') ? base : `${base}/`
  return `${origin}${path}`
}
