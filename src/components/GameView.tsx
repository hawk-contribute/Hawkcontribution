import { useCallback, useEffect, useRef, useState } from 'react'
import { Gamepad2, Lock, Play, RotateCcw } from 'lucide-react'
import type { Session } from '../types'
import { useI18n } from '../i18n'
import { asset } from '../lib/asset'
import type { PointsAccount } from '../types'

const COLS = 3
const ROWS = 3
const CELLS = COLS * ROWS
const ROUND_MS = 30_000
const POP_BASE_MS = 900
const POP_MIN_MS = 420
const GAP_BASE_MS = 380
const GAP_MIN_MS = 160
const POINTS_PER_HIT = 10
const COMBO_BONUS = 2

type Phase = 'idle' | 'playing' | 'ended'

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
  const [score, setScore] = useState(0)
  const [hits, setHits] = useState(0)
  const [missFlash, setMissFlash] = useState<number | null>(null)
  const [hitFlash, setHitFlash] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(ROUND_MS)
  const [combo, setCombo] = useState(0)

  const phaseRef = useRef<Phase>('idle')
  const scoreRef = useRef(0)
  const hitsRef = useRef(0)
  const comboRef = useRef(0)
  const activeRef = useRef<number | null>(null)
  const timers = useRef<number[]>([])
  const roundStart = useRef(0)
  const elapsedForSpeed = useRef(0)

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current = []
  }, [])

  const stopRound = useCallback(
    (finalScore: number, finalHits: number) => {
      if (phaseRef.current !== 'playing') return
      clearTimers()
      phaseRef.current = 'ended'
      setPhase('ended')
      setActive(null)
      activeRef.current = null
      if (finalScore > 0) {
        onRoundComplete(finalScore, finalHits)
      }
    },
    [clearTimers, onRoundComplete],
  )

  const scheduleNext = useCallback(() => {
    if (phaseRef.current !== 'playing') return
    const elapsed = Date.now() - roundStart.current
    elapsedForSpeed.current = elapsed
    const progress = Math.min(1, elapsed / ROUND_MS)
    const popMs = Math.round(POP_BASE_MS - (POP_BASE_MS - POP_MIN_MS) * progress)
    const gapMs = Math.round(GAP_BASE_MS - (GAP_BASE_MS - GAP_MIN_MS) * progress)

    let hole = Math.floor(Math.random() * CELLS)
    if (activeRef.current !== null && CELLS > 1) {
      while (hole === activeRef.current) hole = Math.floor(Math.random() * CELLS)
    }

    const showId = window.setTimeout(() => {
      if (phaseRef.current !== 'playing') return
      activeRef.current = hole
      setActive(hole)

      const hideId = window.setTimeout(() => {
        if (phaseRef.current !== 'playing') return
        // Missed — eagle left
        if (activeRef.current === hole) {
          activeRef.current = null
          setActive(null)
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
    setTimeLeft(ROUND_MS)
    phaseRef.current = 'playing'
    setPhase('playing')
    roundStart.current = Date.now()
    scheduleNext()
  }, [session, onRequireAuth, clearTimers, scheduleNext])

  // Countdown ticker
  useEffect(() => {
    if (phase !== 'playing') return
    const id = window.setInterval(() => {
      const left = Math.max(0, ROUND_MS - (Date.now() - roundStart.current))
      setTimeLeft(left)
      if (left <= 0) {
        stopRound(scoreRef.current, hitsRef.current)
      }
    }, 100)
    return () => window.clearInterval(id)
  }, [phase, stopRound])

  useEffect(() => () => clearTimers(), [clearTimers])

  const whack = (index: number) => {
    if (phaseRef.current !== 'playing') return
    if (activeRef.current !== index) {
      setMissFlash(index)
      comboRef.current = 0
      setCombo(0)
      window.setTimeout(() => setMissFlash((m) => (m === index ? null : m)), 180)
      return
    }
    // Hit
    activeRef.current = null
    setActive(null)
    comboRef.current += 1
    setCombo(comboRef.current)
    const gained = POINTS_PER_HIT + Math.max(0, comboRef.current - 1) * COMBO_BONUS
    scoreRef.current += gained
    hitsRef.current += 1
    setScore(scoreRef.current)
    setHits(hitsRef.current)
    setHitFlash(index)
    window.setTimeout(() => setHitFlash((h) => (h === index ? null : h)), 200)
  }

  const seconds = (timeLeft / 1000).toFixed(1)

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
    <section>
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
          <p className="mt-2 text-xs text-hawk-muted">{t('game.rewardsHint')}</p>
        </div>
        <div className="rounded-xl border border-hawk-gold/30 bg-hawk-gold/10 px-4 py-3 text-right">
          <p className="text-xs text-hawk-muted">{t('game.totalPoints')}</p>
          <p className="text-2xl font-bold text-hawk-gold">{account.total}</p>
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
                    : 'border-hawk-border bg-hawk-panel'
              }`}
            >
              {/* burrow */}
              <div className="absolute inset-x-3 bottom-2 h-3 rounded-full bg-hawk-black/80" />
              <div className="absolute inset-x-4 bottom-3 h-2 rounded-full bg-hawk-border" />
              <img
                src={asset('brand/hawk-mark.png')}
                alt=""
                draggable={false}
                className={`pointer-events-none absolute left-1/2 w-[72%] -translate-x-1/2 rounded-full object-contain drop-shadow-lg transition-all duration-150 ${
                  isUp
                    ? 'bottom-[18%] scale-100 opacity-100'
                    : 'bottom-[-40%] scale-75 opacity-0'
                }`}
              />
              {hit && (
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-hawk-gold">
                  +{POINTS_PER_HIT}
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

      {phase === 'ended' && (
        <div className="hawk-card mx-auto mt-6 max-w-md px-5 py-4 text-center">
          <p className="text-sm text-hawk-muted">{t('game.roundOver')}</p>
          <p className="mt-1 text-2xl font-bold text-hawk-gold">
            {t('game.earned', { n: score })}
          </p>
          <p className="mt-2 text-xs text-hawk-muted">
            {t('game.totalNow', { n: account.total })}
          </p>
        </div>
      )}
    </section>
  )
}
