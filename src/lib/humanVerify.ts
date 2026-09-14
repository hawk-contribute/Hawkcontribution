/**
 * Client-side anti-bot gate for NFT claim / download (v1 honest friction).
 * Not server-verified unless a future Supabase check is added.
 * Stores a short-lived claim_token in sessionStorage after the user passes.
 */

export const CLAIM_TOKEN_KEY = 'hawk-contribute:claim-token'
/** TTL after successful verification (12 minutes). */
export const CLAIM_TOKEN_TTL_MS = 12 * 60 * 1000

export type ClaimTokenRecord = {
  token: string
  issuedAt: number
  expiresAt: number
}

export function getTurnstileSiteKey(): string | undefined {
  const key = import.meta.env.VITE_TURNSTILE_SITE_KEY
  if (typeof key === 'string' && key.trim()) return key.trim()
  return undefined
}

function randomToken(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function readRecord(): ClaimTokenRecord | null {
  try {
    const raw = sessionStorage.getItem(CLAIM_TOKEN_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ClaimTokenRecord
    if (
      !parsed ||
      typeof parsed.token !== 'string' ||
      typeof parsed.expiresAt !== 'number'
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function writeRecord(record: ClaimTokenRecord): void {
  sessionStorage.setItem(CLAIM_TOKEN_KEY, JSON.stringify(record))
}

/** True if a non-expired claim_token is present. */
export function hasValidClaimToken(): boolean {
  const rec = readRecord()
  if (!rec) return false
  if (Date.now() >= rec.expiresAt) {
    clearClaimToken()
    return false
  }
  return true
}

export function getClaimToken(): string | null {
  if (!hasValidClaimToken()) return null
  return readRecord()?.token ?? null
}

/** Issue a fresh claim_token after human verification succeeds. */
export function issueClaimToken(): ClaimTokenRecord {
  const now = Date.now()
  const record: ClaimTokenRecord = {
    token: randomToken(),
    issuedAt: now,
    expiresAt: now + CLAIM_TOKEN_TTL_MS,
  }
  writeRecord(record)
  return record
}

/** Clear after one successful claim (or on expiry / reset). */
export function consumeClaimToken(): void {
  clearClaimToken()
}

export function clearClaimToken(): void {
  try {
    sessionStorage.removeItem(CLAIM_TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

/** Remaining ms until expiry, or 0. */
export function claimTokenRemainingMs(): number {
  const rec = readRecord()
  if (!rec) return 0
  return Math.max(0, rec.expiresAt - Date.now())
}
