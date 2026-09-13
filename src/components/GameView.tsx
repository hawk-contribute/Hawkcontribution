import { useCallback, useEffect, useRef, useState } from 'react'
import { Gamepad2, Lock, Play, RotateCcw } from 'lucide-react'
import type { PointsAccount, Session } from '../types'
import { useI18n } from '../i18n'
import { asset } from '../lib/asset'

const COLS = 3
const CELLS = 9
const ROUND_MS = 30_000
const POP_BASE_MS = 950
const POP_MIN_MS = 450
const GAP_BASE_MS = 400
const GAP_MIN_MS = 180
const COMBO_BONUS = 2
const GOOD_SCORE = 80

type Phase = 'idle' | 'playing' | 'ended'
type EndReason = 'time' | 'ghost' | null

type TargetKind =
  | 'mascot'
  | 'fly'
  | 'dance'
  | 'rocket'
  | 'reward'
  | 'ghost'

interface TargetDef {
  kind: TargetKind
  src?: string
  points: number
  weight: number
  isGhost?: boolean
}

const TARGETS: TargetDef[] = [
  { kind: 'mascot', src: 'game/eagle-mascot.jpg', points: 10, weight: 28 },
  { kind: 'fly', src: 'game/hawk-fly.jpg', points: 15, weight: 22 },
  { kind: 'rocket', src: 'game/eagle-rocket.jpg', points: 20, weight: 16 },
  { kind: 'dance', src: 'game/hawk-dance.gif', points: 30, weight: 12 },
  { kind: 'reward', src: 'game/hawk-reward.jpg', points: 35, weight: 8 },
  { kind: 'ghost', points: 0, weight: 14, isGhost: true },
]

function pickTarget(): TargetDef {
  const total = TARGETS.reduce((n, t) => n + t.weight, 0)
  let r = Math.random() * total
  for (const t of TARGETS) {
    r -= t.weight
    if (r <= 0) return t
  }
  return TARGETS[0]
}

function GhostSprite() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full drop-shadow-lg" aria-hidden>
      <defs>
        <radialGradient id="gbody" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#94a3b8" />
        </radialGradient>
      </defs>
      <path
        fill="url(#gbody)"
        d="M32 6c-12 0-20 9-20 22v22l5-4 5 4 5-4 5 4 5-4 5 4 5-4 5 4V28C52 15 44 6 32 6z"
      />
      <circle cx="24" cy="28" r="4" fill="#0f172a" />
      <circle cx="40" cy="28" r="4" fill="#0f172a" />
      <ellipse cx="32" cy="38" rx="6" ry="3" fill="#64748b" opacity=".55" />
      <path
        d="M18 18c4-6 10-8 14-4"
        fill="none"
        stroke="#e2e8f0"
        strokeWidth="2"
        strokeLinecap="round"
        opacity=".7"
      />
    </svg>
  )
}

interface GameViewProps {
  session: Session | null
  account: PointsAccount
  onRequireAuth: () => void
  onRoundComplete: (score: number, hits: number) => void
}

export function GameView({
  session,
  account,
  onRequireAuth,
  onRoundComplete,
}: GameViewProps) {
  const { t } = useI18n()
  const [phase, setPhase] = useState<Phase>('idle')
  const [active, setActive] = useState<number | null>(null)
  const [activeTarget, setActiveTarget] = useState<TargetDef | null>(null)
  const [score, setScore] = useState(0)
  const [hits, setHits] = useState(0)
  const [missFlash, setMissFlash] = useState<number | null>(null)
  const [hitFlash, setHitFlash] = useState<number | null>(null)
  const [hitPoints, setHitPoints] = useState(0)
  const [timeLeft, setTimeLeft] = useState(ROUND_MS)
  const [combo, setCombo] = useState(0)
  const [endReason, setEndReason] = useState<EndReason>(null)
  const [showKeepTrying, setShowKeepTrying] = useState(false)

  const phaseRef = useRef<Phase>('idle')
  const scoreRef = useRef(0)
  const hitsRef = useRef(0)
  const comboRef = useRef(0)
  const activeRef = useRef<number | null>(null)
  const targetRef = useRef<TargetDef | null>(null)
  const timers = useRef<number[]>([])
  const roundStart = useRef(0)

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current = []
  }, [])

  const stopRound = useCallback(
    (finalScore: number, finalHits: number, reason: EndReason) => {
      if (phaseRef.current !== 'playing') return
      clearTimers()
      phaseRef.current = 'ended'
      setPhase('ended')
      setActive(null)
      setActiveTarget(null)
      activeRef.current = null
      targetRef.current = null
      setEndReason(reason)
      const keepTrying =
        reason === 'ghost' || (reason === 'time' && finalScore < GOOD_SCORE)
      setShowKeepTrying(keepTrying)
      if (finalScore > 0) {
        onRoundComplete(finalScore, finalHits)
      }
    },
    [clearTimers, onRoundComplete],
  )

  const scheduleNext = useCallback(() => {
    if (phaseRef.current !== 'playing') return
    const elapsed = Date.now() - roundStart.current
    const progress = Math.min(1, elapsed / ROUND_MS)
    const popMs = Math.round(POP_BASE_MS - (POP_BASE_MS - POP_MIN_MS) * progress)
    const gapMs = Math.round(GAP_BASE_MS - (GAP_BASE_MS - GAP_MIN_MS) * progress)

    let hole = Math.floor(Math.random() * CELLS)
    if (activeRef.current !== null && CELLS > 1) {
      while (hole === activeRef.current) hole = Math.floor(Math.random() * CELLS)
    }
    const target = pickTarget()

    const showId = window.setTimeout(() => {
      if (phaseRef.current !== 'playing') return
      activeRef.current = hole
      targetRef.current = target
      setActive(hole)
      setActiveTarget(target)

      const hideId = window.setTimeout(() => {
        if (phaseRef.current !== 'playing') return
        if (activeRef.current === hole) {
          activeRef.current = null
          targetRef.current = null
          setActive(null)
          setActiveTarget(null)
          comboRef.current = 0
          setCombo(0)
        }
        const nextId = window.setTimeout(() => scheduleNext(), gapMs)
        timers.current.push(nextId)
      }, popMs)
      timers.current.push(hideId)
    }, gapMs)
    timers.current.push(showId)
  }, [])

  const startRound = useCallback(() => {
    if (!session) {
      onRequireAuth()
      return
    }
    clearTimers()
    scoreRef.current = 0
    hitsRef.current = 0
    comboRef.current = 0
    setScore(0)
    setHits(0)
    setCombo(0)
    setMissFlash(null)
    setHitFlash(null)
    setHitPoints(0)
    setTimeLeft(ROUND_MS)
    setEndReason(null)
    setShowKeepTrying(false)
    phaseRef.current = 'playing'
    setPhase('playing')
    roundStart.current = Date.now()
    scheduleNext()
  }, [session, onRequireAuth, clearTimers, scheduleNext])

  useEffect(() => {
    if (phase !== 'playing') return
    const id = window.setInterval(() => {
      const left = Math.max(0, ROUND_MS - (Date.now() - roundStart.current))
      setTimeLeft(left)
      if (left <= 0) {
        stopRound(scoreRef.current, hitsRef.current, 'time')
      }
    }, 100)
    return () => window.clearInterval(id)
  }, [phase, stopRound])

  useEffect(() => () => clearTimers(), [clearTimers])

  const whack = (index: number) => {
    if (phaseRef.current !== 'playing') return
    if (activeRef.current !== index || !targetRef.current) {
      setMissFlash(index)
      comboRef.current = 0
      setCombo(0)
      window.setTimeout(() => setMissFlash((m) => (m === index ? null : m)), 180)
      return
    }

    const target = targetRef.current
    activeRef.current = null
    targetRef.current = null
    setActive(null)
    setActiveTarget(null)

    if (target.isGhost) {
      // Keep points earned so far; end immediately — no points for ghost tap
      stopRound(scoreRef.current, hitsRef.current, 'ghost')
      return
    }

    comboRef.current += 1
    setCombo(comboRef.current)
    const gained =
      target.points + Math.max(0, comboRef.current - 1) * COMBO_BONUS
    scoreRef.current += gained
    hitsRef.current += 1
    setScore(scoreRef.current)
    setHits(hitsRef.current)
    setHitPoints(gained)
    setHitFlash(index)
    window.setTimeout(() => setHitFlash((h) => (h === index ? null : h)), 220)
  }

  const seconds = (timeLeft / 1000).toFixed(1)
  const goodRun = score >= GOOD_SCORE && endReason !== 'ghost'

  if (!session) {
    return (
      <section className="hawk-card mx-auto max-w-lg px-6 py-14 text-center">
        <Lock className="mx-auto mb-3 h-10 w-10 text-hawk-gold" />
        <h1 className="text-2xl font-bold text-hawk-cream">{t('game.title')}</h1>
        <p className="mt-2 text-sm text-hawk-muted">{t('game.locked')}</p>
        <button
          type="button"
          onClick={onRequireAuth}
          className="hawk-btn hawk-btn-primary mt-6 px-5 py-2.5 text-sm"
        >
          {t('auth.signIn')}
        </button>
      </section>
    )
  }

  return (
    <section className="relative">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-hawk-gold">
            <Gamepad2 className="h-3.5 w-3.5" />
            {t('game.badge')}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-hawk-cream sm:text-3xl">
            {t('game.title')}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-hawk-muted sm:text-base">
            {t('game.subtitle')}
          </p>
          <p className="mt-2 text-xs text-hawk-muted">{t('game.ghostHint')}</p>
          <p className="mt-1 text-xs text-hawk-muted">{t('game.rewardsHint')}</p>
        </div>
        <div className="rounded-xl border border-hawk-gold/30 bg-hawk-gold/10 px-4 py-3 text-right">
          <p className="text-xs text-hawk-muted">{t('game.totalPoints')}</p>
          <p className="text-2xl font-bold text-hawk-gold">{account.total}</p>
        </div>
      </div>

      {/* Target legend */}
      <div className="mb-4 flex flex-wrap gap-2">
        {TARGETS.filter((x) => !x.isGhost).map((tg) => (
          <div
            key={tg.kind}
            className="flex items-center gap-1.5 rounded-full border border-hawk-border bg-hawk-panel px-2 py-1 text-[11px] text-hawk-muted"
          >
            <img
              src={asset(tg.src!)}
              alt=""
              className="h-5 w-5 rounded-full object-cover"
            />
            +{tg.points}
          </div>
        ))}
        <div className="flex items-center gap-1.5 rounded-full border border-red-400/40 bg-red-500/10 px-2 py-1 text-[11px] text-red-300">
          <span className="inline-block h-5 w-5">
            <GhostSprite />
          </span>
          {t('game.ghostLabel')}
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
          <p className="text-xs text-hawk-muted">{t('game.hits')}</p>
          <p className="text-xl font-bold text-hawk-cream">
            {hits}
            {combo > 1 && (
              <span className="ml-1 text-sm text-hawk-gold">x{combo}</span>
            )}
          </p>
        </div>
      </div>

      <div
        className="mx-auto grid max-w-md gap-3 sm:gap-4"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: CELLS }, (_, i) => {
          const isUp = active === i
          const missed = missFlash === i
          const hit = hitFlash === i
          const shown = isUp ? activeTarget : null
          return (
            <button
              key={i}
              type="button"
              aria-label={t('game.hole')}
              onPointerDown={(e) => {
                e.preventDefault()
                whack(i)
              }}
              className={`relative aspect-square select-none overflow-hidden rounded-2xl border transition ${
                missed
                  ? 'border-red-400/60 bg-red-500/10'
                  : hit
                    ? 'border-hawk-gold bg-hawk-gold/20'
                    : shown?.isGhost
                      ? 'border-violet-400/50 bg-violet-500/10'
                      : 'border-hawk-border bg-hawk-panel'
              }`}
            >
              <div className="absolute inset-x-3 bottom-2 h-3 rounded-full bg-hawk-black/80" />
              <div className="absolute inset-x-4 bottom-3 h-2 rounded-full bg-hawk-border" />
              <div
                className={`pointer-events-none absolute left-1/2 w-[78%] -translate-x-1/2 transition-all duration-150 ${
                  isUp
                    ? 'bottom-[14%] scale-100 opacity-100'
                    : 'bottom-[-45%] scale-75 opacity-0'
                }`}
              >
                {shown?.isGhost ? (
                  <div className="aspect-square p-1">
                    <GhostSprite />
                  </div>
                ) : shown?.src ? (
                  <img
                    src={asset(shown.src)}
                    alt=""
                    draggable={false}
                    className="aspect-square rounded-xl object-cover shadow-lg"
                  />
                ) : null}
              </div>
              {hit && (
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-hawk-gold">
                  +{hitPoints}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {phase !== 'playing' && (
          <button
            type="button"
            onClick={startRound}
            className="hawk-btn hawk-btn-primary px-5 py-2.5 text-sm"
          >
            {phase === 'ended' ? (
              <>
                <RotateCcw className="h-4 w-4" />
                {t('game.playAgain')}
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                {t('game.start')}
              </>
            )}
          </button>
        )}
        {phase === 'playing' && (
          <p className="text-sm text-hawk-muted">{t('game.playingHint')}</p>
        )}
      </div>

      {phase === 'ended' && !showKeepTrying && (
        <div className="hawk-card mx-auto mt-6 max-w-md overflow-hidden text-center">
          {goodRun && (
            <img
              src={asset('game/hawk-reward.jpg')}
              alt=""
              className="h-36 w-full object-cover"
            />
          )}
          <div className="px-5 py-4">
            <p className="text-sm text-hawk-muted">{t('game.roundOver')}</p>
            <p className="mt-1 text-2xl font-bold text-hawk-gold">
              {t('game.earned', { n: score })}
            </p>
            <p className="mt-2 text-xs text-hawk-muted">
              {t('game.totalNow', { n: account.total })}
            </p>
          </div>
        </div>
      )}

      {/* 再接再厲 overlay — required on ghost; also low-score timeout */}
      {showKeepTrying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="hawk-card relative w-full max-w-sm overflow-hidden text-center shadow-2xl">
            <img
              src={asset('game/keep-trying.png')}
              alt=""
              className="mx-auto mt-4 h-36 w-36 object-contain"
            />
            <div className="px-5 pb-6 pt-3">
              <p className="text-2xl font-black tracking-wide text-hawk-gold sm:text-3xl">
                {t('game.keepTrying')}
              </p>
              <p className="mt-2 text-sm text-hawk-muted">
                {endReason === 'ghost'
                  ? t('game.ghostEnded')
                  : t('game.roundOver')}
              </p>
              <p className="mt-3 text-lg font-bold text-hawk-cream">
                {t('game.earned', { n: score })}
              </p>
              <p className="mt-1 text-xs text-hawk-muted">
                {t('game.totalNow', { n: account.total })}
              </p>
              <button
                type="button"
                className="hawk-btn hawk-btn-primary mt-5 w-full px-4 py-2.5"
                onClick={() => {
                  setShowKeepTrying(false)
                  startRound()
                }}
              >
                <RotateCcw className="h-4 w-4" />
                {t('game.playAgain')}
              </button>
              <button
                type="button"
                className="hawk-btn hawk-btn-ghost mt-2 w-full px-4 py-2 text-sm"
                onClick={() => setShowKeepTrying(false)}
              >
                {t('auth.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
