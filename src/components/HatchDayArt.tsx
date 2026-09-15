import type { DecorId, NestItemKind } from '../lib/hatchDay'

/** Shared watercolor mountain-nest backdrop (CSS blobs + SVG cabin/nest). */

export function HatchDayCover() {
  return (
    <div className="hatch-scene pointer-events-none relative h-full w-full overflow-hidden transition duration-300 group-hover:scale-105">
      <div className="hatch-sky" />
      <div className="hatch-grain" />
      <svg
        viewBox="0 0 400 220"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <SceneMountains />
        <Cabin x={38} y={86} scale={0.92} />
        <NestBowl />
        <PapaEagle x={292} y={118} scale={0.92} />
        <ChickSprite x={228} y={148} hue={28} mood="happy" scale={0.85} />
        <ChickSprite x={258} y={156} hue={18} mood="idle" scale={0.78} />
        <FeatherMark x={210} y={152} rot={-30} />
        <ToyMark x={270} y={150} rot={18} />
      </svg>
    </div>
  )
}

export function SceneMountains() {
  return (
    <g>
      <ellipse cx="70" cy="40" rx="90" ry="36" fill="#f4d2b0" opacity="0.55" />
      <ellipse cx="320" cy="28" rx="80" ry="30" fill="#d7c2e4" opacity="0.4" />
      <path d="M-10 150 C 40 108, 90 118, 140 132 C 190 92, 240 108, 290 128 C 340 100, 380 118, 420 140 L 420 230 L -10 230 Z" fill="#8aa37a" opacity="0.55" />
      <path d="M-10 168 C 50 138, 110 148, 170 160 C 230 128, 280 146, 340 158 C 380 146, 410 154, 420 162 L 420 230 L -10 230 Z" fill="#6f8f68" opacity="0.7" />
      <path d="M-10 188 C 80 170, 160 184, 230 176 C 300 168, 360 180, 420 174 L 420 230 L -10 230 Z" fill="#cbb89a" opacity="0.55" />
    </g>
  )
}

export function Cabin({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="48" cy="78" rx="62" ry="14" fill="#5c4a36" opacity="0.28" />
      <path d="M8 40 L48 8 L88 40 Z" fill="#a56b45" />
      <path d="M8 40 L48 14 L88 40 Z" fill="#c4895c" opacity="0.85" />
      <rect x="16" y="40" width="64" height="42" rx="4" fill="#d7b089" />
      <rect x="16" y="40" width="64" height="10" fill="#b8875c" opacity="0.45" />
      <rect x="42" y="54" width="16" height="28" rx="2" fill="#6b4228" />
      <circle cx="54" cy="68" r="1.6" fill="#e8c37a" />
      <rect x="24" y="52" width="12" height="12" rx="2" fill="#7eb3c9" />
      <rect x="60" y="52" width="12" height="12" rx="2" fill="#7eb3c9" />
      <rect x="70" y="18" width="8" height="18" rx="1" fill="#8d5a3a" />
      <ellipse className="hatch-steam" cx="74" cy="12" rx="6" ry="5" fill="#f7efe4" opacity="0.7" />
    </g>
  )
}

export function NestBowl() {
  return (
    <g>
      <ellipse cx="252" cy="168" rx="108" ry="38" fill="#6b4a2e" opacity="0.35" />
      <ellipse cx="252" cy="160" rx="100" ry="32" fill="#8a5a32" />
      <ellipse cx="252" cy="156" rx="86" ry="24" fill="#c4a06a" />
      <ellipse cx="252" cy="154" rx="74" ry="18" fill="#e8d2a8" />
      <g stroke="#6b4228" strokeWidth="3" fill="none" opacity="0.55" strokeLinecap="round">
        <path d="M168 158 C 190 148, 210 170, 232 152" />
        <path d="M210 172 C 240 160, 270 176, 300 164" />
        <path d="M186 166 C 220 178, 270 178, 318 160" />
        <path d="M176 150 C 220 140, 280 142, 330 154" />
      </g>
    </g>
  )
}

export function PapaEagle({
  x,
  y,
  scale = 1,
}: {
  x: number
  y: number
  scale?: number
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <g className="hatch-papa">
      <ellipse cx="0" cy="38" rx="22" ry="8" fill="#4a3424" opacity="0.25" />
      <ellipse cx="0" cy="22" rx="26" ry="22" fill="#6b4428" />
      <ellipse cx="-18" cy="18" rx="10" ry="14" fill="#5a3820" transform="rotate(-18 -18 18)" />
      <ellipse cx="18" cy="18" rx="10" ry="14" fill="#5a3820" transform="rotate(18 18 18)" />
      <circle cx="0" cy="-6" r="20" fill="#f6f1e4" />
      <ellipse cx="-8" cy="-2" rx="5" ry="3.2" fill="#f3c2b4" opacity="0.85" />
      <ellipse cx="8" cy="-2" rx="5" ry="3.2" fill="#f3c2b4" opacity="0.85" />
      <g className="hatch-blink">
        <circle cx="-7" cy="-8" r="2.4" fill="#2a241c" />
        <circle cx="7" cy="-8" r="2.4" fill="#2a241c" />
        <circle cx="-6.2" cy="-8.8" r="0.7" fill="#fff" />
        <circle cx="7.8" cy="-8.8" r="0.7" fill="#fff" />
      </g>
      <path d="M-3 -1 L0 10 L3 -1 Z" fill="#f0b429" />
      <path d="M-2 8 Q0 12 2 8" fill="#e09a28" />
      <ellipse cx="-10" cy="38" rx="6" ry="4" fill="#e09a28" />
      <ellipse cx="10" cy="38" rx="6" ry="4" fill="#e09a28" />
      <path d="M-8 36 Q0 48 8 36" fill="#5a3820" />
    </g>
    </g>
  )
}

export function ChickSprite({
  x,
  y,
  hue,
  mood,
  scale = 1,
}: {
  x: number
  y: number
  hue: number
  mood: 'idle' | 'feed' | 'preen' | 'happy'
  scale?: number
}) {
  const fluff = `hsl(${hue} 42% 62%)`
  const fluffDark = `hsl(${hue} 38% 48%)`
  const anim =
    mood === 'feed' ? 'hatch-peck' : mood === 'preen' ? 'hatch-preen' : mood === 'happy' ? 'hatch-bounce' : 'hatch-roll'
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <g className={anim}>
      <ellipse cx="0" cy="10" rx="11" ry="4" fill="#4a3424" opacity="0.2" />
      <ellipse cx="0" cy="2" rx="13" ry="11" fill={fluff} />
      <ellipse cx="-8" cy="2" rx="5" ry="6" fill={fluffDark} opacity="0.7" />
      <ellipse cx="8" cy="2" rx="5" ry="6" fill={fluffDark} opacity="0.7" />
      <circle cx="0" cy="-6" r="7.5" fill="#f4ead6" />
      <circle cx="-2.6" cy="-7" r="1.5" fill="#2a241c" />
      <circle cx="2.6" cy="-7" r="1.5" fill="#2a241c" />
      <path d="M-1.4 -4 L0 0 L1.4 -4 Z" fill="#f0b429" />
      <ellipse cx="-3.5" cy="-3" rx="2.2" ry="1.4" fill="#f3c2b4" opacity="0.8" />
      <ellipse cx="3.5" cy="-3" rx="2.2" ry="1.4" fill="#f3c2b4" opacity="0.8" />
      {mood === 'feed' && (
        <circle cx="8" cy="6" r="2.2" fill="#e07a54" />
      )}
      {mood === 'preen' && (
        <path d="M10 -4 Q16 -10 12 -14" stroke="#f6f1e4" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      )}
      {mood === 'happy' && (
        <path d="M-4 -16 L0 -20 L4 -16" fill="#f3c2b4" />
      )}
    </g>
    </g>
  )
}

export function EggSprite({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
    <g className="hatch-wobble">
      <ellipse cx="0" cy="8" rx="9" ry="3.5" fill="#4a3424" opacity="0.2" />
      <ellipse cx="0" cy="-2" rx="10" ry="14" fill="#f7efe0" />
      <ellipse cx="-3" cy="-6" rx="3" ry="5" fill="#fff" opacity="0.45" />
      <ellipse cx="2" cy="2" rx="2.5" ry="2" fill="#e8c37a" opacity="0.5" />
    </g>
    </g>
  )
}

export function FeatherMark({ x, y, rot }: { x: number; y: number; rot: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <ellipse cx="0" cy="0" rx="4" ry="11" fill="#f6f1e4" />
      <path d="M0 -10 L0 10" stroke="#e8c37a" strokeWidth="0.8" />
      <ellipse cx="0" cy="-8" rx="2.2" ry="3" fill="#fff" />
    </g>
  )
}

export function ToyMark({ x, y, rot }: { x: number; y: number; rot: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <circle cx="0" cy="0" r="7" fill="#e07a54" />
      <circle cx="0" cy="0" r="4.2" fill="#f3d27a" />
      <circle cx="-3" cy="-8" r="2.2" fill="#7eb3c9" />
      <circle cx="3" cy="-8" r="2.2" fill="#7eb3c9" />
      <path d="M-3 -8 Q0 -14 3 -8" stroke="#6b4228" strokeWidth="1.2" fill="none" />
    </g>
  )
}

export function NestItemSprite({
  kind,
  x,
  y,
  rot,
}: {
  kind: NestItemKind
  x: number
  y: number
  rot: number
}) {
  return kind === 'feather' ? <FeatherMark x={x} y={y} rot={rot} /> : <ToyMark x={x} y={y} rot={rot} />
}

export function LuckyFeatherSprite({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
    <g className="hatch-float">
      <ellipse cx="0" cy="0" rx="5" ry="13" fill="#fff6d8" />
      <path d="M0 -12 L0 12" stroke="#feba45" strokeWidth="1.1" />
      <ellipse cx="0" cy="-10" rx="3" ry="4" fill="#fff" />
      <circle cx="6" cy="-8" r="2" fill="#feba45" opacity="0.7" />
    </g>
    </g>
  )
}

export function DecorSprite({ id, x, y }: { id: DecorId; x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {id === 'lantern' && (
        <>
          <rect x="-6" y="-18" width="12" height="16" rx="3" fill="#e07a54" />
          <rect x="-4" y="-14" width="8" height="8" rx="1" fill="#f3d27a" opacity="0.85" />
          <path d="M0 -22 L0 -18" stroke="#6b4228" strokeWidth="1.4" />
        </>
      )}
      {id === 'flowers' && (
        <>
          <rect x="-6" y="0" width="12" height="8" rx="2" fill="#c4895c" />
          <circle cx="-4" cy="-8" r="4" fill="#e07a54" />
          <circle cx="4" cy="-6" r="4" fill="#d4a0c8" />
          <circle cx="0" cy="-12" r="3.5" fill="#f3d27a" />
        </>
      )}
      {id === 'chime' && (
        <>
          <path d="M-10 -16 H10" stroke="#8d5a3a" strokeWidth="2" />
          <rect x="-8" y="-14" width="3" height="16" rx="1" fill="#7eb3c9" />
          <rect x="-2" y="-12" width="3" height="14" rx="1" fill="#e8c37a" />
          <rect x="4" y="-14" width="3" height="16" rx="1" fill="#c4895c" />
        </>
      )}
      {id === 'wreath' && (
        <>
          <circle cx="0" cy="-6" r="10" fill="none" stroke="#6f8f68" strokeWidth="5" />
          <circle cx="-6" cy="-10" r="2.4" fill="#e07a54" />
          <circle cx="5" cy="-4" r="2.4" fill="#f3d27a" />
        </>
      )}
      {id === 'pond' && (
        <>
          <ellipse cx="0" cy="2" rx="16" ry="7" fill="#6a9bb0" />
          <ellipse cx="-3" cy="1" rx="6" ry="2.5" fill="#c5e4ef" opacity="0.6" />
        </>
      )}
      {id === 'swing' && (
        <>
          <path d="M-14 -10 H14" stroke="#6b4228" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M-7 -10 L-6 8 M7 -10 L6 8" stroke="#8d5a3a" strokeWidth="1.8" />
          <rect x="-9" y="8" width="18" height="4" rx="1.2" fill="#c4895c" />
        </>
      )}
    </g>
  )
}
