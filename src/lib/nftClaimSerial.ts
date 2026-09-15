/**
 * Global claim serial (領取序號) helpers.
 *
 * Rule: one monotonic sequence across all users and NFT types.
 * First successful claim is 1, then 2, 3, … (zero-padded to 6 digits in the UI).
 *
 * When the user is signed in, Supabase `nft_claim_serial_seq` is the source of
 * truth. LocalStorage assigns a best-effort serial for offline / no-cloud
 * claims and is overwritten if the cloud returns a different value.
 * Legacy claims without `claimSerial` stay unnumbered (display "—").
 */

export const NFT_CLAIM_SERIAL_WATERMARK_KEY =
  'hawk-contribute:nft-claim-serial-hi'

const SERIAL_DIGITS = 6

export function isValidClaimSerial(n: unknown): n is number {
  return (
    typeof n === 'number' &&
    Number.isInteger(n) &&
    n >= 1 &&
    n <= Number.MAX_SAFE_INTEGER
  )
}

export function parseClaimSerial(raw: unknown): number | undefined {
  if (isValidClaimSerial(raw)) return raw
  if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) {
    const n = Number(raw.trim())
    if (isValidClaimSerial(n)) return n
  }
  return undefined
}

/** Zero-padded digits, or "—" when the claim has no serial. */
export function formatClaimSerial(serial: number | undefined): string {
  if (!isValidClaimSerial(serial)) return '—'
  return String(serial).padStart(SERIAL_DIGITS, '0')
}

export function maxSerialFromEntries(
  entries: Iterable<{ claimSerial?: number }>,
): number {
  let max = 0
  for (const entry of entries) {
    if (isValidClaimSerial(entry.claimSerial) && entry.claimSerial > max) {
      max = entry.claimSerial
    }
  }
  return max
}

export function readSerialWatermark(): number {
  try {
    const n = Number(localStorage.getItem(NFT_CLAIM_SERIAL_WATERMARK_KEY))
    return isValidClaimSerial(n) ? n : 0
  } catch {
    return 0
  }
}

export function noteSerialWatermark(serial: number): void {
  if (!isValidClaimSerial(serial)) return
  try {
    const hi = readSerialWatermark()
    if (serial > hi) {
      localStorage.setItem(NFT_CLAIM_SERIAL_WATERMARK_KEY, String(serial))
    }
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Next local serial: max(watermark, serials already stored) + 1.
 * Used only when the cloud sequence is unavailable.
 */
export function allocateLocalClaimSerial(
  existing: Iterable<{ claimSerial?: number }>,
): number {
  const next = Math.max(maxSerialFromEntries(existing), readSerialWatermark()) + 1
  noteSerialWatermark(next)
  return next
}
