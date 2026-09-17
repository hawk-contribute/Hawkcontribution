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
  const mask = `radial-gradient(${ellipse}, #000 66%, rgba(0,0,0,0.55) 78%, transparent 100%)`
  return { WebkitMaskImage: mask, maskImage: mask }
}

/** Clip-path regions in the 400×533 nursery painting (head, limbs, rattle). */
const MASKS = {
  head: partMask('ellipse 23% 24% at 51.2% 29.2%'),
  hair: partMask('ellipse 16% 11% at 51.4% 16.4%'),
  cheekL: partMask('ellipse 8.5% 7% at 40.6% 40.2%'),
  cheekR: partMask('ellipse 8.5% 7% at 62.4% 40.2%'),
  torso: partMask('ellipse 20% 16% at 51.4% 58.5%'),
  handL: partMask('ellipse 11% 9% at 33.8% 58.4%'),
  handR: partMask('ellipse 8.5% 8% at 68.2% 61.2%'),
  rattle: partMask('ellipse 10% 12% at 27.6% 49.6%'),
  footL: partMask('ellipse 11% 8.5% at 42.4% 82.4%'),
  footR: partMask('ellipse 11% 8.5% at 60.2% 82.2%'),
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
  const wide = pose === 'pout' || pose === 'kick'
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
      {/* Eyelids — hidden until blink / squint */}
      <g
        className={
          crazy
            ? 'baby-lids-crazy'
            : squint
              ? 'baby-lids-squint'
              : wide
                ? 'baby-lids-wide'
                : giggle
                  ? 'baby-lids-happy'
                  : 'baby-lids-idle'
        }
      >
        <ellipse className="baby-lid baby-lid-l" cx="176" cy="196" rx="22" ry="16" fill="#f0c4a4" />
        <ellipse className="baby-lid baby-lid-r" cx="234" cy="196" rx="22" ry="16" fill="#f0c4a4" />
      </g>

      {crazy && (
        <g className="baby-crazy-eyes" stroke="#4a3428" strokeWidth="3.2" strokeLinecap="round" fill="none">
          <path d="M162 186 L190 206 M162 206 L190 186" />
          <path d="M220 186 L248 206 M220 206 L248 186" />
        </g>
      )}

      {giggle && (
        <g className="baby-happy-eyes" stroke="#4a3428" strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M160 198 Q176 186 192 198" />
          <path d="M218 198 Q234 186 250 198" />
        </g>
      )}

      {/* Cheek squash blobs */}
      <ellipse
        className={`baby-cheek-blob baby-cheek-blob-l${pinchL ? ' is-hot' : ''}${pose === 'crazy' ? ' is-puff' : ''}`}
        cx="163"
        cy="216"
        rx="20"
        ry="14"
        fill="#f2a0b0"
      />
      <ellipse
        className={`baby-cheek-blob baby-cheek-blob-r${pinchR ? ' is-hot' : ''}${pose === 'crazy' ? ' is-puff' : ''}`}
        cx="249"
        cy="216"
        rx="20"
        ry="14"
        fill="#f2a0b0"
      />

      {/* Cover the painted O-mouth during expressions, then draw a new one */}
      {pose !== 'idle' && <ellipse cx="205" cy="228" rx="16" ry="12" fill="#f3cbb0" />}
      {pose === 'nuzzle' && (
        <path d="M196 226 Q205 232 214 226" stroke="#d08090" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      )}
      {pose === 'pout' && (
        <path d="M194 232 Q205 224 216 232" stroke="#c45a7a" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      )}
      {giggle && <ellipse cx="205" cy="230" rx="7" ry="6" fill="#c45a7a" />}
      {pose === 'cuddle' && (
        <path d="M196 228 Q205 236 214 228" stroke="#d08090" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      )}
      {pose === 'kick' && <ellipse cx="205" cy="230" rx="5" ry="7" fill="#c45a7a" />}
      {crazy && (
        <g className="baby-tongue">
          <ellipse cx="205" cy="242" rx="9" ry="13" fill="#f08090" />
          <path d="M205 232 L205 250" stroke="#e06070" strokeWidth="1.3" />
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

      {/* Rest-position patches so moving clips do not leave a duplicate painted limb */}
      <span className="baby-fill baby-fill-head" />
      <span className="baby-fill baby-fill-torso" />
      <span className="baby-fill baby-fill-hand-l" />
      <span className="baby-fill baby-fill-hand-r" />
      <span className="baby-fill baby-fill-rattle" />
      <span className="baby-fill baby-fill-foot-l" />
      <span className="baby-fill baby-fill-foot-r" />

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
        <div className="baby-part-head-wrap">
          <ClippedPart src={NURSERY_SRC} className="baby-part-head" mask={MASKS.head} />
          <ClippedPart src={NURSERY_SRC} className="baby-part-hair" mask={MASKS.hair} />
          <ClippedPart src={NURSERY_SRC} className="baby-part-cheek-l" mask={MASKS.cheekL} />
          <ClippedPart src={NURSERY_SRC} className="baby-part-cheek-r" mask={MASKS.cheekR} />
          <FaceOverlay pose={pose} focusSide={focusSide} />
        </div>
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
