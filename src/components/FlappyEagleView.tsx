import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Lock, Play, RotateCcw, Volume2, VolumeX, Wind } from 'lucide-react'
import type { PointsAccount, Session } from '../types'
import { useI18n } from '../i18n'
import { asset } from '../lib/asset'
import { gameAudio } from '../lib/gameAudio'
import { GameHubLeaveButton } from './GameHubLeaveButton'

/** Points awarded per pipe gap passed (same account total as other games). */
const POINTS_PER_GAP = 15
const GOOD_SCORE = 75
/** Floating / hover control — no gravity drop. */
const THRUST = 0.62
const MAX_VY = 6.8
const DAMPING = 0.86
const TAP_BOOST = -5.4
const HOVER_AMP = 0.42
const STEER_GAIN = 0.085
const PIPE_W = 64
const PIPE_GAP = 168
const PIPE_SPEED = 2.6
const PIPE_SPACING = 220
const EAGLE_R = 20

type Phase = 'idle' | 'playing' | 'ended'

interface Pipe {
  x: number
  gapY: number
  scored: boolean
}

interface FlappyEagleViewProps {
  session: Session | null
  account: PointsAccount
  onRequireAuth: () => void
  onRoundComplete: (score: number, hits: number) => void
  onBack: () => void
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

function randGapY(h: number) {
  const margin = 70
  const minY = margin
  const maxY = h - PIPE_GAP - margin
  return minY + Math.random() * Math.max(20, maxY - minY)
}

/** Cute cartoon little white-headed eagle (bald-eagle style), side view. */
function drawCartoonEagle(
  ctx: CanvasRenderingContext2D,
  wingPhase: number,
  tilting: number,
) {
  const wing = Math.sin(wingPhase) * 0.4
  ctx.save()
  ctx.rotate(tilting)

  // far wing
  ctx.fillStyle = '#6b3e1a'
  ctx.beginPath()
  ctx.ellipse(-4, -2, 20, 9, -0.75 + wing, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#3f2310'
  ctx.lineWidth = 1.2
  ctx.stroke()

  // body (brown)
  const body = ctx.createLinearGradient(-10, -8, 14, 16)
  body.addColorStop(0, '#a16207')
  body.addColorStop(0.45, '#78350f')
  body.addColorStop(1, '#451a03')
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.ellipse(0, 4, 15, 17, 0.12, 0, Math.PI * 2)
  ctx.fill()

  // belly patch
  ctx.fillStyle = '#92400e'
  ctx.beginPath()
  ctx.ellipse(4, 8, 8, 10, 0.2, 0, Math.PI * 2)
  ctx.fill()

  // near wing
  ctx.fillStyle = '#92400e'
  ctx.beginPath()
  ctx.ellipse(2, 2, 18, 8, 0.55 - wing, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#451a03'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(-8, 0)
  ctx.quadraticCurveTo(2, -6 - wing * 8, 16, 4)
  ctx.stroke()

  // tail
  ctx.fillStyle = '#78350f'
  ctx.beginPath()
  ctx.moveTo(-12, 10)
  ctx.lineTo(-22, 6)
  ctx.lineTo(-20, 16)
  ctx.lineTo(-10, 14)
  ctx.closePath()
  ctx.fill()

  // white head (小白头)
  ctx.fillStyle = '#f8fafc'
  ctx.beginPath()
  ctx.ellipse(8, -10, 12, 11, -0.15, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(15,23,42,0.12)'
  ctx.lineWidth = 1
  ctx.stroke()

  // cheek blush
  ctx.fillStyle = 'rgba(251,146,60,0.35)'
  ctx.beginPath()
  ctx.ellipse(12, -6, 3.5, 2.2, 0, 0, Math.PI * 2)
  ctx.fill()

  // eye
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.arc(12, -12, 3.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#38bdf8'
  ctx.beginPath()
  ctx.arc(12.2, -12.2, 1.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(13.2, -13.2, 0.9, 0, Math.PI * 2)
  ctx.fill()

  // brow
  ctx.strokeStyle = '#0f172a'
  ctx.lineWidth = 1.6
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(8, -15.5)
  ctx.quadraticCurveTo(12, -17, 16, -15)
  ctx.stroke()

  // yellow beak
  ctx.fillStyle = '#fbbf24'
  ctx.beginPath()
  ctx.moveTo(18, -10)
  ctx.lineTo(30, -6)
  ctx.lineTo(18, -3)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#f59e0b'
  ctx.beginPath()
  ctx.moveTo(18, -6.5)
  ctx.lineTo(30, -6)
  ctx.lineTo(18, -3)
  ctx.closePath()
  ctx.fill()

  // feet (tiny)
  ctx.strokeStyle = '#f59e0b'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(2, 18)
  ctx.lineTo(0, 24)
  ctx.moveTo(6, 18)
  ctx.lineTo(8, 24)
  ctx.stroke()

  // sparkle when flapping hard
  if (Math.abs(wing) > 0.28) {
    ctx.fillStyle = 'rgba(253,224,71,0.85)'
    for (const [sx, sy] of [
      [-18, -14],
      [22, -20],
      [-10, 16],
    ] as const) {
      ctx.beginPath()
      ctx.moveTo(sx, sy - 3)
      ctx.lineTo(sx + 1.2, sy)
      ctx.lineTo(sx, sy + 3)
      ctx.lineTo(sx - 1.2, sy)
      ctx.closePath()
      ctx.fill()
    }
  }

  ctx.restore()
}

export function FlappyEagleView({
  session,
  account,
  onRequireAuth,
  onRoundComplete,
  onBack,
}: FlappyEagleViewProps) {
  const { t } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [score, setScore] = useState(0)
  const [gaps, setGaps] = useState(0)
  const [showKeepTrying, setShowKeepTrying] = useState(false)
  const [muted, setMuted] = useState(() => gameAudio.isMuted())
  const [volume, setVolume] = useState(() => gameAudio.getVolume())

  const phaseRef = useRef<Phase>('idle')
  const scoreRef = useRef(0)
  const gapsRef = useRef(0)
  const eagleRef = useRef({ y: 240, vy: 0, x: 88 })
  const pipesRef = useRef<Pipe[]>([])
  const reported = useRef(false)
  const rafRef = useRef(0)
  const sizeRef = useRef({ w: 360, h: 520 })
  const wingRef = useRef(0)
  const hoverT = useRef(0)
  const keysRef = useRef({ up: false, down: false })
  const pointerRef = useRef<{
    active: boolean
    id: number
    startX: number
    startY: number
    y: number
    moved: boolean
    at: number
  } | null>(null)

  const clearRaf = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
  }, [])

  const resize = useCallback(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const w = Math.min(560, wrap.clientWidth || 360)
    const h = Math.round(Math.max(420, Math.min(560, w * 1.35)))
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    sizeRef.current = { w, h }
  }, [])

  useEffect(() => {
    resize()
    const onResize = () => resize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [resize])

  // Prevent page scroll / pinch-zoom while finger is on the playfield
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const block = (e: TouchEvent) => {
      if (phaseRef.current === 'playing') e.preventDefault()
    }
    el.addEventListener('touchmove', block, { passive: false })
    el.addEventListener('touchstart', block, { passive: false })
    return () => {
      el.removeEventListener('touchmove', block)
      el.removeEventListener('touchstart', block)
    }
  }, [])

  const stopRound = useCallback(
    (finalScore: number, finalGaps: number) => {
      if (phaseRef.current !== 'playing') return
      phaseRef.current = 'ended'
      setPhase('ended')
      clearRaf()
      pointerRef.current = null
      keysRef.current = { up: false, down: false }
      gameAudio.stopBgm()
      gameAudio.playMiss()
      const keepTrying = finalScore < GOOD_SCORE
      setShowKeepTrying(keepTrying)
      gameAudio.playEnd(keepTrying)
      if (!reported.current && finalScore > 0) {
        reported.current = true
        onRoundComplete(finalScore, finalGaps)
      }
    },
    [clearRaf, onRoundComplete],
  )

  const spawnPipes = useCallback((w: number, h: number) => {
    const list: Pipe[] = []
    let x = w + 40
    for (let i = 0; i < 4; i++) {
      list.push({ x, gapY: randGapY(h), scored: false })
      x += PIPE_SPACING
    }
    pipesRef.current = list
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { w, h } = sizeRef.current
    ctx.clearRect(0, 0, w, h)

    // sky
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#1e3a8a')
    g.addColorStop(0.5, '#3b82f6')
    g.addColorStop(1, '#7dd3fc')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)

    // sun
    ctx.fillStyle = 'rgba(253,224,71,0.35)'
    ctx.beginPath()
    ctx.arc(w * 0.82, h * 0.12, 42, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fde047'
    ctx.beginPath()
    ctx.arc(w * 0.82, h * 0.12, 22, 0, Math.PI * 2)
    ctx.fill()

    // clouds
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    const drawCloud = (cx: number, cy: number, s: number) => {
      ctx.beginPath()
      ctx.ellipse(cx, cy, 28 * s, 14 * s, 0, 0, Math.PI * 2)
      ctx.ellipse(cx + 22 * s, cy - 4 * s, 20 * s, 12 * s, 0, 0, Math.PI * 2)
      ctx.ellipse(cx + 44 * s, cy, 24 * s, 13 * s, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    drawCloud(w * 0.15, h * 0.18, 1)
    drawCloud(w * 0.55, h * 0.1, 0.8)

    // ground strip
    ctx.fillStyle = '#15803d'
    ctx.fillRect(0, h - 36, w, 36)
    ctx.fillStyle = '#22c55e'
    ctx.fillRect(0, h - 36, w, 10)
    ctx.strokeStyle = 'rgba(234,179,8,0.45)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, h - 36)
    ctx.lineTo(w, h - 36)
    ctx.stroke()

    // pipes
    for (const p of pipesRef.current) {
      const topH = p.gapY
      const botY = p.gapY + PIPE_GAP
      const botH = h - 36 - botY
      const drawPillar = (x: number, y: number, hh: number, capAtBottom: boolean) => {
        const grad = ctx.createLinearGradient(x, 0, x + PIPE_W, 0)
        grad.addColorStop(0, '#14532d')
        grad.addColorStop(0.25, '#16a34a')
        grad.addColorStop(0.5, '#4ade80')
        grad.addColorStop(0.8, '#16a34a')
        grad.addColorStop(1, '#14532d')
        ctx.fillStyle = grad
        ctx.fillRect(x, y, PIPE_W, hh)
        ctx.strokeStyle = '#052e16'
        ctx.lineWidth = 3
        ctx.strokeRect(x, y, PIPE_W, hh)
        const capY = capAtBottom ? y + hh - 16 : y
        ctx.fillStyle = '#22c55e'
        ctx.fillRect(x - 6, capY, PIPE_W + 12, 18)
        ctx.strokeRect(x - 6, capY, PIPE_W + 12, 18)
        ctx.fillStyle = '#eab308'
        ctx.fillRect(x - 2, capY + 5, PIPE_W + 4, 5)
      }
      if (topH > 0) drawPillar(p.x, 0, topH, true)
      if (botH > 0) drawPillar(p.x, botY, botH, false)
    }

    // eagle — cartoon little white-headed eagle
    const e = eagleRef.current
    const tilt = clamp(e.vy * 0.045, -0.45, 0.55)
    ctx.save()
    ctx.translate(e.x, e.y)
    wingRef.current += pointerRef.current?.active || keysRef.current.up || keysRef.current.down ? 0.45 : 0.18
    drawCartoonEagle(ctx, wingRef.current, tilt)
    ctx.restore()

    // score chip on canvas while playing
    if (phaseRef.current === 'playing') {
      ctx.fillStyle = 'rgba(15,23,42,0.55)'
      ctx.beginPath()
      ctx.roundRect(w / 2 - 36, 12, 72, 32, 10)
      ctx.fill()
      ctx.fillStyle = '#fde047'
      ctx.font = 'bold 20px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(scoreRef.current), w / 2, 28)
    }
  }, [])

  const tick = useCallback(() => {
    if (phaseRef.current !== 'playing') return
    const { h } = sizeRef.current
    const e = eagleRef.current
    const keys = keysRef.current
    const ptr = pointerRef.current
    hoverT.current += 0.08

    let thrusting = false
    if (keys.up && !keys.down) {
      e.vy -= THRUST
      thrusting = true
    } else if (keys.down && !keys.up) {
      e.vy += THRUST
      thrusting = true
    }

    if (ptr?.active) {
      // Steer toward finger / pointer Y while held (float control)
      const dy = ptr.y - e.y
      if (Math.abs(dy) > 4 || ptr.moved) {
        e.vy += clamp(dy * STEER_GAIN, -THRUST * 1.35, THRUST * 1.35)
        thrusting = true
      } else {
        // Hold in place near bird → gentle rise for easy one-thumb play
        e.vy -= THRUST * 0.55
        thrusting = true
      }
    }

    if (!thrusting) {
      // Hover: damp velocity and add a gentle float bob — never plummet
      e.vy *= DAMPING
      if (Math.abs(e.vy) < 0.08) e.vy = 0
      e.y += Math.sin(hoverT.current) * HOVER_AMP
    }

    e.vy = clamp(e.vy, -MAX_VY, MAX_VY)
    e.y += e.vy

    // ground / ceiling
    if (e.y + EAGLE_R >= h - 36 || e.y - EAGLE_R <= 0) {
      draw()
      stopRound(scoreRef.current, gapsRef.current)
      return
    }

    const pipes = pipesRef.current
    for (const p of pipes) {
      p.x -= PIPE_SPEED
    }
    // recycle off-screen pipes
    for (const p of pipes) {
      if (p.x + PIPE_W < -20) {
        const maxX = Math.max(...pipes.map((q) => q.x))
        p.x = maxX + PIPE_SPACING
        p.gapY = randGapY(h)
        p.scored = false
      }
    }

    // collisions + scoring
    for (const p of pipes) {
      const withinX = e.x + EAGLE_R > p.x && e.x - EAGLE_R < p.x + PIPE_W
      if (withinX) {
        const top = p.gapY
        const bot = p.gapY + PIPE_GAP
        if (e.y - EAGLE_R < top || e.y + EAGLE_R > bot) {
          draw()
          stopRound(scoreRef.current, gapsRef.current)
          return
        }
      }
      if (!p.scored && p.x + PIPE_W < e.x - EAGLE_R) {
        p.scored = true
        gapsRef.current += 1
        scoreRef.current += POINTS_PER_GAP
        setGaps(gapsRef.current)
        setScore(scoreRef.current)
        gameAudio.playHit(POINTS_PER_GAP)
      }
    }

    draw()
    rafRef.current = requestAnimationFrame(tick)
  }, [draw, stopRound])

  function toneBoost() {
    try {
      gameAudio.playHit(6)
    } catch {
      /* ignore */
    }
  }

  const applyTapBoost = useCallback(() => {
    if (phaseRef.current !== 'playing') return
    eagleRef.current.vy = Math.min(eagleRef.current.vy, 0) + TAP_BOOST
    eagleRef.current.vy = clamp(eagleRef.current.vy, -MAX_VY, MAX_VY)
    wingRef.current = 0
    toneBoost()
  }, [])

  const startRound = async () => {
    if (!session) {
      onRequireAuth()
      return
    }
    await gameAudio.unlock()
    clearRaf()
    reported.current = false
    scoreRef.current = 0
    gapsRef.current = 0
    setScore(0)
    setGaps(0)
    setShowKeepTrying(false)
    pointerRef.current = null
    keysRef.current = { up: false, down: false }
    hoverT.current = 0
    resize()
    const { w, h } = sizeRef.current
    eagleRef.current = { x: Math.min(96, w * 0.28), y: h * 0.45, vy: 0 }
    spawnPipes(w, h)
    phaseRef.current = 'playing'
    setPhase('playing')
    gameAudio.playStart()
    gameAudio.startBgm()
    rafRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (phaseRef.current !== 'playing') return
      if (ev.code === 'Space' || ev.key === ' ' || ev.key === 'ArrowUp' || ev.key === 'w' || ev.key === 'W') {
        ev.preventDefault()
        if (!keysRef.current.up) {
          keysRef.current.up = true
          // initial boost so a quick tap still rises
          if (ev.code === 'Space' || ev.key === ' ') applyTapBoost()
        }
      }
      if (ev.key === 'ArrowDown' || ev.key === 's' || ev.key === 'S') {
        ev.preventDefault()
        keysRef.current.down = true
      }
    }
    const onKeyUp = (ev: KeyboardEvent) => {
      if (ev.code === 'Space' || ev.key === ' ' || ev.key === 'ArrowUp' || ev.key === 'w' || ev.key === 'W') {
        keysRef.current.up = false
      }
      if (ev.key === 'ArrowDown' || ev.key === 's' || ev.key === 'S') {
        keysRef.current.down = false
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [applyTapBoost])

  useEffect(() => () => {
    clearRaf()
    gameAudio.stopBgm()
  }, [clearRaf])

  useEffect(() => {
    draw()
  }, [draw, phase])

  const canvasLocalY = (e: React.PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return e.clientY
    const rect = canvas.getBoundingClientRect()
    const { h } = sizeRef.current
    return ((e.clientY - rect.top) / Math.max(1, rect.height)) * h
  }

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    if (phaseRef.current !== 'playing') return
    try {
      ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    } catch {
      /* ignore */
    }
    const y = canvasLocalY(e)
    pointerRef.current = {
      active: true,
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      y,
      moved: false,
      at: performance.now(),
    }
    wingRef.current = 0
    toneBoost()
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const ptr = pointerRef.current
    if (!ptr?.active || ptr.id !== e.pointerId) return
    ptr.y = canvasLocalY(e)
    const dist = Math.hypot(e.clientX - ptr.startX, e.clientY - ptr.startY)
    if (dist > 10) ptr.moved = true
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const ptr = pointerRef.current
    if (!ptr?.active || ptr.id !== e.pointerId) return
    const held = performance.now() - ptr.at
    // Short tap with little drag → upward boost (mobile-friendly rise)
    if (!ptr.moved && held < 220) {
      applyTapBoost()
    }
    pointerRef.current = null
  }

  if (!session) {
    return (
      <section className="hawk-card mx-auto max-w-lg px-6 py-14 text-center">
        <Lock className="mx-auto mb-3 h-10 w-10 text-hawk-gold" />
        <h1 className="text-2xl font-bold text-hawk-cream">{t('flappy.title')}</h1>
        <p className="mt-2 text-sm text-hawk-muted">{t('game.locked')}</p>
        <button
          type="button"
          onClick={onRequireAuth}
          className="hawk-btn hawk-btn-primary mt-6 px-5 py-2.5 text-sm"
        >
          {t('auth.signIn')}
        </button>
        <GameHubLeaveButton onLeave={onBack} variant="locked" />
      </section>
    )
  }

  return (
    <section className="relative">
      <GameHubLeaveButton
        onLeave={() => {
          clearRaf()
          gameAudio.stopBgm()
          phaseRef.current = 'idle'
          onBack()
        }}
      />

      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-hawk-gold">
            <Wind className="h-3.5 w-3.5" />
            {t('flappy.badge')}
          </p>
          <h1 className="text-2xl font-bold text-hawk-cream sm:text-3xl">{t('flappy.title')}</h1>
          <p className="mt-2 max-w-xl text-sm text-hawk-muted">{t('flappy.subtitle')}</p>
        </div>
        <div className="rounded-xl border border-hawk-gold/30 bg-hawk-gold/10 px-4 py-3 text-right">
          <p className="text-xs text-hawk-muted">{t('game.totalPoints')}</p>
          <p className="text-2xl font-bold text-hawk-gold">{account.total}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-[11px]">
        <span className="rounded-full border border-hawk-gold/40 bg-hawk-gold/10 px-2 py-1 text-hawk-gold">
          🦅 +{POINTS_PER_GAP} / gap
        </span>
        <span className="rounded-full border border-hawk-border bg-hawk-panel px-2 py-1 text-hawk-muted">
          {t('flappy.controlHint')}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-hawk-muted">{t('flappy.collideHint')}</p>
        <div className="flex flex-wrap items-center gap-3">
          <label className={`flex items-center gap-2 text-sm ${muted ? 'opacity-50' : 'text-hawk-cream'}`}>
            <span className="text-xs text-hawk-muted">{t('game.volume')}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              className="h-2 w-28 cursor-pointer accent-hawk-gold sm:w-36"
              onChange={(e) => {
                const v = Number(e.target.value)
                setVolume(v)
                gameAudio.setVolume(v)
              }}
            />
          </label>
          <button
            type="button"
            className="hawk-btn hawk-btn-ghost px-3 py-1.5 text-sm"
            onClick={() => {
              const next = gameAudio.toggleMute()
              setMuted(next)
              if (!next && phaseRef.current === 'playing') gameAudio.startBgm()
              if (next) gameAudio.stopBgm()
            }}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            {muted ? t('game.unmute') : t('game.mute')}
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:gap-3">
        <div className="hawk-card px-3 py-3 text-center">
          <p className="text-xs text-hawk-muted">{t('game.roundScore')}</p>
          <p className="text-xl font-bold text-hawk-cream">{score}</p>
        </div>
        <div className="hawk-card px-3 py-3 text-center">
          <p className="text-xs text-hawk-muted">{t('flappy.gaps')}</p>
          <p className="text-xl font-bold text-hawk-blue-bright">{gaps}</p>
        </div>
      </div>

      <div
        ref={wrapRef}
        className="relative mx-auto max-w-xl overflow-hidden rounded-2xl border border-hawk-border touch-none select-none"
        style={{ touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          className="block w-full cursor-pointer"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />

        {phase === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 p-6 text-center backdrop-blur-[2px]">
            <p className="mb-4 max-w-sm text-sm text-hawk-cream">{t('flappy.ready')}</p>
            <button
              type="button"
              className="hawk-btn hawk-btn-primary inline-flex items-center gap-2 px-5 py-2.5"
              onClick={() => void startRound()}
            >
              <Play className="h-4 w-4" />
              {t('flappy.start')}
            </button>
          </div>
        )}

        {phase === 'ended' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 p-6 text-center backdrop-blur-[2px]">
            {showKeepTrying ? (
              <>
                <img
                  src={asset('game/keep-trying.png')}
                  alt=""
                  className="mb-3 h-28 w-28 object-contain"
                />
                <p className="text-lg font-bold text-hawk-gold">{t('game.keepTrying')}</p>
                <p className="mt-1 text-sm text-hawk-muted">{t('flappy.gameOver')}</p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold text-hawk-cream">{t('game.roundOver')}</p>
                <p className="mt-1 text-sm text-hawk-gold">{t('game.earned', { n: score })}</p>
              </>
            )}
            <p className="mt-2 text-xs text-hawk-muted">{t('game.totalNow', { n: account.total })}</p>
            <button
              type="button"
              className="hawk-btn hawk-btn-primary mt-5 inline-flex items-center gap-2 px-5 py-2.5"
              onClick={() => void startRound()}
            >
              <RotateCcw className="h-4 w-4" />
              {t('game.playAgain')}
            </button>
            <button
              type="button"
              className="hawk-btn hawk-btn-ghost mt-3 inline-flex items-center gap-2 px-5 py-2.5"
              onClick={() => {
                clearRaf()
                gameAudio.stopBgm()
                phaseRef.current = 'idle'
                onBack()
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              {t('gameHub.leave')}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
