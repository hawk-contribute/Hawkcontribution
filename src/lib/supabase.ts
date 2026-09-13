import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.warn(
    '[hawk-contribute] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY',
  )
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
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
