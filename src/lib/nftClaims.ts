import type { NftClaimEntry, NftClaimsMap } from '../types'
import {
  allocateLocalClaimSerial,
  noteSerialWatermark,
  parseClaimSerial,
} from './nftClaimSerial'
import { broadcastStoreUpdate } from './sync'

export const NFT_CLAIMS_KEY = 'hawk-contribute:nft-claims'

function parseEntry(raw: unknown): NftClaimEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const claimedAt =
    typeof o.claimedAt === 'string' && o.claimedAt ? o.claimedAt : null
  if (!claimedAt) return null
  const claimSerial = parseClaimSerial(o.claimSerial)
  return claimSerial !== undefined ? { claimedAt, claimSerial } : { claimedAt }
}

function loadMap(): NftClaimsMap {
  try {
    const raw = localStorage.getItem(NFT_CLAIMS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    const out: NftClaimsMap = {}
    for (const [email, user] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (!user || typeof user !== 'object') continue
      const claims: Record<string, NftClaimEntry> = {}
      for (const [nftId, entry] of Object.entries(
        user as Record<string, unknown>,
      )) {
        const parsedEntry = parseEntry(entry)
        if (parsedEntry) claims[nftId] = parsedEntry
      }
      if (Object.keys(claims).length) out[email] = claims
    }
    return out
  } catch {
    return {}
  }
}

function saveMap(map: NftClaimsMap): void {
  localStorage.setItem(NFT_CLAIMS_KEY, JSON.stringify(map))
  broadcastStoreUpdate()
}

function allStoredEntries(map: NftClaimsMap): NftClaimEntry[] {
  const out: NftClaimEntry[] = []
  for (const user of Object.values(map)) {
    out.push(...Object.values(user))
  }
  return out
}

export function getClaimsForEmail(email: string): Record<string, NftClaimEntry> {
  return loadMap()[email] ?? {}
}

export function isNftClaimed(email: string, nftId: string): boolean {
  return !!getClaimsForEmail(email)[nftId]
}

export function claimNft(email: string, nftId: string): NftClaimEntry | null {
  const map = loadMap()
  const user = { ...(map[email] ?? {}) }
  if (user[nftId]) return null
  const claimSerial = allocateLocalClaimSerial(allStoredEntries(map))
  const entry: NftClaimEntry = {
    claimedAt: new Date().toISOString(),
    claimSerial,
  }
  user[nftId] = entry
  map[email] = user
  saveMap(map)
  return entry
}

/** Merge cloud serial / timestamp onto an existing local claim. */
export function patchNftClaim(
  email: string,
  nftId: string,
  patch: Partial<NftClaimEntry>,
): NftClaimEntry | null {
  const map = loadMap()
  const user = { ...(map[email] ?? {}) }
  const prev = user[nftId]
  if (!prev) return null
  const next: NftClaimEntry = { ...prev }
  if (typeof patch.claimedAt === 'string' && patch.claimedAt) {
    next.claimedAt = patch.claimedAt
  }
  const serial = parseClaimSerial(patch.claimSerial)
  if (serial !== undefined) {
    next.claimSerial = serial
    noteSerialWatermark(serial)
  }
  user[nftId] = next
  map[email] = user
  saveMap(map)
  return next
}

export function loadAllNftClaims(): NftClaimsMap {
  return loadMap()
}
