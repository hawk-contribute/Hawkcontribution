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
  /** Hair + upper crown — nods from the atlas, not the curl. */
  hair: partMask('ellipse 15.5% 12% at 51.4% 17.8%'),
  cheekL: partMask('ellipse 6.4% 5.2% at 40.4% 40.6%'),
  cheekR: partMask('ellipse 6.4% 5.2% at 62.6% 40.6%'),
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

type FaceKind = 'idle' | 'sleep' | 'pout' | 'smile' | 'laugh' | 'crazy'

function faceKindFor(pose: BabyPose): FaceKind {
  switch (pose) {
    case 'nuzzle':
    case 'cuddle':
      return 'sleep'
    case 'pout':
      return 'pout'
    case 'grab':
      return 'smile'
    case 'tickle':
    case 'kick':
      return 'laugh'
    case 'crazy':
      return 'crazy'
    default:
      return 'idle'
  }
}

function FaceOverlay({ pose, focusSide }: { pose: BabyPose; focusSide: BabyFocusSide }) {
  const kind = faceKindFor(pose)
  const coverEyes = kind === 'sleep' || kind === 'laugh' || kind === 'crazy'
  const pinchL = pose === 'pout' && focusSide !== 'right'
  const pinchR = pose === 'pout' && focusSide !== 'left'
  const blush = kind === 'pout' || kind === 'laugh' || kind === 'crazy' || kind === 'smile'

  return (
    <svg
      className="baby-face-svg"
      viewBox="0 0 400 533"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <filter id="baby-skin-soft" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="2.6" />
        </filter>
      </defs>
      <g className={kind === 'idle' ? 'baby-lids-idle' : 'baby-lids-hidden'}>
        <ellipse className="baby-lid baby-lid-l" cx="176" cy="200" rx="22" ry="16" fill="#f0c2a4" />
        <ellipse className="baby-lid baby-lid-r" cx="236" cy="200" rx="22" ry="16" fill="#f0c2a4" />
      </g>

      {coverEyes && (
        <g className="baby-face-cover" filter="url(#baby-skin-soft)">
          <ellipse cx="206" cy="218" rx="82" ry="48" fill="#f0c2a4" />
        </g>
      )}
      {kind !== 'idle' && (
        <ellipse cx="206" cy="258" rx="26" ry="22" fill="#f0c2a4" filter="url(#baby-skin-soft)" />
      )}

      {kind === 'sleep' && (
        <g stroke="#4a3428" strokeWidth="4.4" strokeLinecap="round" fill="none">
          <path d="M148 218 Q174 232 200 218" />
          <path d="M212 218 Q238 232 264 218" />
          <path d="M194 262 Q206 268 218 262" strokeWidth="3.2" />
        </g>
      )}

      {kind === 'smile' && (
        <g>
          <ellipse cx="206" cy="264" rx="16" ry="13" fill="#3d2a20" />
          <path d="M192 258 Q206 252 220 258" fill="#fff6ee" />
          <ellipse cx="206" cy="270" rx="7" ry="4" fill="#e07080" />
        </g>
      )}

      {(kind === 'laugh' || kind === 'crazy') && (
        <g>
          <g stroke="#4a3428" strokeWidth="5" strokeLinecap="round" fill="none">
            <path d="M146 216 Q174 236 202 216" />
            <path d="M210 216 Q238 236 266 216" />
          </g>
          <g>
            <ellipse cx="206" cy="266" rx="24" ry="17" fill="#3d2a20" />
            <path d="M186 258 Q206 248 226 258" fill="#fff6ee" />
            {kind === 'laugh' && <ellipse cx="206" cy="274" rx="11" ry="6" fill="#e07080" />}
          </g>
        </g>
      )}

      {kind === 'pout' && (
        <path d="M194 262 Q206 258 218 262" stroke="#4a3428" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      )}

      <ellipse
        className={`baby-cheek-blob baby-cheek-blob-l${pinchL ? ' is-hot' : ''}${blush ? ' is-puff' : ''}`}
        cx="154"
        cy="232"
        rx="20"
        ry="14"
        fill="#f2a0b0"
      />
      <ellipse
        className={`baby-cheek-blob baby-cheek-blob-r${pinchR ? ' is-hot' : ''}${blush ? ' is-puff' : ''}`}
        cx="258"
        cy="232"
        rx="20"
        ry="14"
        fill="#f2a0b0"
      />

      {pose === 'tickle' && (
        <g className="baby-tummy-glow" pointerEvents="none">
          <ellipse cx="206" cy="352" rx="42" ry="32" fill="#ffe08a" opacity="0.28" />
          <ellipse cx="206" cy="352" rx="28" ry="22" fill="none" stroke="#f5d15a" strokeWidth="3" />
        </g>
      )}

      {kind === 'crazy' && (
        <g className="baby-tongue">
          <ellipse cx="206" cy="288" rx="11" ry="16" fill="#f08090" />
          <path d="M206 274 L206 300" stroke="#e06070" strokeWidth="1.6" />
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
  const tempo = mode === 'gentle' ? 'baby-tempo-gentle' : mode === 'crazy' ? 'baby-tempo-crazy' : 'baby-tempo-funny'
  const bothFeet = pose === 'kick' && focusSide == null
  const kickL = pose === 'kick' && (focusSide === 'left' || bothFeet)
  const kickR = pose === 'kick' && (focusSide === 'right' || bothFeet)
  const comicSide = pose === 'kick' ? 'is-left' : 'is-right'

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
        <div className="baby-head">
          {/* Head group pivots at the atlas so hair nods instead of spinning in place. */}
          <ClippedPart src={NURSERY_SRC} className="baby-part-hair" mask={MASKS.hair} />
        </div>
        <ClippedPart src={NURSERY_SRC} className="baby-part-cheek-l" mask={MASKS.cheekL} />
        <ClippedPart src={NURSERY_SRC} className="baby-part-cheek-r" mask={MASKS.cheekR} />
        <FaceOverlay pose={pose} focusSide={focusSide} />
      </div>

      {hit && pose !== 'idle' && (
        <div className="baby-hit-burst" style={{ left: `${hit.x}%`, top: `${hit.y}%` }}>
          <span className="baby-hit-glow" />
          <span className="baby-hit-ring" />
          <span className="baby-hit-spark baby-hit-spark-a">✦</span>
          <span className="baby-hit-spark baby-hit-spark-b">✦</span>
          <span className="baby-hit-spark baby-hit-spark-c">✧</span>
        </div>
      )}

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
