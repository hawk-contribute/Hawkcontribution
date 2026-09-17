import type { BabyMode, BabyPose } from '../lib/babyTouch'
import { asset } from '../lib/asset'

const NURSERY_SRC = asset('game/baby-touch/nursery.png')
const COVER_SRC = asset('game/baby-touch/cover.png')

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

function partMask(ellipse: string): { WebkitMaskImage: string; maskImage: string } {
  const mask = `radial-gradient(${ellipse}, #000 58%, rgba(0,0,0,0.72) 72%, transparent 100%)`
  return { WebkitMaskImage: mask, maskImage: mask }
}

/** Clip regions in the 400×533 nursery painting. Kept snug so idle pixels match. */
const MASKS = {
  hair: partMask('ellipse 15% 10% at 51.4% 16.2%'),
  cheekL: partMask('ellipse 7.2% 6% at 40.4% 40.4%'),
  cheekR: partMask('ellipse 7.2% 6% at 62.6% 40.4%'),
  torso: partMask('ellipse 16% 13% at 51.4% 61%'),
  handL: partMask('ellipse 9.5% 8% at 34% 58.2%'),
  handR: partMask('ellipse 7.2% 7% at 68.4% 61.4%'),
  rattle: partMask('ellipse 9% 11% at 27.4% 49.2%'),
  footL: partMask('ellipse 10% 7.5% at 42.2% 82.6%'),
  footR: partMask('ellipse 10% 7.5% at 60.4% 82.4%'),
} as const

function ClippedPart({
  src,
  className,
  mask,
}: {
  src: string
  className: string
  mask: { WebkitMaskImage: string; maskImage: string }
}) {
  return (
    <div className={`baby-part ${className}`} style={mask}>
      <img src={src} alt="" draggable={false} />
    </div>
  )
}

function FaceOverlay({ pose, focusSide }: { pose: BabyPose; focusSide: BabyFocusSide }) {
  const squint = pose === 'nuzzle' || pose === 'cuddle'
  const giggle = pose === 'grab' || pose === 'tickle'
  const crazy = pose === 'crazy'
  const pinchL = pose === 'pout' && focusSide !== 'right'
  const pinchR = pose === 'pout' && focusSide !== 'left'

  return (
    <svg
      className="baby-face-svg"
      viewBox="0 0 400 533"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <g className={pose === 'idle' ? 'baby-lids-idle' : 'baby-lids-hidden'}>
        <ellipse className="baby-lid baby-lid-l" cx="176" cy="200" rx="22" ry="16" fill="#f0c4a4" />
        <ellipse className="baby-lid baby-lid-r" cx="236" cy="200" rx="22" ry="16" fill="#f0c4a4" />
      </g>

      {squint && (
        <g stroke="#5a3a2a" strokeWidth="3.4" strokeLinecap="round" fill="none">
          <path d="M158 204 Q176 214 194 204" />
          <path d="M219 204 Q237 214 255 204" />
        </g>
      )}

      {giggle && (
        <g stroke="#5a3a2a" strokeWidth="3.2" strokeLinecap="round" fill="none" opacity="0.9">
          <path d="M158 200 Q176 188 194 200" />
          <path d="M218 200 Q236 188 254 200" />
        </g>
      )}

      {crazy && (
        <g stroke="#4a3428" strokeWidth="3.4" strokeLinecap="round" fill="none">
          <path d="M160 188 L192 210 M160 210 L192 188" />
          <path d="M220 188 L252 210 M220 210 L252 188" />
        </g>
      )}

      <ellipse
        className={`baby-cheek-blob baby-cheek-blob-l${pinchL ? ' is-hot' : ''}${crazy ? ' is-puff' : ''}`}
        cx="160"
        cy="218"
        rx="18"
        ry="13"
        fill="#f2a0b0"
      />
      <ellipse
        className={`baby-cheek-blob baby-cheek-blob-r${pinchR ? ' is-hot' : ''}${crazy ? ' is-puff' : ''}`}
        cx="252"
        cy="218"
        rx="18"
        ry="13"
        fill="#f2a0b0"
      />

      {pose === 'tickle' && (
        <ellipse className="baby-tummy-glow" cx="206" cy="358" rx="26" ry="20" fill="#f3c2b4" />
      )}

      {crazy && (
        <g className="baby-tongue">
          <ellipse cx="206" cy="252" rx="8" ry="12" fill="#f08090" />
          <path d="M206 242 L206 260" stroke="#e06070" strokeWidth="1.3" />
        </g>
      )}
    </svg>
  )
}

export function NurseryScene({
  pose,
  mode,
  focusSide = null,
  poseTick = 0,
}: {
  pose: BabyPose
  mode: BabyMode
  focusSide?: BabyFocusSide
  poseTick?: number
}) {
  const tempo = mode === 'gentle' ? 'baby-tempo-gentle' : mode === 'crazy' ? 'baby-tempo-crazy' : 'baby-tempo-funny'
  const bothFeet = pose === 'kick' && focusSide == null
  const kickL = pose === 'kick' && (focusSide === 'left' || bothFeet)
  const kickR = pose === 'kick' && (focusSide === 'right' || bothFeet)

  return (
    <div
      key={poseTick}
      className={`baby-art absolute inset-0 ${tempo}`}
      data-pose={pose}
      data-limb={focusSide ?? 'both'}
      data-mode={mode}
    >
      <img
        src={NURSERY_SRC}
        alt=""
        className="baby-bg h-full w-full object-cover object-center"
        draggable={false}
      />

      <div className="baby-puppet">
        <ClippedPart src={NURSERY_SRC} className="baby-part-torso" mask={MASKS.torso} />
        <ClippedPart src={NURSERY_SRC} className="baby-part-hand-l" mask={MASKS.handL} />
        <ClippedPart src={NURSERY_SRC} className="baby-part-hand-r" mask={MASKS.handR} />
        <ClippedPart src={NURSERY_SRC} className="baby-part-rattle" mask={MASKS.rattle} />
        <ClippedPart
          src={NURSERY_SRC}
          className={`baby-part-foot-l${kickL ? ' is-kick' : ''}`}
          mask={MASKS.footL}
        />
        <ClippedPart
          src={NURSERY_SRC}
          className={`baby-part-foot-r${kickR ? ' is-kick' : ''}`}
          mask={MASKS.footR}
        />
        <ClippedPart src={NURSERY_SRC} className="baby-part-hair" mask={MASKS.hair} />
        <ClippedPart src={NURSERY_SRC} className="baby-part-cheek-l" mask={MASKS.cheekL} />
        <ClippedPart src={NURSERY_SRC} className="baby-part-cheek-r" mask={MASKS.cheekR} />
        <FaceOverlay pose={pose} focusSide={focusSide} />
      </div>

      {pose === 'nuzzle' && (
        <span className="baby-fx-zzz" aria-hidden>
          z z
        </span>
      )}
      {pose === 'tickle' && (
        <span className="baby-fx-spark" aria-hidden>
          ✦
        </span>
      )}
      {pose === 'grab' && (
        <span className="baby-fx-heart" aria-hidden>
          ♡
        </span>
      )}
      {pose === 'crazy' && (
        <span className="baby-fx-spark baby-fx-spark-2" aria-hidden>
          ✦
        </span>
      )}
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
