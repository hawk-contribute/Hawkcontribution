import { isValidClaimSerial } from './nftClaimSerial'

/**
 * Off-chain anti-counterfeit code (防偽碼) derived from claim data.
 * Deterministic FNV-1a so the same serial + NFT id + claim time always
 * reprint the same label. This is a visible distinguisher for casual
 * screenshots of the raw art — not a cryptographic signature.
 */
const FNV_OFFSET = 0x811c9dc5
const FNV_PRIME = 0x01000193

function fnv1a32(input: string): number {
  let h = FNV_OFFSET
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, FNV_PRIME)
  }
  return h >>> 0
}

export type NftAuthCodeInput = {
  nftId: string
  claimedAt?: string
  claimSerial?: number
}

export function nftAuthPayload(input: NftAuthCodeInput): string | null {
  const nftId = input.nftId.trim()
  const claimedAt = (input.claimedAt ?? '').trim()
  if (!nftId || !claimedAt) return null
  const serial = isValidClaimSerial(input.claimSerial)
    ? String(input.claimSerial)
    : 'NONE'
  return `HAWK-VOUCHER|${serial}|${nftId}|${claimedAt}`
}

/** Display form: HK-A7F3-9C2B */
export function formatNftAuthCode(input: NftAuthCodeInput): string | null {
  const payload = nftAuthPayload(input)
  if (!payload) return null
  const hex = fnv1a32(payload).toString(16).toUpperCase().padStart(8, '0')
  return `HK-${hex.slice(0, 4)}-${hex.slice(4)}`
}

export function nftAuthCodeLines(code: string | null): {
  line1: string
  line2: string
} {
  if (!code) return { line1: '—', line2: '' }
  const parts = code.split('-')
  if (parts.length >= 3) {
    return { line1: `${parts[0]}-${parts[1]}`, line2: parts.slice(2).join('-') }
  }
  return { line1: code, line2: '' }
}
