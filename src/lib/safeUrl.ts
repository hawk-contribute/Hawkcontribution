/**
 * Allow only http(s) absolute URLs for user-/admin-supplied links.
 * Rejects javascript:, data:, vbscript:, relative schemes, etc.
 */
export function safeHttpUrl(
  raw: string | null | undefined,
): string | undefined {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) return undefined
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return undefined
  }
  const protocol = parsed.protocol.toLowerCase()
  if (protocol !== 'http:' && protocol !== 'https:') return undefined
  // Normalize href (drops credentials quirks, keeps host/path/query/hash)
  return parsed.href
}

export function isSafeHttpUrl(raw: string | null | undefined): boolean {
  return Boolean(safeHttpUrl(raw))
}


/**
 * NFT image: absolute http(s) OR safe site-relative path (e.g. rewards/nft/foo.jpg).
 */
export function safeNftImagePath(
  raw: string | null | undefined,
): string | undefined {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) return undefined
  if (/^https?:\/\//i.test(trimmed)) return safeHttpUrl(trimmed)
  const rel = trimmed.replace(/^\/+/, '')
  if (!rel || rel.includes('..') || rel.includes('\\') || rel.includes(':')) {
    return undefined
  }
  if (!/^[A-Za-z0-9][\w./\-]*$/.test(rel)) return undefined
  return rel
}
