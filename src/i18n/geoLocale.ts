import type { Locale } from './types'
import { detectDefaultLocale } from './translations'

/** Free HTTPS JSON geo API (country_code). Client-side only; no IP logging. */
const GEO_URL = 'https://ipapi.co/json/'
const GEO_TIMEOUT_MS = 2500

/**
 * Map ISO country code → UI locale.
 * CN → zh-CN; TW/HK/MO/SG → zh-TW; else en.
 */
export function countryCodeToLocale(countryCode: string | undefined | null): Locale {
  const code = (countryCode || '').trim().toUpperCase()
  if (code === 'CN') return 'zh-CN'
  if (code === 'TW' || code === 'HK' || code === 'MO' || code === 'SG') return 'zh-TW'
  return 'en'
}

/**
 * One-shot IP region lookup. Does not log IPs or response bodies.
 * On failure/timeout returns null so callers keep navigator/en fallback.
 */
export async function detectLocaleFromIp(): Promise<Locale | null> {
  if (typeof fetch === 'undefined') return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS)

  try {
    const res = await fetch(GEO_URL, {
      signal: controller.signal,
      // Avoid cookies; privacy-friendly one-shot
      credentials: 'omit',
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = (await res.json()) as { country_code?: string }
    if (!data?.country_code || typeof data.country_code !== 'string') return null
    return countryCodeToLocale(data.country_code)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Resolve first-visit locale: IP region when available, else navigator.language mapping, else en.
 * Never persists — only an explicit setLocale (language switcher) should write preference.
 */
export async function resolveFirstVisitLocale(): Promise<Locale> {
  const fromIp = await detectLocaleFromIp()
  if (fromIp) return fromIp
  return detectDefaultLocale()
}
