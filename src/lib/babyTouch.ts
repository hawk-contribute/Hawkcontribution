/**
 * Super Dad / Baby Touch (不止能陪) — idle-friendly points + combo rules.
 *
 * Shared Hawk Games account (via onRoundComplete / recordGameActivity):
 * - Successful touch: +3 pts (Gentle / Playful) or +4 pts (Crazy)
 * - Crazy-mode left-then-right cheek combo: +8 pts (8s window)
 * - Same-zone cooldown (~420ms) so mash-tapping cannot farm
 * - Session cap 90 pts (leave the game and re-enter to start a new session)
 * Play stays unlimited after the cap; only account points stop.
 *
 * Crazy combo: tap left cheek then right cheek (or vice versa) within 8s.
 *
 * Marquee: the view batches pending points (flush at 12 pts, on leave, or at cap)
 * so each cuddle does not spam the activity ticker.
 */

export const BABY_TOUCH_GAME_ID = 'babyTouch' as const

export type BabyMode = 'gentle' | 'funny' | 'crazy'
export type BabyZone = 'hair' | 'cheekL' | 'cheekR' | 'palm' | 'shoulder' | 'belly' | 'feet'
export type BabyPose = 'idle' | 'nuzzle' | 'pout' | 'grab' | 'cuddle' | 'tickle' | 'kick' | 'crazy'
export type CheekSide = 'left' | 'right'

export const BABY_TOUCH_POINTS = {
  touch: 3,
  crazyTouch: 4,
  combo: 8,
} as const

export const BABY_TOUCH_SESSION_CAP = 90
export const BABY_TOUCH_COOLDOWN_MS = 420
export const BABY_COMBO_WINDOW_MS = 8000
export const BABY_COMBO_MIN_EACH = 1
/** Flush batched account points once this many are pending. */
export const BABY_BATCH_FLUSH_AT = 12
export const BABY_REACTION_MS = 2400

export interface CheekTap {
  side: CheekSide
  at: number
}

export function pointsForAction(mode: BabyMode, combo: boolean): number {
  if (combo) return BABY_TOUCH_POINTS.combo
  return mode === 'crazy' ? BABY_TOUCH_POINTS.crazyTouch : BABY_TOUCH_POINTS.touch
}

export function clampSessionAward(already: number, next: number, cap = BABY_TOUCH_SESSION_CAP): number {
  if (!Number.isFinite(already) || already < 0) already = 0
  if (!Number.isFinite(next) || next <= 0) return 0
  return Math.max(0, Math.min(next, cap - already))
}

export function comboProgress(
  taps: readonly CheekTap[],
  now: number,
  windowMs = BABY_COMBO_WINDOW_MS,
): { left: number; right: number; ready: boolean } {
  const recent = taps.filter((t) => now - t.at <= windowMs)
  let left = 0
  let right = 0
  for (const t of recent) {
    if (t.side === 'left') left += 1
    else right += 1
  }
  return {
    left,
    right,
    ready: left >= BABY_COMBO_MIN_EACH && right >= BABY_COMBO_MIN_EACH,
  }
}

export function detectCrazyCombo(
  taps: readonly CheekTap[],
  now: number,
  windowMs = BABY_COMBO_WINDOW_MS,
): boolean {
  return comboProgress(taps, now, windowMs).ready
}

export function pruneCheekTaps(
  taps: readonly CheekTap[],
  now: number,
  windowMs = BABY_COMBO_WINDOW_MS,
): CheekTap[] {
  return taps.filter((t) => now - t.at <= windowMs)
}

export function poseForZone(zone: BabyZone): BabyPose {
  switch (zone) {
    case 'hair':
      return 'nuzzle'
    case 'cheekL':
    case 'cheekR':
      return 'pout'
    case 'palm':
      return 'grab'
    case 'shoulder':
      return 'cuddle'
    case 'belly':
      return 'tickle'
    case 'feet':
      return 'kick'
  }
}

export function reactionCopyKey(pose: BabyPose): string {
  switch (pose) {
    case 'nuzzle':
      return 'babyTouch.reactHair'
    case 'pout':
      return 'babyTouch.reactCheek'
    case 'grab':
      return 'babyTouch.reactPalm'
    case 'cuddle':
      return 'babyTouch.reactShoulder'
    case 'tickle':
      return 'babyTouch.reactBelly'
    case 'kick':
      return 'babyTouch.reactFoot'
    case 'crazy':
      return 'babyTouch.reactCrazy'
    default:
      return 'babyTouch.subtitle'
  }
}

export function zoneLabelKey(zone: BabyZone): string {
  switch (zone) {
    case 'hair':
      return 'babyTouch.zoneHair'
    case 'cheekL':
      return 'babyTouch.zoneCheekL'
    case 'cheekR':
      return 'babyTouch.zoneCheekR'
    case 'palm':
      return 'babyTouch.zonePalm'
    case 'shoulder':
      return 'babyTouch.zoneShoulder'
    case 'belly':
      return 'babyTouch.zoneBelly'
    case 'feet':
      return 'babyTouch.zoneFeet'
  }
}

export function sfxIntensity(mode: BabyMode): number {
  if (mode === 'gentle') return 0.55
  if (mode === 'crazy') return 1.4
  return 1
}

/** Distinct, interruptible CSS class per reaction (readable even on a phone). */
export function reactClassForPose(pose: BabyPose): string {
  switch (pose) {
    case 'nuzzle':
      return 'baby-react-wag'
    case 'pout':
      return 'baby-react-pout'
    case 'grab':
      return 'baby-react-wave'
    case 'cuddle':
      return 'baby-react-hug'
    case 'tickle':
      return 'baby-react-roll'
    case 'kick':
      return 'baby-react-lift'
    case 'crazy':
      return 'baby-react-crazy'
    default:
      return 'baby-react-idle'
  }
}

/** Hold long enough for the named motion to finish; still interruptible via poseTick. */
export function reactionHoldMs(mode: BabyMode, pose: BabyPose): number {
  const gentleBonus = mode === 'gentle' ? 500 : 0
  const extra =
    pose === 'tickle' || pose === 'crazy'
      ? 520
      : pose === 'kick' || pose === 'grab' || pose === 'nuzzle'
        ? 320
        : 80
  return BABY_REACTION_MS + gentleBonus + extra
}
