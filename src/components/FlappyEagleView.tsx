import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Lock, Play, RotateCcw, Volume2, VolumeX, Wind } from 'lucide-react'
import type { PointsAccount, Session } from '../types'
import { useI18n } from '../i18n'
import { asset } from '../lib/asset'
import { gameAudio } from '../lib/gameAudio'

/** Points awarded per pipe gap passed (same account total as other games). */
const POINTS_PER_GAP = 15
const GOOD_SCORE = 75
const GRAVITY = 0.42
const FLAP_VY = -7.6
const PIPE_W = 64
const PIPE_GAP = 168
const PIPE_SPEED = 2.6
const PIPE_SPACING = 220
const EAGLE_R = 18

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
  const eagleImg = useRef<HTMLImageElement | null>(null)
  const wingRef = useRef(0)

  useEffect(() => {
    const img = new Image()
    img.src = asset('game/eagle-mascot.jpg')
    eagleImg.current = img
  }, [])

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

    // eagle
    const e = eagleRef.current
    const img = eagleImg.current
    const tilt = clamp(e.vy * 0.04, -0.55, 0.7)
    ctx.save()
    ctx.translate(e.x, e.y)
    ctx.rotate(tilt)
    wingRef.current += 0.35
    const wing = Math.sin(wingRef.current) * 0.35

    // wing silhouette
    ctx.fillStyle = '#78350f'
    ctx.beginPath()
    ctx.ellipse(-6, -2, 22, 10, -0.6 + wing, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(8, 4, 18, 8, 0.5 - wing, 0, Math.PI * 2)
    ctx.fill()

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.beginPath()
      ctx.arc(0, 0, EAGLE_R + 2, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(img, -EAGLE_R - 2, -EAGLE_R - 2, (EAGLE_R + 2) * 2, (EAGLE_R + 2) * 2)
    } else {
      // fallback cartoon eagle
      ctx.fillStyle = '#78350f'
      ctx.beginPath()
      ctx.ellipse(0, 4, 16, 18, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#f8fafc'
      ctx.beginPath()
      ctx.arc(2, -10, 12, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fbbf24'
      ctx.beginPath()
      ctx.moveTo(10, -10)
      ctx.lineTo(24, -4)
      ctx.lineTo(10, -2)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#0f172a'
      ctx.beginPath()
      ctx.arc(4, -12, 3, 0, Math.PI * 2)
      ctx.fill()
    }
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
    e.vy += GRAVITY
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

  const flap = useCallback(() => {
    if (phaseRef.current !== 'playing') return
    eagleRef.current.vy = FLAP_VY
    wingRef.current = 0
    toneFlap()
  }, [])

  function toneFlap() {
    try {
      gameAudio.playHit(6)
    } catch {
      /* ignore */
    }
  }

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
    const onKey = (ev: KeyboardEvent) => {
      if (ev.code === 'Space' || ev.key === ' ') {
        ev.preventDefault()
        if (phaseRef.current === 'playing') flap()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flap])

  useEffect(() => () => {
    clearRaf()
    gameAudio.stopBgm()
  }, [clearRaf])

  useEffect(() => {
    draw()
  }, [draw, phase])

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    if (phaseRef.current === 'playing') {
      try {
        ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
      } catch {
        /* ignore */
      }
      flap()
    }
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
        <button
          type="button"
          onClick={onBack}
          className="mt-4 block w-full text-sm text-hawk-muted hover:text-hawk-cream"
        >
          {t('gameHub.back')}
        </button>
      </section>
    )
  }

  return (
    <section className="relative">
      <button
        type="button"
        onClick={() => {
          clearRaf()
          gameAudio.stopBgm()
          phaseRef.current = 'idle'
          onBack()
        }}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-hawk-muted hover:text-hawk-cream"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('gameHub.back')}
      </button>

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
          </div>
        )}
      </div>
    </section>
  )
}
