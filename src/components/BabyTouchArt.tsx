import type { BabyMode, BabyPose } from '../lib/babyTouch'
import { reactClassForPose } from '../lib/babyTouch'
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
  const mask = `radial-gradient(${ellipse}, #000 78%, rgba(0,0,0,0.9) 88%, transparent 100%)`
  return { WebkitMaskImage: mask, maskImage: mask }
}

/** Clip regions in the 400×533 nursery painting. Generous so large moves still cover the still layer. */
const MASKS = {
  full: partMask('ellipse 28% 42% at 51.2% 50%'),
  face: partMask('ellipse 22% 22% at 51.4% 30%'),
  hair: partMask('ellipse 16% 12% at 51.4% 16.2%'),
  cheekL: partMask('ellipse 8.2% 7% at 40.4% 40.4%'),
  cheekR: partMask('ellipse 8.2% 7% at 62.6% 40.4%'),
  torso: partMask('ellipse 22% 18% at 51.4% 58%'),
  handL: partMask('ellipse 11% 10% at 34% 58.2%'),
  handR: partMask('ellipse 9% 9% at 68.4% 61.4%'),
  rattle: partMask('ellipse 11% 13% at 27.4% 49.2%'),
  footL: partMask('ellipse 14% 12% at 42.2% 80.6%'),
  footR: partMask('ellipse 14% 12% at 60.4% 80.4%'),
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

function ToeCluster({ side }: { side: 'left' | 'right' }) {
  const x = side === 'left' ? 168 : 242
  const y = 448
  const dir = side === 'left' ? 1 : -1
  return (
    <svg className={`baby-toes baby-toes-${side === 'left' ? 'l' : 'r'}`} viewBox="0 0 400 533" aria-hidden>
      <g transform={`translate(${x} ${y})`} fill="#f0c4a4" stroke="#d4a088" strokeWidth="0.8">
        <ellipse className="baby-toe" cx={-11 * dir} cy={0} rx="6.2" ry="4.2" />
        <ellipse className="baby-toe" cx={-2 * dir} cy={-5} rx="6" ry="4" />
        <ellipse className="baby-toe" cx={7 * dir} cy={-1} rx="5.2" ry="3.6" />
      </g>
    </svg>
  )
}

function FaceOverlay({
  pose,
  focusSide,
  mode,
}: {
  pose: BabyPose
  focusSide: BabyFocusSide
  mode: BabyMode
}) {
  const crazy = pose === 'crazy'
  const pinchL = pose === 'pout' && focusSide !== 'right'
  const pinchR = pose === 'pout' && focusSide !== 'left'
  const laughFace = pose === 'tickle' || pose === 'kick' || crazy
  const playfulFace = pose === 'nuzzle' || pose === 'pout'
  const happy =
    laughFace ||
    playfulFace ||
    pose === 'cuddle' ||
    pose === 'grab'
  const bigLaugh = laughFace
  const openSmile = happy && !bigLaugh && !playfulFace && pose !== 'cuddle'
  const tongueOut = playfulFace || crazy
  const blushLaugh = happy
  const idleSmile = pose === 'idle'

  return (
    <svg
      className={`baby-face-svg${happy ? ' is-happy' : ''}${bigLaugh ? ' is-big-laugh' : ''} is-mode-${mode}`}
      viewBox="0 0 400 533"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <filter id="baby-skin-soft" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="2.6" />
        </filter>
      </defs>
      <g className={pose === 'idle' ? 'baby-lids-idle' : 'baby-lids-hidden'}>
        <ellipse className="baby-lid baby-lid-l" cx="176" cy="200" rx="22" ry="16" fill="#f0c2a4" />
        <ellipse className="baby-lid baby-lid-r" cx="236" cy="200" rx="22" ry="16" fill="#f0c2a4" />
      </g>

      {happy && (
        <g className="baby-face-cover" filter="url(#baby-skin-soft)">
          <ellipse cx="206" cy="218" rx="82" ry="48" fill="#f0c2a4" />
          <ellipse cx="206" cy="258" rx="26" ry="22" fill="#f0c2a4" />
        </g>
      )}

      {happy && (
        <g className="baby-happy-eyes">
          <path d="M146 216 Q174 236 202 216" stroke="#4a3428" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M210 216 Q238 236 266 216" stroke="#4a3428" strokeWidth="5" strokeLinecap="round" fill="none" />
        </g>
      )}

      {idleSmile && (
        <g className="baby-idle-smile">
          <ellipse cx="206" cy="266" rx="20" ry="14" fill="#f0c2a4" />
          <path
            d="M192 262 Q206 273 220 262"
            stroke="#4a3428"
            strokeWidth="3.2"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      )}

      {openSmile && (
        <g>
          <ellipse cx="206" cy="264" rx="16" ry="13" fill="#3d2a20" />
          <path d="M192 258 Q206 252 220 258" fill="#fff6ee" />
        </g>
      )}

      {pose === 'cuddle' && (
        <path d="M194 262 Q206 268 218 262" stroke="#4a3428" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      )}

      {bigLaugh && (
        <g className="baby-laugh-mouth">
          <path
            d="M182 252 Q206 244 230 252 L232 262 Q206 288 180 262 Z"
            fill="#3d2a20"
          />
          <path d="M186 254 Q206 248 226 254 Q206 262 186 254 Z" fill="#fff6ee" />
          <ellipse cx="206" cy="274" rx="11" ry="5.5" fill="#e07080" />
        </g>
      )}

      {playfulFace && (
        <path
          d="M194 262 Q206 268 218 262"
          stroke="#4a3428"
          strokeWidth="3.2"
          fill="none"
          strokeLinecap="round"
        />
      )}

      <ellipse
        className={`baby-cheek-blob baby-cheek-blob-l${pinchL ? ' is-hot' : ''}${blushLaugh ? ' is-laugh' : ''}${crazy ? ' is-puff' : ''}`}
        cx="160"
        cy="218"
        rx="18"
        ry="13"
        fill="#f2a0b0"
      />
      <ellipse
        className={`baby-cheek-blob baby-cheek-blob-r${pinchR ? ' is-hot' : ''}${blushLaugh ? ' is-laugh' : ''}${crazy ? ' is-puff' : ''}`}
        cx="252"
        cy="218"
        rx="18"
        ry="13"
        fill="#f2a0b0"
      />

      {pose === 'tickle' && (
        <g className="baby-tummy-glow" pointerEvents="none">
          <ellipse cx="206" cy="352" rx="42" ry="32" fill="#ffe08a" opacity="0.28" />
          <ellipse cx="206" cy="352" rx="28" ry="22" fill="none" stroke="#f5d15a" strokeWidth="3" />
        </g>
      )}

      {tongueOut && (
        <g className="baby-tongue">
          <ellipse cx="206" cy={crazy ? 288 : 280} rx="11" ry={crazy ? 16 : 13} fill="#f08090" />
          <path d={`M206 ${crazy ? 274 : 270} L206 ${crazy ? 300 : 292}`} stroke="#e06070" strokeWidth="1.6" />
        </g>
      )}
    </svg>
  )
}

function MotionSwooshes({ pose, focusSide }: { pose: BabyPose; focusSide: BabyFocusSide }) {
  if (pose === 'idle') return null
  return (
    <svg className="baby-swoosh-svg" viewBox="0 0 400 533" aria-hidden>
      {(pose === 'nuzzle' || pose === 'cuddle') && (
        <g className="baby-swoosh baby-swoosh-head" fill="none" stroke="#e8c48a" strokeWidth="3" strokeLinecap="round">
          <path d="M118 150 Q98 190 118 230" />
          <path d="M286 150 Q306 190 286 230" />
        </g>
      )}
      {pose === 'grab' && (
        <g className="baby-swoosh baby-swoosh-hands" fill="none" stroke="#f2b8c8" strokeWidth="3" strokeLinecap="round">
          {(focusSide !== 'right') && <path d="M86 280 Q70 310 90 340" />}
          {(focusSide !== 'left') && <path d="M330 300 Q348 328 328 358" />}
        </g>
      )}
      {pose === 'kick' && (
        <g className="baby-swoosh baby-swoosh-feet" fill="none" stroke="#e8c48a" strokeWidth="3.2" strokeLinecap="round">
          {(focusSide !== 'right') && <path d="M130 390 Q110 350 140 310" />}
          {(focusSide !== 'left') && <path d="M274 390 Q296 350 266 310" />}
        </g>
      )}
      {(pose === 'tickle' || pose === 'kick' || pose === 'crazy') && (
        <g className="baby-swoosh baby-swoosh-roll" fill="none" stroke="#f0c45a" strokeWidth="3.2" strokeLinecap="round">
          <path d="M96 300 Q70 360 110 420" />
          <path d="M310 300 Q338 360 296 420" />
        </g>
      )}
      {pose === 'pout' && (
        <g className="baby-swoosh baby-swoosh-bat" fill="none" stroke="#f2a0b4" strokeWidth="3" strokeLinecap="round">
          <path d="M100 250 Q84 280 108 310" />
          <path d="M312 250 Q328 280 304 310" />
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
  const kickL = pose === 'kick' || pose === 'tickle' || pose === 'crazy'
  const kickR = pose === 'kick' || pose === 'tickle' || pose === 'crazy'
  const waveL = pose === 'grab' && focusSide !== 'right'
  const waveR = pose === 'grab' && focusSide !== 'left'
  const react = reactClassForPose(pose)
  const comicSide = pose === 'kick' ? 'is-left' : 'is-right'

  return (
    <div
      key={poseTick}
      className={`baby-art absolute inset-0 ${tempo} ${react}`}
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

      <div className="baby-bed-cover" aria-hidden />
      <div className="baby-head-cover" aria-hidden />
      <span className="baby-hole baby-hole-foot-l" aria-hidden />
      <span className="baby-hole baby-hole-foot-r" aria-hidden />
      <span className="baby-hole baby-hole-hand-l" aria-hidden />
      <span className="baby-hole baby-hole-hand-r" aria-hidden />

      <div className="baby-puppet">
        <div className="baby-mover">
          <ClippedPart src={NURSERY_SRC} className="baby-part-full" mask={MASKS.full} />
          <ClippedPart src={NURSERY_SRC} className="baby-part-torso" mask={MASKS.torso} />

          <div className={`baby-limb baby-hand-l-wrap${waveL ? ' is-wave' : ''}`}>
            <div className="baby-joint baby-wrist-l">
              <ClippedPart src={NURSERY_SRC} className="baby-part-hand-l" mask={MASKS.handL} />
              <ClippedPart src={NURSERY_SRC} className="baby-part-rattle" mask={MASKS.rattle} />
            </div>
          </div>
          <div className={`baby-limb baby-hand-r-wrap${waveR ? ' is-wave' : ''}`}>
            <div className="baby-joint baby-wrist-r">
              <ClippedPart src={NURSERY_SRC} className="baby-part-hand-r" mask={MASKS.handR} />
            </div>
          </div>

          <div className={`baby-limb baby-foot-l-wrap${kickL ? ' is-kick' : ''}`}>
            <div className="baby-joint baby-ankle-l">
              <ClippedPart src={NURSERY_SRC} className="baby-part-foot-l" mask={MASKS.footL} />
              {kickL && <ToeCluster side="left" />}
            </div>
          </div>
          <div className={`baby-limb baby-foot-r-wrap${kickR ? ' is-kick' : ''}`}>
            <div className="baby-joint baby-ankle-r">
              <ClippedPart src={NURSERY_SRC} className="baby-part-foot-r" mask={MASKS.footR} />
              {kickR && <ToeCluster side="right" />}
            </div>
          </div>

          <div className="baby-head-group">
            <ClippedPart src={NURSERY_SRC} className="baby-part-face" mask={MASKS.face} />
            <ClippedPart src={NURSERY_SRC} className="baby-part-hair" mask={MASKS.hair} />
            <ClippedPart src={NURSERY_SRC} className="baby-part-cheek-l" mask={MASKS.cheekL} />
            <ClippedPart src={NURSERY_SRC} className="baby-part-cheek-r" mask={MASKS.cheekR} />
            <FaceOverlay pose={pose} focusSide={focusSide} mode={mode} />
          </div>
        </div>
        <MotionSwooshes pose={pose} focusSide={focusSide} />
      </div>

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
      {pose === 'kick' && (
        <span className="baby-fx-kick" aria-hidden>
          ↑
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
