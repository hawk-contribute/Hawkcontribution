import { useEffect, useMemo, useState } from 'react'
import type { BabyMode, BabyPose } from '../lib/babyTouch'
import { asset } from '../lib/asset'

const NURSERY_SRC = asset('game/baby-touch/nursery.png')
const COVER_SRC = asset('game/baby-touch/cover.png')
const POSE_TICKLE_SIT = asset('game/baby-touch/pose-tickle-sit.png')
const POSE_TICKLE_ROLL = asset('game/baby-touch/pose-tickle-roll.png')
const POSE_KICK = asset('game/baby-touch/pose-kick.png')
const POSE_NUZZLE = asset('game/baby-touch/pose-nuzzle.png')
const POSE_LAUGH = asset('game/baby-touch/pose-laugh-sit.png')

if (typeof window !== 'undefined') {
  ;[NURSERY_SRC, POSE_TICKLE_SIT, POSE_TICKLE_ROLL, POSE_KICK, POSE_NUZZLE, POSE_LAUGH].forEach((src) => {
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
  if (mode === 'gentle') return 1.22
  if (mode === 'crazy') return 0.62
  return 0.88
}

function tempoClass(mode: BabyMode): string {
  if (mode === 'gentle') return 'baby-tempo-gentle'
  if (mode === 'crazy') return 'baby-tempo-crazy'
  return 'baby-tempo-funny'
}

/** 2–3 painted frames per tap. Times are delays from tap start (ms). Framing stays locked. */
function clipFor(pose: BabyPose, mode: BabyMode): { srcs: string[]; at: number[] } {
  const t = tempoScale(mode)
  switch (pose) {
    case 'tickle':
    case 'crazy':
      return {
        srcs: [NURSERY_SRC, POSE_TICKLE_SIT, POSE_TICKLE_ROLL],
        at: [0, Math.round(120 * t), Math.round(420 * t)],
      }
    case 'kick':
      return {
        srcs: [NURSERY_SRC, POSE_LAUGH, POSE_KICK],
        at: [0, Math.round(110 * t), Math.round(380 * t)],
      }
    case 'nuzzle':
    case 'pout':
      return {
        srcs: [NURSERY_SRC, POSE_LAUGH, POSE_NUZZLE],
        at: [0, Math.round(90 * t), Math.round(320 * t)],
      }
    case 'grab':
      return {
        srcs: [NURSERY_SRC, POSE_LAUGH],
        at: [0, Math.round(90 * t)],
      }
    case 'cuddle':
      return {
        srcs: [NURSERY_SRC, POSE_LAUGH],
        at: [0, Math.round(140 * t)],
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
