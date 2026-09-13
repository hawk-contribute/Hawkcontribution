import { supabase } from './supabase'
import {
  getClaimsForEmail,
  claimNft as claimNftLocal,
  loadAllNftClaims,
} from './nftClaims'
import { getPointsAccount, loadPointsMap } from './points'
import { broadcastStoreUpdate } from './sync'

const POINTS_KEY = 'hawk-contribute:points'
const NFT_CLAIMS_KEY = 'hawk-contribute:nft-claims'
const PENDING_NAME_KEY = 'hawk-contribute:pending-display-name'

export function savePendingDisplayName(name: string | undefined): void {
  if (name?.trim()) {
    localStorage.setItem(PENDING_NAME_KEY, name.trim())
  } else {
    localStorage.removeItem(PENDING_NAME_KEY)
  }
}

export function peekPendingDisplayName(): string | null {
  return localStorage.getItem(PENDING_NAME_KEY)
}

export function takePendingDisplayName(): string | null {
  const v = localStorage.getItem(PENDING_NAME_KEY)
  if (v) localStorage.removeItem(PENDING_NAME_KEY)
  return v
}

function writeLocalPointsTotal(email: string, total: number): void {
  try {
    const map = loadPointsMap()
    const current = map[email] ?? { total: 0, history: [] }
    map[email] = { ...current, total: Math.max(current.total, total) }
    localStorage.setItem(POINTS_KEY, JSON.stringify(map))
    broadcastStoreUpdate()
  } catch {
    /* ignore */
  }
}

function writeLocalClaims(
  email: string,
  claims: Record<string, { claimedAt: string }>,
): void {
  try {
    const map = loadAllNftClaims()
    map[email] = { ...(map[email] ?? {}), ...claims }
    localStorage.setItem(NFT_CLAIMS_KEY, JSON.stringify(map))
    broadcastStoreUpdate()
  } catch {
    /* ignore */
  }
}

export async function upsertProfile(input: {
  userId: string
  email: string
  displayName: string
}): Promise<void> {
  try {
    await supabase.from('profiles').upsert(
      {
        id: input.userId,
        email: input.email,
        display_name: input.displayName,
      },
      { onConflict: 'id' },
    )
  } catch (e) {
    console.warn('[hawk-contribute] profile upsert failed', e)
  }
}

/** Pull cloud points into local cache; prefer the higher total. */
export async function syncPointsFromCloud(
  userId: string,
  email: string,
): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('game_points')
      .select('total')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    const remote = typeof data?.total === 'number' ? data.total : null
    if (remote == null) return null
    const local = getPointsAccount(email).total
    const merged = Math.max(local, remote)
    writeLocalPointsTotal(email, merged)
    if (merged > remote) {
      await upsertGamePoints(userId, merged)
    }
    return merged
  } catch (e) {
    console.warn('[hawk-contribute] points sync failed', e)
    return null
  }
}

export async function upsertGamePoints(
  userId: string,
  total: number,
): Promise<void> {
  try {
    await supabase.from('game_points').upsert(
      {
        user_id: userId,
        total: Math.max(0, total),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
  } catch (e) {
    console.warn('[hawk-contribute] game_points upsert failed', e)
  }
}

export async function syncNftClaimsFromCloud(
  userId: string,
  email: string,
): Promise<Record<string, { claimedAt: string }> | null> {
  try {
    const { data, error } = await supabase
      .from('nft_claims')
      .select('nft_id, claimed_at')
      .eq('user_id', userId)
    if (error) throw error
    const remote: Record<string, { claimedAt: string }> = {}
    for (const row of data ?? []) {
      if (row.nft_id) {
        remote[row.nft_id] = {
          claimedAt: row.claimed_at ?? new Date().toISOString(),
        }
      }
    }
    writeLocalClaims(email, remote)
    return { ...getClaimsForEmail(email) }
  } catch (e) {
    console.warn('[hawk-contribute] nft_claims sync failed', e)
    return null
  }
}

export async function claimNftCloud(
  userId: string,
  email: string,
  nftId: string,
): Promise<{ claimedAt: string } | null> {
  const local = claimNftLocal(email, nftId)
  if (!local) return null
  try {
    const { error } = await supabase.from('nft_claims').upsert(
      {
        user_id: userId,
        nft_id: nftId,
        claimed_at: local.claimedAt,
      },
      { onConflict: 'user_id,nft_id' },
    )
    if (error) throw error
  } catch (e) {
    console.warn('[hawk-contribute] nft claim cloud write failed', e)
  }
  return local
}
