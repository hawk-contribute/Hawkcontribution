/**
 * Build share-intent URLs for X (Twitter), Facebook, and Telegram.
 * Uses official public endpoints only — no API keys.
 */

export function xIntentUrl(text: string, url?: string): string {
  const u = new URL('https://twitter.com/intent/tweet')
  const trimmed = text.trim()
  if (trimmed) u.searchParams.set('text', trimmed)
  const safe = (url ?? '').trim()
  if (safe) u.searchParams.set('url', safe)
  return u.toString()
}

export function facebookSharerUrl(url: string): string {
  const u = new URL('https://www.facebook.com/sharer/sharer.php')
  u.searchParams.set('u', url)
  return u.toString()
}

/** Telegram share: https://t.me/share/url?url=…&text=… */
export function telegramShareUrl(url: string, text?: string): string {
  const u = new URL('https://t.me/share/url')
  u.searchParams.set('url', url)
  const trimmed = (text ?? '').trim()
  if (trimmed) u.searchParams.set('text', trimmed)
  return u.toString()
}

/** Canonical deep-link to a feed contribution on this Pages site. */
export function contributionShareUrl(contributionId: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://hawk-contribute.github.io'
  const path = `${base.replace(/\/?$/, '/')}`
  return `${origin}${path}#feed-${contributionId}`
}

export function buildCiteShareText(input: {
  title: string
  authorName: string
  remark?: string
}): string {
  const remark = (input.remark ?? '').trim()
  const core = `“${input.title}” — ${input.authorName}`
  return remark ? `${remark}\n\n${core}` : core
}

/** Open a share URL in a new tab (noopener). */
export function openShareWindow(href: string): void {
  if (!href) return
  window.open(href, '_blank', 'noopener,noreferrer')
}
