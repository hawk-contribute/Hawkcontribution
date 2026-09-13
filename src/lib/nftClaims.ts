import type { NftClaimsMap } from '../types'
import { broadcastStoreUpdate } from './sync'

export const NFT_CLAIMS_KEY = 'hawk-contribute:nft-claims'

function loadMap(): NftClaimsMap {
  try {
    const raw = localStorage.getItem(NFT_CLAIMS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as NftClaimsMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveMap(map: NftClaimsMap): void {
  localStorage.setItem(NFT_CLAIMS_KEY, JSON.stringify(map))
  broadcastStoreUpdate()
}

export function getClaimsForEmail(email: string): Record<string, { claimedAt: string }> {
  return loadMap()[email] ?? {}
}

export function isNftClaimed(email: string, nftId: string): boolean {
  return !!getClaimsForEmail(email)[nftId]
}

export function claimNft(
  email: string,
  nftId: string,
): { claimedAt: string } | null {
  const map = loadMap()
  const user = { ...(map[email] ?? {}) }
  if (user[nftId]) return null
  const entry = { claimedAt: new Date().toISOString() }
  user[nftId] = entry
  map[email] = user
  saveMap(map)
  return entry
}

export function loadAllNftClaims(): NftClaimsMap {
  return loadMap()
}
