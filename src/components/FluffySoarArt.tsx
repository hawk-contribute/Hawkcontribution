/** Hub cover + SVG sprites for Fly, Fluffy Eagle (蓬蓬). Procedural pastel art — no assets. */

export function FluffySoarCover() {
  return (
    <div className="fluffy-scene pointer-events-none relative h-full w-full overflow-hidden transition duration-300 group-hover:scale-105">
      <div className="fluffy-sky" />
      <div className="hatch-grain" />
      <svg
        viewBox="0 0 400 220"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <SunsetSun />
        <CloudSea />
        <JellyRainbow x={78} y={92} scale={1.25} />
        <SoftCloud x={210} y={158} scale={1.55} />
        <PengpengSprite x={210} y={112} scale={1.45} />
        <JellyRainbow x={332} y={64} scale={0.95} />
        <SoftCloud x={48} y={168} scale={1.1} />
      </svg>
    </div>
  )
}

function SunsetSun() {
  return (
    <g>
      <circle cx="328" cy="42" r="46" fill="#ffe8b0" opacity="0.45" />
      <circle cx="328" cy="42" r="28" fill="#ffd27a" opacity="0.9" />
      <circle cx="328" cy="42" r="16" fill="#fff6d8" />
    </g>
  )
}

function CloudSea() {
  return (
    <g opacity="0.95">
      <ellipse cx="40" cy="198" rx="70" ry="28" fill="#f7e9ff" />
      <ellipse cx="120" cy="204" rx="80" ry="30" fill="#ffe4f0" />
      <ellipse cx="210" cy="200" rx="90" ry="32" fill="#fff6e8" />
      <ellipse cx="300" cy="206" rx="78" ry="28" fill="#e4f0ff" />
      <ellipse cx="380" cy="200" rx="70" ry="30" fill="#fde7d8" />
      <ellipse cx="60" cy="186" rx="36" ry="16" fill="#fff" opacity="0.7" />
      <ellipse cx="250" cy="188" rx="40" ry="14" fill="#fff" opacity="0.55" />
    </g>
  )
}

export function SoftCloud({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity="0.95">
      <ellipse cx="0" cy="6" rx="28" ry="10" fill="#e8d7f5" opacity="0.45" />
      <ellipse cx="-16" cy="0" rx="16" ry="12" fill="#fff8fb" />
      <ellipse cx="0" cy="-4" rx="18" ry="14" fill="#ffffff" />
      <ellipse cx="16" cy="0" rx="15" ry="11" fill="#fff1e8" />
      <ellipse cx="4" cy="4" rx="20" ry="9" fill="#f3e8ff" />
    </g>
  )
}

export function JellyRainbow({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} className="fluffy-jelly">
      <ellipse cx="0" cy="10" rx="18" ry="6" fill="#c4b5fd" opacity="0.25" />
      <ellipse cx="0" cy="0" rx="20" ry="16" fill="#fda4af" />
      <ellipse cx="-6" cy="-2" rx="12" ry="11" fill="#fdba74" opacity="0.9" />
      <ellipse cx="8" cy="-1" rx="11" ry="10" fill="#fde047" opacity="0.85" />
      <ellipse cx="0" cy="4" rx="12" ry="8" fill="#86efac" opacity="0.8" />
      <ellipse cx="6" cy="6" rx="8" ry="6" fill="#7dd3fc" opacity="0.75" />
      <ellipse cx="-4" cy="-6" rx="5" ry="4" fill="#fff" opacity="0.55" />
    </g>
  )
}

/** Chubby cotton-candy Q-version bald eagle 蓬蓬. */
export function PengpengSprite({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} className="fluffy-pengpeng">
      <ellipse cx="0" cy="28" rx="18" ry="6" fill="#c4a0b0" opacity="0.28" />
      {/* far wing */}
      <ellipse cx="-20" cy="6" rx="12" ry="7" fill="#c48b6a" transform="rotate(-28 -20 6)" />
      {/* cotton body */}
      <ellipse cx="1" cy="13" rx="22" ry="18" fill="#8a4f2e" opacity="0.22" />
      <ellipse cx="0" cy="10" rx="22" ry="18" fill="#d4a07a" />
      <ellipse cx="-2" cy="12" rx="14" ry="12" fill="#e8b894" />
      <ellipse cx="10" cy="8" rx="8" ry="7" fill="#c4895c" opacity="0.55" />
      {/* near wing */}
      <ellipse cx="18" cy="8" rx="11" ry="6.5" fill="#b87a58" transform="rotate(22 18 8)" />
      {/* cotton-candy white head */}
      <circle cx="0" cy="-10" r="16" fill="#fff6f0" stroke="#e8c4b0" strokeWidth="1.2" />
      <ellipse cx="-11" cy="-12" rx="7" ry="8" fill="#ffe4f0" />
      <ellipse cx="11" cy="-12" rx="7" ry="8" fill="#ffe4f0" />
      <ellipse cx="0" cy="-18" rx="9" ry="7" fill="#ffffff" />
      <ellipse cx="-6" cy="-4" rx="4.2" ry="2.6" fill="#f3c2b4" opacity="0.9" />
      <ellipse cx="6" cy="-4" rx="4.2" ry="2.6" fill="#f3c2b4" opacity="0.9" />
      <g className="hatch-blink">
        <circle cx="-5" cy="-11" r="2.3" fill="#3a2a1c" />
        <circle cx="5" cy="-11" r="2.3" fill="#3a2a1c" />
        <circle cx="-4.3" cy="-11.7" r="0.7" fill="#fff" />
        <circle cx="5.7" cy="-11.7" r="0.7" fill="#fff" />
      </g>
      <path d="M-2.2 -6 L0 2 L2.2 -6 Z" fill="#f0b429" />
      <path d="M-1.4 0 Q0 4 1.4 0" fill="#e09a28" />
      <ellipse cx="-8" cy="24" rx="5" ry="3.2" fill="#f0b429" />
      <ellipse cx="8" cy="24" rx="5" ry="3.2" fill="#f0b429" />
      {/* sparkles */}
      <path d="M-22 -16 L-20.5 -20 L-19 -16 L-22.5 -18 L-18.5 -18 Z" fill="#ffe08a" opacity="0.9" />
      <path d="M22 -8 L23.2 -11 L24.4 -8 L21.6 -9.4 L24.8 -9.4 Z" fill="#fff" opacity="0.85" />
    </g>
  )
}
