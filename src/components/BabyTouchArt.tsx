import { useEffect, useMemo, useState } from 'react'
import type { BabyMode, BabyPose } from '../lib/babyTouch'
import { asset } from '../lib/asset'

const NURSERY_SRC = asset('game/baby-touch/nursery.png')
const COVER_SRC = asset('game/baby-touch/cover.png')
const POSE_TICKLE_LOOK = asset('game/baby-touch/pose-tickle-look.png')
const POSE_TICKLE_SIT = asset('game/baby-touch/pose-tickle-sit.png')
const POSE_TICKLE_MID = asset('game/baby-touch/pose-tickle-mid.png')
const POSE_TICKLE_ROLL = asset('game/baby-touch/pose-tickle-roll.png')
const POSE_KICK_LIFT = asset('game/baby-touch/pose-kick-lift.png')
const POSE_KICK = asset('game/baby-touch/pose-kick.png')
const POSE_NUZZLE_LEAN = asset('game/baby-touch/pose-nuzzle-lean.png')
const POSE_NUZZLE = asset('game/baby-touch/pose-nuzzle.png')
const POSE_LAUGH = asset('game/baby-touch/pose-laugh-sit.png')
const POSE_GRAB_REACH = asset('game/baby-touch/pose-grab-reach.png')
const POSE_CUDDLE = asset('game/baby-touch/pose-cuddle.png')

const PRELOAD = [
  NURSERY_SRC,
  POSE_TICKLE_LOOK,
  POSE_TICKLE_SIT,
  POSE_TICKLE_MID,
  POSE_TICKLE_ROLL,
  POSE_KICK_LIFT,
  POSE_KICK,
  POSE_NUZZLE_LEAN,
  POSE_NUZZLE,
  POSE_LAUGH,
  POSE_GRAB_REACH,
  POSE_CUDDLE,
]

if (typeof window !== 'undefined') {
  PRELOAD.forEach((src) => {
    const img = new Image()
    img.src = src
  })
}

export type BabyFocusSide = 'left' | 'right' | null

export function BabyTouchCover() {
  return (
    <div className="baby-scene pointer-events-none relative h-full w-full overflow-hidden bg-[#f6e7c4]">
      <img
        src={COVER_SRC}
        alt=""
        className="h-full w-full object-cover object-[50%_28%] transition duration-300 group-hover:scale-105"
      />
    </div>
  )
}

function tempoScale(mode: BabyMode): number {
  if (mode === 'gentle') return 1.2
  if (mode === 'crazy') return 0.62
  return 0.9
}

function tempoClass(mode: BabyMode): string {
  if (mode === 'gentle') return 'baby-tempo-gentle'
  if (mode === 'crazy') return 'baby-tempo-crazy'
  return 'baby-tempo-funny'
}

function beats(mode: BabyMode, ms: number[]): number[] {
  const t = tempoScale(mode)
  return ms.map((n) => Math.round(n * t))
}

/**
 * 4–5 painted frames per tap. Times are delays from tap start (ms).
 * Anticipation → peak → settle. Framing stays locked — no stage bounce.
 */
function clipFor(pose: BabyPose, mode: BabyMode): { srcs: string[]; at: number[] } {
  switch (pose) {
    case 'tickle':
      return {
        srcs: [NURSERY_SRC, POSE_TICKLE_LOOK, POSE_TICKLE_SIT, POSE_TICKLE_MID, POSE_TICKLE_ROLL],
        at: beats(mode, [0, 140, 340, 600, 940]),
      }
    case 'crazy':
      return {
        srcs: [NURSERY_SRC, POSE_LAUGH, POSE_TICKLE_SIT, POSE_TICKLE_MID, POSE_TICKLE_ROLL],
        at: beats(mode, [0, 90, 260, 500, 820]),
      }
    case 'kick':
      return {
        srcs: [NURSERY_SRC, POSE_LAUGH, POSE_KICK_LIFT, POSE_KICK],
        at: beats(mode, [0, 130, 360, 700]),
      }
    case 'nuzzle':
      return {
        srcs: [NURSERY_SRC, POSE_LAUGH, POSE_NUZZLE_LEAN, POSE_NUZZLE],
        at: beats(mode, [0, 140, 380, 720]),
      }
    case 'pout':
      return {
        srcs: [NURSERY_SRC, POSE_NUZZLE_LEAN, POSE_LAUGH, POSE_NUZZLE],
        at: beats(mode, [0, 130, 360, 700]),
      }
    case 'grab':
      return {
        srcs: [NURSERY_SRC, POSE_LAUGH, POSE_GRAB_REACH],
        at: beats(mode, [0, 150, 520]),
      }
    case 'cuddle':
      return {
        srcs: [NURSERY_SRC, POSE_LAUGH, POSE_CUDDLE],
        at: beats(mode, [0, 160, 540]),
      }
    default:
      return { srcs: [NURSERY_SRC], at: [0] }
  }
}

function PoseReel({
  pose,
  mode,
  poseTick,
}: {
  pose: BabyPose
  mode: BabyMode
  poseTick: number
}) {
  const clip = useMemo(() => clipFor(pose, mode), [pose, mode])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timers = clip.at.slice(1).map((delay, i) => window.setTimeout(() => setIndex(i + 1), delay))
    return () => {
      for (const id of timers) window.clearTimeout(id)
    }
  }, [clip, poseTick])

  return (
    <div className="baby-reel" data-frame={index}>
      {clip.srcs.map((src, i) => (
        <img
          key={`${src}-${i}`}
          src={src}
          alt=""
          draggable={false}
          className={`baby-reel-frame${i <= index ? ' is-on' : ''}`}
          style={{ zIndex: i + 1 }}
        />
      ))}
    </div>
  )
}

export function NurseryScene({
  pose,
  mode,
  focusSide = null,
  poseTick = 0,
  comic = null,
  hit = null,
}: {
  pose: BabyPose
  mode: BabyMode
  focusSide?: BabyFocusSide
  poseTick?: number
  comic?: string | null
  hit?: { x: number; y: number } | null
}) {
  const comicSide = pose === 'kick' ? 'is-left' : 'is-right'

  return (
    <div
      key={poseTick}
      className={`baby-art absolute inset-0 ${tempoClass(mode)}`}
      data-pose={pose}
      data-limb={focusSide ?? 'both'}
      data-mode={mode}
    >
      <PoseReel pose={pose} mode={mode} poseTick={poseTick} />

      {pose === 'nuzzle' && mode !== 'gentle' && (
        <span className="baby-fx-laugh baby-fx-laugh-c" aria-hidden>
          呵呵
        </span>
      )}
      {pose === 'nuzzle' && mode === 'gentle' && (
        <span className="baby-fx-zzz" aria-hidden>
          z z
        </span>
      )}
      {pose === 'grab' && (
        <span className="baby-fx-laugh baby-fx-laugh-c" aria-hidden>
          hihi
        </span>
      )}
      {(pose === 'tickle' || pose === 'kick') && (
        <>
          <span className="baby-fx-spark" aria-hidden>
            ✦
          </span>
          <span className="baby-fx-laugh baby-fx-laugh-a" aria-hidden>
            哈哈
          </span>
          <span className="baby-fx-laugh baby-fx-laugh-b" aria-hidden>
            haha
          </span>
        </>
      )}
      {pose === 'grab' && (
        <span className="baby-fx-heart" aria-hidden>
          ♡
        </span>
      )}
      {pose === 'cuddle' && (
        <span className="baby-fx-heart" aria-hidden>
          ♡
        </span>
      )}
      {pose === 'crazy' && (
        <>
          <span className="baby-fx-spark baby-fx-spark-2" aria-hidden>
            ✦
          </span>
          <span className="baby-fx-laugh baby-fx-laugh-a" aria-hidden>
            哈哈
          </span>
          <span className="baby-fx-laugh baby-fx-laugh-b" aria-hidden>
            哇
          </span>
        </>
      )}

      {hit && pose !== 'idle' && (
        <div className="baby-hit-burst" style={{ left: `${hit.x}%`, top: `${hit.y}%` }}>
          <span className="baby-hit-glow" />
          <span className="baby-hit-ring" />
          <span className="baby-hit-spark baby-hit-spark-a">✦</span>
          <span className="baby-hit-spark baby-hit-spark-b">✦</span>
          <span className="baby-hit-spark baby-hit-spark-c">✧</span>
        </div>
      )}
      {comic && pose !== 'idle' && <div className={`baby-comic ${comicSide}`}>{comic}</div>}
    </div>
  )
}

export function BabySpeechBubble({ text }: { text: string }) {
  if (!text) return null
  return (
    <div className="baby-bubble w-full rounded-2xl border border-[#f0d7a4] bg-[#fffaf0] px-4 py-3 text-center text-sm font-semibold leading-snug text-[#6b4a32] shadow-[0_8px_20px_rgba(140,90,40,0.12)] sm:text-base">
      {text}
    </div>
  )
}
