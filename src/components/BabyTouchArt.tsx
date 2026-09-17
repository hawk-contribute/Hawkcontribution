import type { BabyMode, BabyPose } from '../lib/babyTouch'

/** Hub cover + SVG bedroom + Q-version eagle baby (no bitmap assets). */

export function BabyTouchCover() {
  return (
    <div className="baby-scene pointer-events-none relative h-full w-full overflow-hidden transition duration-300 group-hover:scale-105">
      <div className="baby-sky" />
      <div className="hatch-grain" />
      <svg
        viewBox="0 0 400 220"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <BedroomBackdrop compact />
        <g transform="translate(200 128) scale(0.92)">
          <BabyEagleSprite pose="idle" mode="funny" />
        </g>
      </svg>
    </div>
  )
}

export function BedroomBackdrop({ compact = false }: { compact?: boolean }) {
  const h = compact ? 220 : 420
  return (
    <g>
      <rect width="400" height={h} fill="#3a2a48" />
      <rect y={h * 0.55} width="400" height={h * 0.45} fill="#5c3d5a" />
      {/* wallpaper stripes */}
      <g opacity="0.12">
        {Array.from({ length: 10 }, (_, i) => (
          <rect key={i} x={i * 42} y="0" width="18" height={h * 0.58} fill="#f7d9c4" />
        ))}
      </g>
      {/* window + moon */}
      <g transform="translate(286 18)">
        <rect x="0" y="0" width="92" height="88" rx="8" fill="#2a3558" />
        <rect x="4" y="4" width="84" height="80" rx="5" fill="#1a2444" />
        <circle cx="62" cy="28" r="16" fill="#ffe9b0" opacity="0.95" />
        <circle cx="56" cy="24" r="6" fill="#1a2444" opacity="0.35" />
        <circle cx="18" cy="22" r="2" fill="#fff6d8" />
        <circle cx="32" cy="14" r="1.4" fill="#fff6d8" />
        <circle cx="24" cy="40" r="1.2" fill="#fff6d8" />
        <rect x="44" y="4" width="4" height="80" fill="#c4a07a" opacity="0.55" />
        <rect x="4" y="42" width="84" height="4" fill="#c4a07a" opacity="0.55" />
        <rect x="-6" y="84" width="104" height="10" rx="2" fill="#8a6248" />
      </g>
      {/* lamp */}
      <g transform="translate(42 36)">
        <rect x="18" y="48" width="8" height="36" rx="2" fill="#8a6248" />
        <path d="M4 48 L40 48 L32 18 L12 18 Z" fill="#f3c98a" />
        <ellipse cx="22" cy="18" rx="12" ry="5" fill="#ffe7b8" />
        <ellipse cx="22" cy="38" rx="28" ry="14" fill="#ffd89a" opacity="0.22" />
      </g>
      {/* crib / bed */}
      <g transform={`translate(28 ${compact ? 118 : 248})`}>
        <ellipse cx="172" cy="78" rx="168" ry="22" fill="#3a2430" opacity="0.35" />
        <rect x="8" y="18" width="328" height="62" rx="18" fill="#d7b089" />
        <rect x="18" y="8" width="308" height="52" rx="16" fill="#f4d5c4" />
        <ellipse cx="172" cy="36" rx="128" ry="22" fill="#f7e6dc" />
        <rect x="28" y="22" width="288" height="28" rx="14" fill="#e8b4c8" opacity="0.55" />
        <rect x="0" y="8" width="14" height="78" rx="4" fill="#8a6248" />
        <rect x="330" y="8" width="14" height="78" rx="4" fill="#8a6248" />
        <path d="M22 4 Q172 -10 322 4" stroke="#c4895c" strokeWidth="6" fill="none" />
      </g>
      {!compact && (
        <g opacity="0.7">
          <circle cx="70" cy="28" r="1.6" fill="#fff6d8" className="baby-twinkle" />
          <circle cx="118" cy="48" r="1.2" fill="#fff6d8" className="baby-twinkle" />
          <circle cx="248" cy="22" r="1.4" fill="#fff6d8" className="baby-twinkle" />
        </g>
      )}
    </g>
  )
}

function Eyes({ pose }: { pose: BabyPose }) {
  if (pose === 'nuzzle' || pose === 'tickle') {
    return (
      <g stroke="#2a241c" strokeWidth="2.4" strokeLinecap="round" fill="none">
        <path d="M-18 -6 Q-12 -2 -6 -6" />
        <path d="M6 -6 Q12 -2 18 -6" />
      </g>
    )
  }
  if (pose === 'pout' || pose === 'kick') {
    return (
      <g>
        <ellipse cx="-12" cy="-8" rx="5.2" ry="6.2" fill="#fff" />
        <ellipse cx="12" cy="-8" rx="5.2" ry="6.2" fill="#fff" />
        <circle cx="-11" cy="-7" r="2.6" fill="#2a241c" />
        <circle cx="13" cy="-7" r="2.6" fill="#2a241c" />
        <circle cx="-9.6" cy="-8.6" r="0.9" fill="#fff" />
        <circle cx="14.4" cy="-8.6" r="0.9" fill="#fff" />
      </g>
    )
  }
  if (pose === 'crazy') {
    return (
      <g stroke="#2a241c" strokeWidth="2.2" strokeLinecap="round">
        <path d="M-18 -12 L-6 -4 M-18 -4 L-6 -12" />
        <path d="M6 -12 L18 -4 M6 -4 L18 -12" />
      </g>
    )
  }
  if (pose === 'grab') {
    return (
      <g stroke="#2a241c" strokeWidth="2.4" strokeLinecap="round" fill="none">
        <path d="M-18 -4 Q-12 -10 -6 -4" />
        <path d="M6 -4 Q12 -10 18 -4" />
      </g>
    )
  }
  return (
    <g className="hatch-blink">
      <circle cx="-12" cy="-8" r="3.2" fill="#2a241c" />
      <circle cx="12" cy="-8" r="3.2" fill="#2a241c" />
      <circle cx="-10.8" cy="-9.2" r="1" fill="#fff" />
      <circle cx="13.2" cy="-9.2" r="1" fill="#fff" />
    </g>
  )
}

export function BabyEagleSprite({
  pose,
  mode,
  pinchSide = null,
}: {
  pose: BabyPose
  mode: BabyMode
  pinchSide?: 'left' | 'right' | null
}) {
  const anim =
    pose === 'nuzzle'
      ? 'baby-nuzzle'
      : pose === 'pout'
        ? 'baby-pout'
        : pose === 'grab'
          ? 'baby-grab'
          : pose === 'tickle'
            ? 'baby-tickle'
            : pose === 'kick'
              ? 'baby-kick'
              : pose === 'crazy'
                ? 'baby-crazy'
                : 'baby-idle'
  const tempo = mode === 'gentle' ? 'baby-tempo-gentle' : mode === 'crazy' ? 'baby-tempo-crazy' : 'baby-tempo-funny'
  const batL = pose === 'pout' && pinchSide !== 'right'
  const batR = pose === 'pout' && pinchSide !== 'left'
  const hugFeet = pose === 'kick'
  const tongue = pose === 'crazy'
  const curlLegs = pose === 'tickle' || pose === 'crazy'

  return (
    <g className={`${anim} ${tempo}`}>
      <ellipse cx="0" cy="86" rx="54" ry="12" fill="#3a2430" opacity="0.28" />
      {/* body */}
      <ellipse cx="0" cy="38" rx="52" ry="44" fill="#8a5a32" />
      <ellipse cx="0" cy="42" rx="36" ry="30" fill="#c4a06a" />
      {/* onesie belly */}
      <ellipse cx="0" cy="48" rx="28" ry="22" fill="#f6efe4" />
      <ellipse cx="0" cy="46" rx="16" ry="12" fill="#f3c2b4" opacity={pose === 'tickle' ? 0.85 : 0.45} />
      {/* navel */}
      <circle cx="0" cy="52" r="2.2" fill="#d4a07a" opacity="0.7" />
      {/* wings / hands */}
      <g
        className={batL ? 'baby-bat-l' : hugFeet ? 'baby-hug-l' : pose === 'grab' ? 'baby-grab-l' : undefined}
        transform="translate(-48 28)"
      >
        <ellipse cx="0" cy="0" rx="16" ry="12" fill="#6b4428" transform="rotate(-28)" />
        <ellipse cx="-6" cy="8" rx="8" ry="7" fill="#f4ead6" />
      </g>
      <g
        className={batR ? 'baby-bat-r' : hugFeet ? 'baby-hug-r' : pose === 'grab' ? 'baby-grab-r' : undefined}
        transform="translate(48 28)"
      >
        <ellipse cx="0" cy="0" rx="16" ry="12" fill="#6b4428" transform="rotate(28)" />
        <ellipse cx="6" cy="8" rx="8" ry="7" fill="#f4ead6" />
      </g>
      {/* legs + feet */}
      <g className={curlLegs ? 'baby-curl-legs' : undefined}>
        <ellipse cx="-16" cy="78" rx="12" ry="16" fill="#8a5a32" />
        <ellipse cx="16" cy="78" rx="12" ry="16" fill="#8a5a32" />
        <g className={pose === 'kick' ? 'baby-toes' : undefined}>
          <ellipse cx="-18" cy="94" rx="14" ry="8" fill="#e09a28" />
          <ellipse cx="18" cy="94" rx="14" ry="8" fill="#e09a28" />
          <path d="M-28 92 Q-18 86 -8 92" stroke="#c48920" strokeWidth="1.4" fill="none" />
          <path d="M8 92 Q18 86 28 92" stroke="#c48920" strokeWidth="1.4" fill="none" />
        </g>
      </g>
      {/* head */}
      <g className={pose === 'nuzzle' ? 'baby-head-nuzzle' : undefined}>
        <circle cx="0" cy="-8" r="42" fill="#f6f1e4" />
        <ellipse cx="-28" cy="-2" rx="12" ry="14" fill="#f3c2b4" opacity={pinchSide === 'left' ? 1 : 0.85} />
        <ellipse cx="28" cy="-2" rx="12" ry="14" fill="#f3c2b4" opacity={pinchSide === 'right' ? 1 : 0.85} />
        {pose === 'pout' && (
          <>
            <ellipse cx="-28" cy="-2" rx="14" ry="16" fill="#e89aa0" opacity="0.55" />
            <ellipse cx="28" cy="-2" rx="14" ry="16" fill="#e89aa0" opacity="0.55" />
          </>
        )}
        <ellipse cx="0" cy="-28" rx="22" ry="16" fill="#fff" />
        <Eyes pose={pose} />
        <path d="M-7 4 L0 18 L7 4 Z" fill="#f0b429" />
        <path d="M-4 14 Q0 20 4 14" fill="#e09a28" />
        {pose === 'pout' && <path d="M-8 22 Q0 16 8 22" stroke="#c4895c" strokeWidth="2" fill="none" />}
        {tongue && (
          <g className="baby-tongue">
            <ellipse cx="0" cy="28" rx="8" ry="12" fill="#f08090" />
            <path d="M-2 22 L-2 34" stroke="#e06070" strokeWidth="1.2" />
          </g>
        )}
        {/* downy tuft */}
        <path d="M-8 -46 Q0 -58 8 -46" stroke="#f6f1e4" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M0 -48 Q4 -62 10 -50" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      </g>
    </g>
  )
}

export function BabySpeechBubble({ text }: { text: string }) {
  if (!text) return null
  return (
    <div className="baby-bubble pointer-events-none absolute left-1/2 top-3 z-10 w-[min(92%,22rem)] -translate-x-1/2 rounded-2xl border border-[#e8c37a]/70 bg-[#fff8ee]/95 px-3 py-2 text-center text-sm font-medium text-[#4a3424] shadow-[0_8px_24px_rgba(40,24,12,0.25)] sm:text-base">
      {text}
    </div>
  )
}
