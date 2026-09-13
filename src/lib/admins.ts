/**
 * Client-side admin allowlist for UX (show delete controls).
 * Supabase RLS `public.is_site_admin()` is the source of truth for actual DELETEs.
 */
const SITE_ADMIN_EMAILS = [
  'jeff.yu1973@outlook.com',
  'jeffyu@taican.com.tw',
] as const

export function normalizeAdminEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase()
}

export function isSiteAdmin(email: string | null | undefined): boolean {
  const e = normalizeAdminEmail(email)
  if (!e) return false
  return SITE_ADMIN_EMAILS.some((a) => a === e)
}

export const SITE_ADMIN_EMAIL_LIST = [...SITE_ADMIN_EMAILS]
