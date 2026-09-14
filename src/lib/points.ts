import type { PointsAccount, PointsMap, PointsRound } from '../types'
import { broadcastStoreUpdate } from './sync'

export const POINTS_KEY = 'hawk-contribute:points'

/** FUTURE REWARDS: map PointsAccount.total through evaluateRewardEligibility(email, total). */

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
    at: new Date().toISOString(),
    score,
    hits,
  }
  const next: PointsAccount = {
    total: current.total + Math.max(0, score),
    history: [round, ...current.history].slice(0, 50),
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
  const round: PointsRound = {
    at: new Date().toISOString(),
    score,
    hits: 0,
  }
  const next: PointsAccount = {
    total: current.total + score,
    history: [round, ...current.history].slice(0, 50),
  }
  map[email] = next
  saveMap(map)
  return next
}
