/** Mirror of public.mask_email — first char + ***@domain (client display). */
export function maskEmail(email: string | null | undefined): string {
  const e = (email ?? '').trim()
  if (!e) return ''
  const at = e.indexOf('@')
  if (at <= 0 || at === e.length - 1) return '***'
  const local = e.slice(0, at)
  const domain = e.slice(at + 1)
  const first = local[0] ?? '*'
  return `${first}***@${domain}`
}

/**
 * Full email for self or site admin; otherwise masked.
 */
export function displayEmail(
  email: string | null | undefined,
  opts: { viewerEmail?: string | null; isAdmin?: boolean },
): string {
  const e = (email ?? '').trim()
  if (!e) return ''
  if (opts.isAdmin) return e
  const viewer = (opts.viewerEmail ?? '').trim().toLowerCase()
  if (viewer && viewer === e.toLowerCase()) return e
  return maskEmail(e)
}
