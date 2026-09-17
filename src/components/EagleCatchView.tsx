import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Bird, Lock, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import type { PointsAccount, Session } from '../types'
import { useI18n } from '../i18n'
import { asset } from '../lib/asset'
import { gameAudio } from '../lib/gameAudio'
import { GameHubLeaveButton } from './GameHubLeaveButton'

const ROUND_MS = 60_000
const CHICK_POINTS = 12
const GOLD_CHICK_POINTS = 28
const HEN_PENALTY = 15
const STUN_MS = 900
const GOOD_SCORE = 120
const CHICK_COUNT = 6
/** Mother hen pace (~1.6× prior). Tune these to change how brisk she feels. */
const HEN_SPAWN_SPEED = 2.1
const HEN_WANDER_SPEED = 2.2
const HEN_CHASE_ACCEL = 0.13
const HEN_MAX_SPEED = 3.2

type Phase = 'idle' | 'playing' | 'ended'

interface Entity {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  kind: 'chick' | 'gold' | 'hen'
  wobble: number
}

interface EagleCatchViewProps {
  session: Session | null
  account: PointsAccount
  onRequireAuth: () => void
  onRoundComplete: (score: number, hits: number) => void
  onBack: () => void
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

function randVel(speed: number) {
  const a = Math.random() * Math.PI * 2
  return { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed }
}

export function EagleCatchView({
  session,
  account,
  onRequireAuth,
  onRoundComplete,
  onBack,
}: EagleCatchViewProps) {
  const { t } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [score, setScore] = useState(0)
  const [catches, setCatches] = useState(0)
  const [timeLeft, setTimeLeft] = useState(ROUND_MS)
  const [showKeepTrying, setShowKeepTrying] = useState(false)
  const [muted, setMuted] = useState(() => gameAudio.isMuted())
  const [volume, setVolume] = useState(() => gameAudio.getVolume())
  const [stunnedUi, setStunnedUi] = useState(false)

  const phaseRef = useRef<Phase>('idle')
  const scoreRef = useRef(0)
  const catchesRef = useRef(0)
  const eagleRef = useRef({ x: 180, y: 240, r: 28 })
  const pointerRef = useRef<{ x: number; y: number } | null>(null)
  const entitiesRef = useRef<Entity[]>([])
  const stunUntilRef = useRef(0)
  const stunUiRef = useRef(false)
  const roundStart = useRef(0)
  const reported = useRef(false)
  const rafRef = useRef(0)
  const sizeRef = useRef({ w: 360, h: 480 })
  const eagleImg = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    const img = new Image()
    img.src = asset('game/eagle-mascot.jpg')
    eagleImg.current = img
  }, [])

  const clearRaf = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
  }, [])

  const spawnEntities = useCallback((w: number, h: number) => {
    const list: Entity[] = []
    for (let i = 0; i < CHICK_COUNT; i++) {
      const gold = Math.random() < 0.18
      const speed = gold ? 2.4 : 1.6 + Math.random() * 1.2
      const v = randVel(speed)
      list.push({
        x: 30 + Math.random() * (w - 60),
        y: 30 + Math.random() * (h - 60),
        vx: v.vx,
        vy: v.vy,
        r: gold ? 16 : 14,
        kind: gold ? 'gold' : 'chick',
        wobble: Math.random() * Math.PI * 2,
      })
    }
    const hv = randVel(HEN_SPAWN_SPEED)
    list.push({
      x: w * 0.5,
      y: h * 0.35,
      vx: hv.vx,
      vy: hv.vy,
      r: 22,
      kind: 'hen',
      wobble: 0,
    })
    entitiesRef.current = list
  }, [])

  const stopRound = useCallback(
    (finalScore: number, finalCatches: number) => {
      if (phaseRef.current !== 'playing') return
      phaseRef.current = 'ended'
      setPhase('ended')
      clearRaf()
      gameAudio.stopBgm()
      const keepTrying = finalScore < GOOD_SCORE
      setShowKeepTrying(keepTrying)
      gameAudio.playEnd(keepTrying)
      if (!reported.current && finalScore > 0) {
        reported.current = true
        onRoundComplete(finalScore, finalCatches)
      }
    },
    [clearRaf, onRoundComplete],
  )

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { w, h } = sizeRef.current
    ctx.clearRect(0, 0, w, h)

    // field
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#0f172a')
    g.addColorStop(1, '#14532d')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(234,179,8,0.06)'
    for (let i = 0; i < 8; i++) {
      ctx.beginPath()
      ctx.ellipse(
        (i * 73) % w,
        h * 0.55 + ((i * 41) % 80),
        40,
        12,
        0,
        0,
        Math.PI * 2,
      )
      ctx.fill()
    }

    const stunned = performance.now() < stunUntilRef.current

    for (const e of entitiesRef.current) {
      ctx.save()
      ctx.translate(e.x, e.y)
      ctx.rotate(Math.sin(e.wobble) * 0.2)
      if (e.kind === 'hen') {
        // mother hen
        ctx.fillStyle = '#f97316'
        ctx.beginPath()
        ctx.ellipse(0, 2, e.r, e.r * 0.85, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ea580c'
        ctx.beginPath()
        ctx.arc(-e.r * 0.55, -e.r * 0.2, e.r * 0.55, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#dc2626'
        ctx.beginPath()
        ctx.moveTo(-e.r * 0.9, -e.r * 0.15)
        ctx.lineTo(-e.r * 1.25, 0)
        ctx.lineTo(-e.r * 0.9, e.r * 0.15)
        ctx.fill()
        ctx.fillStyle = '#0f172a'
        ctx.beginPath()
        ctx.arc(-e.r * 0.7, -e.r * 0.35, 2.2, 0, Math.PI * 2)
        ctx.fill()
      } else {
        // chick
        ctx.fillStyle = e.kind === 'gold' ? '#fbbf24' : '#fde047'
        ctx.beginPath()
        ctx.arc(0, 0, e.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#f59e0b'
        ctx.beginPath()
        ctx.moveTo(e.r * 0.55, 0)
        ctx.lineTo(e.r * 1.15, -3)
        ctx.lineTo(e.r * 0.55, 3)
        ctx.fill()
        ctx.fillStyle = '#0f172a'
        ctx.beginPath()
        ctx.arc(e.r * 0.15, -e.r * 0.25, 2, 0, Math.PI * 2)
        ctx.fill()
        if (e.kind === 'gold') {
          ctx.strokeStyle = '#f59e0b'
          ctx.lineWidth = 2
          ctx.stroke()
        }
      }
      ctx.restore()
    }

    // eagle
    const eg = eagleRef.current
    ctx.save()
    ctx.translate(eg.x, eg.y)
    if (stunned) {
      ctx.globalAlpha = 0.55
      ctx.filter = 'grayscale(0.4)'
    }
    const img = eagleImg.current
    const r = eg.r
    if (img && img.complete) {
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(img, -r, -r, r * 2, r * 2)
    } else {
      ctx.fillStyle = '#ca8a04'
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()

    if (stunned) {
      ctx.fillStyle = 'rgba(239,68,68,0.18)'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#fca5a5'
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(t('catch.stunned'), w / 2, 28)
    }
  }, [t])

  const tick = useCallback(() => {
    if (phaseRef.current !== 'playing') return
    const { w, h } = sizeRef.current
    const now = performance.now()
    const left = Math.max(0, ROUND_MS - (now - roundStart.current))
    setTimeLeft(left)
    if (left <= 0) {
      stopRound(scoreRef.current, catchesRef.current)
      draw()
      return
    }

    const stunned = now < stunUntilRef.current
    if (stunUiRef.current !== stunned) {
      stunUiRef.current = stunned
      setStunnedUi(stunned)
    }
    const eg = eagleRef.current
    if (!stunned && pointerRef.current) {
      const tx = pointerRef.current.x
      const ty = pointerRef.current.y
      eg.x += (tx - eg.x) * 0.28
      eg.y += (ty - eg.y) * 0.28
    }
    eg.x = clamp(eg.x, eg.r, w - eg.r)
    eg.y = clamp(eg.y, eg.r, h - eg.r)

    for (const e of entitiesRef.current) {
      e.wobble += 0.12
      // wander: occasional direction change
      if (Math.random() < 0.02) {
        const speed =
          e.kind === 'hen' ? HEN_WANDER_SPEED : e.kind === 'gold' ? 2.6 : 1.8 + Math.random()
        const v = randVel(speed)
        e.vx = v.vx
        e.vy = v.vy
      }
      // flee eagle a bit
      if (e.kind !== 'hen') {
        const dx = e.x - eg.x
        const dy = e.y - eg.y
        const d = Math.hypot(dx, dy) || 1
        if (d < 110) {
          e.vx += (dx / d) * 0.35
          e.vy += (dy / d) * 0.35
        }
      } else {
        // hen slightly chases eagle
        const dx = eg.x - e.x
        const dy = eg.y - e.y
        const d = Math.hypot(dx, dy) || 1
        e.vx += (dx / d) * HEN_CHASE_ACCEL
        e.vy += (dy / d) * HEN_CHASE_ACCEL
      }
      const maxSp = e.kind === 'gold' ? 3.2 : e.kind === 'hen' ? HEN_MAX_SPEED : 2.6
      const sp = Math.hypot(e.vx, e.vy) || 1
      if (sp > maxSp) {
        e.vx = (e.vx / sp) * maxSp
        e.vy = (e.vy / sp) * maxSp
      }
      e.x += e.vx
      e.y += e.vy
      if (e.x < e.r || e.x > w - e.r) e.vx *= -1
      if (e.y < e.r || e.y > h - e.r) e.vy *= -1
      e.x = clamp(e.x, e.r, w - e.r)
      e.y = clamp(e.y, e.r, h - e.r)

      const dist = Math.hypot(e.x - eg.x, e.y - eg.y)
      if (dist < e.r + eg.r * 0.85) {
        if (e.kind === 'hen') {
          if (!stunned) {
            stunUntilRef.current = now + STUN_MS
            scoreRef.current = Math.max(0, scoreRef.current - HEN_PENALTY)
            setScore(scoreRef.current)
            gameAudio.playStun()
            // bounce hen away
            const dx = e.x - eg.x
            const dy = e.y - eg.y
            const d = Math.hypot(dx, dy) || 1
            e.vx = (dx / d) * 3
            e.vy = (dy / d) * 3
          }
        } else {
          const pts = e.kind === 'gold' ? GOLD_CHICK_POINTS : CHICK_POINTS
          scoreRef.current += pts
          catchesRef.current += 1
          setScore(scoreRef.current)
          setCatches(catchesRef.current)
          gameAudio.playCatch(pts)
          // respawn chick elsewhere
          const gold = Math.random() < 0.2
          const speed = gold ? 2.5 : 1.7 + Math.random()
          const v = randVel(speed)
          e.kind = gold ? 'gold' : 'chick'
          e.r = gold ? 16 : 14
          e.x = 30 + Math.random() * (w - 60)
          e.y = 30 + Math.random() * (h - 60)
          e.vx = v.vx
          e.vy = v.vy
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
    const h = Math.max(380, Math.min(560, Math.floor(w * 1.2)))
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

  useEffect(() => () => clearRaf(), [clearRaf])

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
    pointerRef.current = ptrPos(e)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== 'playing') return
    pointerRef.current = ptrPos(e)
  }
  const onPointerUp = () => {
    /* keep last pointer so eagle eases toward it; clear optional */
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
    catchesRef.current = 0
    setScore(0)
    setCatches(0)
    setTimeLeft(ROUND_MS)
    setShowKeepTrying(false)
    setStunnedUi(false)
    stunUntilRef.current = 0
    resize()
    const { w, h } = sizeRef.current
    eagleRef.current = { x: w / 2, y: h * 0.7, r: 28 }
    pointerRef.current = { x: w / 2, y: h * 0.7 }
    spawnEntities(w, h)
    phaseRef.current = 'playing'
    setPhase('playing')
    roundStart.current = performance.now()
    gameAudio.playStart()
    gameAudio.startBgm()
    rafRef.current = requestAnimationFrame(tick)
  }

  if (!session) {
    return (
      <section className="hawk-card mx-auto max-w-lg px-6 py-14 text-center">
        <Lock className="mx-auto mb-3 h-10 w-10 text-hawk-gold" />
        <h1 className="text-2xl font-bold text-hawk-cream">{t('catch.title')}</h1>
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

  const seconds = Math.ceil(timeLeft / 1000)

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
            <Bird className="h-3.5 w-3.5" />
            {t('catch.badge')}
          </p>
          <h1 className="text-2xl font-bold text-hawk-cream sm:text-3xl">{t('catch.title')}</h1>
          <p className="mt-2 max-w-xl text-sm text-hawk-muted">{t('catch.subtitle')}</p>
          <p className="mt-1 text-xs text-hawk-muted">{t('catch.henHint')}</p>
        </div>
        <div className="rounded-xl border border-hawk-gold/30 bg-hawk-gold/10 px-4 py-3 text-right">
          <p className="text-xs text-hawk-muted">{t('game.totalPoints')}</p>
          <p className="text-2xl font-bold text-hawk-gold">{account.total}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-[11px]">
        <span className="rounded-full border border-hawk-border bg-hawk-panel px-2 py-1 text-hawk-muted">
          🐥 +{CHICK_POINTS}
        </span>
        <span className="rounded-full border border-hawk-gold/40 bg-hawk-gold/10 px-2 py-1 text-hawk-gold">
          ✨ +{GOLD_CHICK_POINTS}
        </span>
        <span className="rounded-full border border-red-400/40 bg-red-500/10 px-2 py-1 text-red-300">
          🐔 −{HEN_PENALTY}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-hawk-muted">{t('catch.controlHint')}</p>
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
          <p className="text-xs text-hawk-muted">{t('catch.catches')}</p>
          <p className="text-xl font-bold text-hawk-cream">{catches}</p>
        </div>
      </div>

      <div
        ref={wrapRef}
        className="relative overflow-hidden rounded-2xl border border-hawk-border touch-none"
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
            <p className="mb-4 max-w-sm text-sm text-hawk-cream">{t('catch.ready')}</p>
            <button
              type="button"
              className="hawk-btn hawk-btn-primary inline-flex items-center gap-2 px-5 py-2.5"
              onClick={() => void startRound()}
            >
              <Play className="h-4 w-4" />
              {t('catch.start')}
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
                <p className="mt-1 text-sm text-hawk-muted">{t('catch.lowScore')}</p>
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

      {stunnedUi && phase === 'playing' && (
        <p className="mt-2 text-center text-xs text-red-300">{t('catch.stunned')}</p>
      )}
    </section>
  )
}
