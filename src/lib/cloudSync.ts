import { supabase } from './supabase'
import {
  getClaimsForEmail,
  claimNft as claimNftLocal,
  loadAllNftClaims,
  patchNftClaim,
} from './nftClaims'
import { noteSerialWatermark, parseClaimSerial } from './nftClaimSerial'
import type { NftClaimEntry } from '../types'
import {
  getPointsAccount,
  loadPointsMap,
  localPointsUpdatedAtMs,
  setPointsTotal,
} from './points'
import { broadcastStoreUpdate } from './sync'
import { setLocalEligibilityResetAt } from './contributeEligibility'

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
    const nextTotal = Math.max(current.total, total)
    map[email] = {
      ...current,
      total: nextTotal,
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem(POINTS_KEY, JSON.stringify(map))
    broadcastStoreUpdate()
  } catch {
    /* ignore */
  }
}

function writeLocalClaims(
  email: string,
  claims: Record<string, NftClaimEntry>,
): void {
  try {
    const map = loadAllNftClaims()
    const existing = map[email] ?? {}
    const merged: Record<string, NftClaimEntry> = { ...existing }
    for (const [nftId, remote] of Object.entries(claims)) {
      const prev = existing[nftId]
      const claimSerial = remote.claimSerial ?? prev?.claimSerial
      merged[nftId] = {
        claimedAt: remote.claimedAt || prev?.claimedAt || new Date().toISOString(),
        ...(claimSerial !== undefined ? { claimSerial } : {}),
      }
      if (claimSerial !== undefined) noteSerialWatermark(claimSerial)
    }
    map[email] = merged
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
  walletAddress?: string | null
}): Promise<void> {
  try {
    const row: Record<string, unknown> = {
      id: input.userId,
      display_name: input.displayName,
    }
    // Store real emails only; synthetic wallet keys stay out of profiles.email
    const email = input.email.trim()
    if (email && !email.endsWith('@ethereum.wallet') && !email.startsWith('uid:')) {
      row.email = email
    }
    const wallet = input.walletAddress?.trim()
    if (wallet) {
      row.wallet_address = wallet.toLowerCase()
    }
    await supabase.from('profiles').upsert(row, { onConflict: 'id' })
  } catch (e) {
    console.warn('[hawk-contribute] profile upsert failed', e)
  }
}

/** Pull cloud points into local cache; prefer the higher total unless cloud is newer and lower (admin clawback). */
export async function syncPointsFromCloud(
  userId: string,
  email: string,
): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('game_points')
      .select('total, updated_at')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    const remote = typeof data?.total === 'number' ? data.total : null
    if (remote == null) return null
    const localAccount = getPointsAccount(email)
    const local = localAccount.total
    const remoteAt = data?.updated_at
      ? new Date(String(data.updated_at)).getTime()
      : 0
    const localAt = localPointsUpdatedAtMs(localAccount)
    const cloudIsNewerLower =
      Number.isFinite(remoteAt) && remoteAt > localAt && remote < local
    if (cloudIsNewerLower) {
      setPointsTotal(email, remote)
      return remote
    }
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

/**
 * Site-admin RPC: subtract 500 from the author's game_points (floor 0).
 * Returns the new total, or null if no row / not admin / RPC failed.
 */
export async function clawbackContributePointsCloud(
  userId: string,
): Promise<number | null> {
  try {
    const { data, error } = await supabase.rpc('clawback_contribute_points', {
      p_user_id: userId,
    })
    if (error) throw error
    return typeof data === 'number' ? data : null
  } catch (e) {
    console.warn('[hawk-contribute] contribute clawback failed', e)
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
): Promise<Record<string, NftClaimEntry> | null> {
  try {
    const { data, error } = await supabase
      .from('nft_claims')
      .select('nft_id, claimed_at, claim_serial')
      .eq('user_id', userId)
    if (error) throw error
    const remote: Record<string, NftClaimEntry> = {}
    for (const row of data ?? []) {
      if (row.nft_id) {
        const claimSerial = parseClaimSerial(row.claim_serial)
        remote[row.nft_id] = {
          claimedAt: row.claimed_at ?? new Date().toISOString(),
          ...(claimSerial !== undefined ? { claimSerial } : {}),
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


/** Current claim-cycle epoch for this user (null = count all own posts). */
export async function fetchContributeEligibilityResetAt(
  userId: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('contribute_eligibility_reset_at')
      .eq('id', userId)
      .maybeSingle()
    if (error) throw error
    const v = data?.contribute_eligibility_reset_at
    return typeof v === 'string' && v ? v : null
  } catch (e) {
    console.warn('[hawk-contribute] eligibility reset fetch failed', e)
    return null
  }
}

/**
 * After a successful NFT claim: advance this user's eligibility epoch so
 * prior contributions no longer count toward the next claim (posts stay).
 */
export async function resetContributeEligibilityAfterClaim(
  userId: string,
): Promise<string | null> {
  const at = new Date().toISOString()
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        contribute_eligibility_reset_at: at,
        updated_at: at,
      })
      .eq('id', userId)
    if (error) throw error
    return at
  } catch (e) {
    console.warn('[hawk-contribute] eligibility reset after claim failed', e)
    return null
  }
}

export async function claimNftCloud(
  userId: string,
  email: string,
  nftId: string,
): Promise<NftClaimEntry | null> {
  const local = claimNftLocal(email, nftId)
  if (!local) return null
  let cloudOk = false
  try {
    // Insert only (no client-supplied serial). A BEFORE INSERT trigger assigns
    // the global sequence. Do not upsert: nft_claims has no UPDATE policy, and
    // serials must stay immutable.
    const inserted = await supabase
      .from('nft_claims')
      .insert({
        user_id: userId,
        nft_id: nftId,
        claimed_at: local.claimedAt,
      })
      .select('claimed_at, claim_serial')
      .maybeSingle()
    let row = inserted.data
    if (inserted.error || !row) {
      const existing = await supabase
        .from('nft_claims')
        .select('claimed_at, claim_serial')
        .eq('user_id', userId)
        .eq('nft_id', nftId)
        .maybeSingle()
      if (existing.error) throw existing.error
      row = existing.data
    }
    if (row) {
      cloudOk = true
      const cloudSerial = parseClaimSerial(row.claim_serial)
      const claimedAt =
        typeof row.claimed_at === 'string' && row.claimed_at
          ? row.claimed_at
          : local.claimedAt
      patchNftClaim(email, nftId, {
        claimedAt,
        ...(cloudSerial !== undefined ? { claimSerial: cloudSerial } : {}),
      })
    }
  } catch (e) {
    console.warn('[hawk-contribute] nft claim cloud write failed', e)
  }
  // Clear personal contribution-value progress for the next claim cycle.
  // Prefer cloud success; still reset locally-tracked epoch when cloud wrote.
  if (cloudOk) {
    const at = await resetContributeEligibilityAfterClaim(userId)
    setLocalEligibilityResetAt(email, at ?? local.claimedAt)
  } else {
    // Offline / cloud write failed: still start a new local claim cycle.
    setLocalEligibilityResetAt(email, local.claimedAt)
  }
  const latest = getClaimsForEmail(email)[nftId]
  return latest ?? local
}
