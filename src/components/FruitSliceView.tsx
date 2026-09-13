import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Lock, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import type { PointsAccount, Session } from '../types'
import { useI18n } from '../i18n'
import { asset } from '../lib/asset'
import { gameAudio } from '../lib/gameAudio'

const ROUND_MS = 45_000
const GRAVITY = 0.22
const SPAWN_MIN = 480
const SPAWN_MAX = 980
const BOMB_WEIGHT = 14
const GOOD_SCORE = 100

type Phase = 'idle' | 'playing' | 'ended'
type EndReason = 'time' | 'bomb' | null

interface FruitDef {
  id: string
  src?: string
  points: number
  weight: number
  isBomb?: boolean
  radius: number
}

const FRUITS: FruitDef[] = [
  { id: 'mascot', src: 'game/eagle-mascot.jpg', points: 10, weight: 26, radius: 34 },
  { id: 'fly', src: 'game/hawk-fly.jpg', points: 14, weight: 22, radius: 34 },
  { id: 'rocket', src: 'game/eagle-rocket.jpg', points: 18, weight: 16, radius: 36 },
  { id: 'dance', src: 'game/hawk-dance.gif', points: 24, weight: 12, radius: 36 },
  { id: 'reward', src: 'game/hawk-reward.jpg', points: 30, weight: 8, radius: 38 },
  { id: 'rareToken', src: 'game/rare-hawk-token.png', points: 45, weight: 6, radius: 38 },
  { id: 'rareSuper', src: 'game/rare-super-hawk.png', points: 60, weight: 3, radius: 40 },
  { id: 'bomb', points: 0, weight: BOMB_WEIGHT, isBomb: true, radius: 32 },
]

interface FlyingItem {
  key: number
  def: FruitDef
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  spin: number
  sliced: boolean
  img?: HTMLImageElement
}

interface TrailPt {
  x: number
  y: number
  t: number
}

function pickFruit(): FruitDef {
  const total = FRUITS.reduce((n, f) => n + f.weight, 0)
  let r = Math.random() * total
  for (const f of FRUITS) {
    r -= f.weight
    if (r <= 0) return f
  }
  return FRUITS[0]
}

function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1
  const dy = y2 - y1
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(px - x1, py - y1)
  let t = ((px - x1) * dx + (py - y1) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

function BombSprite({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <circle cx="32" cy="36" r="20" fill="#1e293b" />
      <circle cx="32" cy="36" r="20" fill="none" stroke="#475569" strokeWidth="2" />
      <rect x="28" y="12" width="8" height="10" rx="2" fill="#64748b" />
      <path d="M32 12c6-8 14-6 16-2" fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
      <circle cx="48" cy="8" r="4" fill="#fbbf24" />
      <text x="32" y="42" textAnchor="middle" fontSize="18" fill="#ef4444" fontWeight="bold">
        !
      </text>
    </svg>
  )
}

interface FruitSliceViewProps {
  session: Session | null
  account: PointsAccount
  onRequireAuth: () => void
  onRoundComplete: (score: number, hits: number) => void
  onBack: () => void
}

export function FruitSliceView({
  session,
  account,
  onRequireAuth,
  onRoundComplete,
  onBack,
}: FruitSliceViewProps) {
  const { t } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [score, setScore] = useState(0)
  const [slices, setSlices] = useState(0)
  const [timeLeft, setTimeLeft] = useState(ROUND_MS)
  const [endReason, setEndReason] = useState<EndReason>(null)
  const [showKeepTrying, setShowKeepTrying] = useState(false)
  const [muted, setMuted] = useState(() => gameAudio.isMuted())
  const [volume, setVolume] = useState(() => gameAudio.getVolume())

  const phaseRef = useRef<Phase>('idle')
  const scoreRef = useRef(0)
  const slicesRef = useRef(0)
  const itemsRef = useRef<FlyingItem[]>([])
  const trailRef = useRef<TrailPt[]>([])
  const swipingRef = useRef(false)
  const lastPtr = useRef<{ x: number; y: number } | null>(null)
  const keyRef = useRef(0)
  const imgCache = useRef<Record<string, HTMLImageElement>>({})
  const rafRef = useRef(0)
  const spawnTimer = useRef(0)
  const roundStart = useRef(0)
  const reported = useRef(false)
  const sizeRef = useRef({ w: 360, h: 480 })

  const preload = useCallback(() => {
    for (const f of FRUITS) {
      if (!f.src || imgCache.current[f.src]) continue
      const img = new Image()
      img.src = asset(f.src)
      imgCache.current[f.src] = img
    }
  }, [])

  useEffect(() => {
    preload()
  }, [preload])

  const clearTimers = useCallback(() => {
    if (spawnTimer.current) window.clearTimeout(spawnTimer.current)
    spawnTimer.current = 0
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
  }, [])

  const stopRound = useCallback(
    (finalScore: number, finalSlices: number, reason: EndReason) => {
      if (phaseRef.current !== 'playing') return
      phaseRef.current = 'ended'
      setPhase('ended')
      setEndReason(reason)
      clearTimers()
      gameAudio.stopBgm()
      const keepTrying = reason === 'bomb' || (reason === 'time' && finalScore < GOOD_SCORE)
      setShowKeepTrying(keepTrying)
      gameAudio.playEnd(keepTrying)
      if (reason === 'bomb') gameAudio.playBomb()
      itemsRef.current = []
      trailRef.current = []
      if (!reported.current && finalScore > 0) {
        reported.current = true
        onRoundComplete(finalScore, finalSlices)
      }
    },
    [clearTimers, onRoundComplete],
  )

  const spawnOne = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || phaseRef.current !== 'playing') return
    const w = sizeRef.current.w
    const h = sizeRef.current.h
    const def = pickFruit()
    const x = 40 + Math.random() * Math.max(40, w - 80)
    const item: FlyingItem = {
      key: ++keyRef.current,
      def,
      x,
      y: h + 20,
      vx: (Math.random() - 0.5) * 5.5,
      vy: -(9.5 + Math.random() * 4.5),
      rot: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.18,
      sliced: false,
      img: def.src ? imgCache.current[def.src] : undefined,
    }
    itemsRef.current.push(item)
  }, [])

  const scheduleSpawn = useCallback(() => {
    if (phaseRef.current !== 'playing') return
    spawnOne()
    // Often toss 2–3 at once for ninja feel
    if (Math.random() < 0.35) spawnOne()
    if (Math.random() < 0.12) spawnOne()
    const delay = SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN)
    spawnTimer.current = window.setTimeout(scheduleSpawn, delay)
  }, [spawnOne])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { w, h } = sizeRef.current
    ctx.clearRect(0, 0, w, h)

    // soft ground glow
    const g = ctx.createLinearGradient(0, h * 0.55, 0, h)
    g.addColorStop(0, 'rgba(15,23,42,0)')
    g.addColorStop(1, 'rgba(234,179,8,0.08)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)

    const now = performance.now()
    for (const it of itemsRef.current) {
      if (it.sliced) continue
      ctx.save()
      ctx.translate(it.x, it.y)
      ctx.rotate(it.rot)
      const r = it.def.radius
      if (it.def.isBomb) {
        // draw bomb via path roughly matching SVG
        ctx.beginPath()
        ctx.arc(0, 4, r * 0.72, 0, Math.PI * 2)
        ctx.fillStyle = '#1e293b'
        ctx.fill()
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 3
        ctx.stroke()
        ctx.fillStyle = '#fbbf24'
        ctx.beginPath()
        ctx.arc(r * 0.35, -r * 0.55, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#f87171'
        ctx.font = `bold ${Math.floor(r * 0.7)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('!', 0, 6)
      } else if (it.img && it.img.complete) {
        ctx.beginPath()
        ctx.arc(0, 0, r, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()
        ctx.drawImage(it.img, -r, -r, r * 2, r * 2)
      } else {
        ctx.beginPath()
        ctx.arc(0, 0, r, 0, Math.PI * 2)
        ctx.fillStyle = '#ca8a04'
        ctx.fill()
      }
      ctx.restore()
    }

    // slash trail
    const trail = trailRef.current.filter((p) => now - p.t < 180)
    trailRef.current = trail
    if (trail.length > 1) {
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1]
        const b = trail[i]
        const age = (now - b.t) / 180
        ctx.strokeStyle = `rgba(250, 204, 21, ${0.85 * (1 - age)})`
        ctx.lineWidth = 5 * (1 - age) + 1
        ctx.shadowColor = 'rgba(250,204,21,0.6)'
        ctx.shadowBlur = 8
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }
      ctx.shadowBlur = 0
    }
  }, [])

  const tick = useCallback(() => {
    if (phaseRef.current !== 'playing') return
    const h = sizeRef.current.h
    const elapsed = performance.now() - roundStart.current
    const left = Math.max(0, ROUND_MS - elapsed)
    setTimeLeft(left)
    if (left <= 0) {
      stopRound(scoreRef.current, slicesRef.current, 'time')
      draw()
      return
    }

    const items = itemsRef.current
    for (const it of items) {
      if (it.sliced) continue
      it.vy += GRAVITY
      it.x += it.vx
      it.y += it.vy
      it.rot += it.spin
    }
    itemsRef.current = items.filter((it) => it.y < h + 120 && !it.sliced)

    // swipe hit tests
    const trail = trailRef.current
    if (swipingRef.current && trail.length >= 2) {
      const a = trail[trail.length - 2]
      const b = trail[trail.length - 1]
      const segLen = Math.hypot(b.x - a.x, b.y - a.y)
      if (segLen > 4) {
        for (const it of itemsRef.current) {
          if (it.sliced) continue
          const d = distToSegment(it.x, it.y, a.x, a.y, b.x, b.y)
          if (d <= it.def.radius * 0.92) {
            if (it.def.isBomb) {
              it.sliced = true
              stopRound(scoreRef.current, slicesRef.current, 'bomb')
              draw()
              return
            }
            it.sliced = true
            const pts = it.def.points
            scoreRef.current += pts
            slicesRef.current += 1
            setScore(scoreRef.current)
            setSlices(slicesRef.current)
            gameAudio.playSlice(pts)
          }
        }
      }
    }

    draw()
    rafRef.current = requestAnimationFrame(tick)
  }, [draw, stopRound])

  const resize = useCallback(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const rect = wrap.getBoundingClientRect()
    const w = Math.max(280, Math.floor(rect.width))
    const h = Math.max(360, Math.min(560, Math.floor(w * 1.25)))
    sizeRef.current = { w, h }
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    draw()
  }, [draw])

  useEffect(() => {
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [resize])

  useEffect(() => () => clearTimers(), [clearTimers])

  const ptrPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * sizeRef.current.w,
      y: ((e.clientY - rect.top) / rect.height) * sizeRef.current.h,
    }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== 'playing') return
    e.currentTarget.setPointerCapture(e.pointerId)
    swipingRef.current = true
    const p = ptrPos(e)
    lastPtr.current = p
    trailRef.current.push({ ...p, t: performance.now() })
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!swipingRef.current || phaseRef.current !== 'playing') return
    const p = ptrPos(e)
    lastPtr.current = p
    trailRef.current.push({ ...p, t: performance.now() })
    if (trailRef.current.length > 48) trailRef.current.splice(0, trailRef.current.length - 48)
  }

  const onPointerUp = () => {
    swipingRef.current = false
    lastPtr.current = null
  }

  const startRound = async () => {
    if (!session) {
      onRequireAuth()
      return
    }
    preload()
    await gameAudio.unlock()
    clearTimers()
    reported.current = false
    scoreRef.current = 0
    slicesRef.current = 0
    setScore(0)
    setSlices(0)
    setTimeLeft(ROUND_MS)
    setEndReason(null)
    setShowKeepTrying(false)
    itemsRef.current = []
    trailRef.current = []
    phaseRef.current = 'playing'
    setPhase('playing')
    roundStart.current = performance.now()
    gameAudio.playStart()
    gameAudio.startBgm()
    resize()
    scheduleSpawn()
    rafRef.current = requestAnimationFrame(tick)
  }

  if (!session) {
    return (
      <section className="hawk-card mx-auto max-w-lg px-6 py-14 text-center">
        <Lock className="mx-auto mb-3 h-10 w-10 text-hawk-gold" />
        <h1 className="text-2xl font-bold text-hawk-cream">{t('fruit.title')}</h1>
        <p className="mt-2 text-sm text-hawk-muted">{t('game.locked')}</p>
        <button
          type="button"
          onClick={onRequireAuth}
          className="hawk-btn hawk-btn-primary mt-6 px-5 py-2.5 text-sm"
        >
          {t('auth.signIn')}
        </button>
        <button type="button" onClick={onBack} className="mt-4 block w-full text-sm text-hawk-muted hover:text-hawk-cream">
          {t('gameHub.back')}
        </button>
      </section>
    )
  }

  const seconds = Math.ceil(timeLeft / 1000)

  return (
    <section className="relative">
      <button
        type="button"
        onClick={() => {
          clearTimers()
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
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-hawk-gold">
            {t('fruit.badge')}
          </p>
          <h1 className="text-2xl font-bold text-hawk-cream sm:text-3xl">{t('fruit.title')}</h1>
          <p className="mt-2 max-w-xl text-sm text-hawk-muted">{t('fruit.subtitle')}</p>
          <p className="mt-1 text-xs text-hawk-muted">{t('fruit.bombHint')}</p>
        </div>
        <div className="rounded-xl border border-hawk-gold/30 bg-hawk-gold/10 px-4 py-3 text-right">
          <p className="text-xs text-hawk-muted">{t('game.totalPoints')}</p>
          <p className="text-2xl font-bold text-hawk-gold">{account.total}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FRUITS.filter((f) => !f.isBomb).map((f) => (
          <div
            key={f.id}
            className="flex items-center gap-1.5 rounded-full border border-hawk-border bg-hawk-panel px-2 py-1 text-[11px] text-hawk-muted"
          >
            {f.src && (
              <img src={asset(f.src)} alt="" className="h-5 w-5 rounded-full object-cover" />
            )}
            +{f.points}
          </div>
        ))}
        <div className="flex items-center gap-1.5 rounded-full border border-red-400/40 bg-red-500/10 px-2 py-1 text-[11px] text-red-300">
          <span className="inline-flex h-5 w-5 items-center justify-center">
            <BombSprite size={20} />
          </span>
          {t('fruit.bombLabel')}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-hawk-muted">{t('fruit.swipeHint')}</p>
        <div className="flex flex-wrap items-center gap-3">
          <label className={`flex items-center gap-2 text-sm ${muted ? 'opacity-50' : 'text-hawk-cream'}`}>
            <span className="whitespace-nowrap text-xs text-hawk-muted">{t('game.volume')}</span>
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

      <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
        <div className="hawk-card px-3 py-3 text-center">
          <p className="text-xs text-hawk-muted">{t('game.roundScore')}</p>
          <p className="text-xl font-bold text-hawk-cream">{score}</p>
        </div>
        <div className="hawk-card px-3 py-3 text-center">
          <p className="text-xs text-hawk-muted">{t('game.time')}</p>
          <p className="text-xl font-bold text-hawk-blue-bright">{seconds}s</p>
        </div>
        <div className="hawk-card px-3 py-3 text-center">
          <p className="text-xs text-hawk-muted">{t('fruit.slices')}</p>
          <p className="text-xl font-bold text-hawk-cream">{slices}</p>
        </div>
      </div>

      <div
        ref={wrapRef}
        className="relative overflow-hidden rounded-2xl border border-hawk-border bg-gradient-to-b from-hawk-panel to-[#0b1220] touch-none"
      >
        <canvas
          ref={canvasRef}
          className="block w-full cursor-crosshair"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />

        {phase === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 p-6 text-center backdrop-blur-[2px]">
            <p className="mb-4 max-w-sm text-sm text-hawk-cream">{t('fruit.ready')}</p>
            <button
              type="button"
              className="hawk-btn hawk-btn-primary inline-flex items-center gap-2 px-5 py-2.5"
              onClick={() => void startRound()}
            >
              <Play className="h-4 w-4" />
              {t('fruit.start')}
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
                  className="mb-3 h-28 w-28 object-contain drop-shadow-lg"
                />
                <p className="text-lg font-bold text-hawk-gold">{t('game.keepTrying')}</p>
                <p className="mt-1 text-sm text-hawk-muted">
                  {endReason === 'bomb' ? t('fruit.bombEnded') : t('fruit.lowScore')}
                </p>
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
