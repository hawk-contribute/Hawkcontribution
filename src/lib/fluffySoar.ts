/** Fly, Fluffy Eagle / 飛吧！小鷹蓬蓬 — time-based session scoring. */

export const FLUFFY_SOAR_GAME_ID = 'fluffySoar' as const
export const FLUFFY_SOAR_POINTS_PER_TICK = 10
export const FLUFFY_SOAR_TICK_MS = 10_000
export const FLUFFY_SOAR_SESSION_CAP = 2_000

/** Points from elapsed play time: +10 every 10s, capped at 2000 per session. */
export function sessionScoreFromElapsed(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return 0
  const ticks = Math.floor(elapsedMs / FLUFFY_SOAR_TICK_MS)
  return Math.min(FLUFFY_SOAR_SESSION_CAP, ticks * FLUFFY_SOAR_POINTS_PER_TICK)
}

export function formatFlightTime(elapsedMs: number): string {
  const totalSec = Math.max(0, Math.floor(elapsedMs / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
