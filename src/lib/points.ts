import type { PointsAccount, PointsMap, PointsRound } from '../types'
import { broadcastStoreUpdate } from './sync'

export const POINTS_KEY = 'hawk-contribute:points'

/** FUTURE REWARDS: map PointsAccount.total through evaluateRewardEligibility(email, total). */

function nowIso(): string {
  return new Date().toISOString()
}

function loadMap(): PointsMap {
  try {
    const raw = localStorage.getItem(POINTS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as PointsMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveMap(map: PointsMap): void {
  localStorage.setItem(POINTS_KEY, JSON.stringify(map))
  broadcastStoreUpdate()
}

export function getPointsAccount(email: string): PointsAccount {
  const map = loadMap()
  return map[email] ?? { total: 0, history: [] }
}

export function getTotalPointsAll(): number {
  return Object.values(loadMap()).reduce((n, a) => n + (a.total ?? 0), 0)
}

export function addRoundPoints(
  email: string,
  score: number,
  hits: number,
): PointsAccount {
  const map = loadMap()
  const current = map[email] ?? { total: 0, history: [] }
  const round: PointsRound = {
    at: nowIso(),
    score,
    hits,
  }
  const next: PointsAccount = {
    total: current.total + Math.max(0, score),
    history: [round, ...current.history].slice(0, 50),
    updatedAt: round.at,
  }
  map[email] = next
  saveMap(map)
  return next
}

export function loadPointsMap(): PointsMap {
  return loadMap()
}

/** Award non-game bonus points (e.g. content contribution). */
export function addBonusPoints(email: string, points: number): PointsAccount {
  const map = loadMap()
  const current = map[email] ?? { total: 0, history: [] }
  const score = Math.max(0, Math.floor(points))
  if (score <= 0) return current
  const at = nowIso()
  const round: PointsRound = {
    at,
    score,
    hits: 0,
  }
  const next: PointsAccount = {
    total: current.total + score,
    history: [round, ...current.history].slice(0, 50),
    updatedAt: at,
  }
  map[email] = next
  saveMap(map)
  return next
}

/**
 * Claw back bonus points (e.g. admin deleted a rewarded contribution).
 * Total never goes below 0.
 */
export function subtractBonusPoints(
  email: string,
  points: number,
): PointsAccount {
  const map = loadMap()
  const current = map[email] ?? { total: 0, history: [] }
  const amount = Math.max(0, Math.floor(points))
  if (amount <= 0) return current
  const at = nowIso()
  const deducted = Math.min(current.total, amount)
  const round: PointsRound = {
    at,
    score: -deducted,
    hits: 0,
  }
  const next: PointsAccount = {
    total: Math.max(0, current.total - amount),
    history: [round, ...current.history].slice(0, 50),
    updatedAt: at,
  }
  map[email] = next
  saveMap(map)
  return next
}

/** Set local total exactly (used after a cloud clawback). Floor at 0. */
export function setPointsTotal(email: string, total: number): PointsAccount {
  const map = loadMap()
  const current = map[email] ?? { total: 0, history: [] }
  const nextTotal = Math.max(0, Math.floor(total))
  const at = nowIso()
  const next: PointsAccount = {
    total: nextTotal,
    history: current.history,
    updatedAt: at,
  }
  map[email] = next
  saveMap(map)
  return next
}

export function localPointsUpdatedAtMs(account: PointsAccount): number {
  if (account.updatedAt) {
    const t = new Date(account.updatedAt).getTime()
    if (Number.isFinite(t)) return t
  }
  const last = account.history[0]?.at
  if (last) {
    const t = new Date(last).getTime()
    if (Number.isFinite(t)) return t
  }
  return 0
}
