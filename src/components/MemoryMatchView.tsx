import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Grid2x2, Lock, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import type { PointsAccount, Session } from '../types'
import { useI18n } from '../i18n'
import { asset } from '../lib/asset'
import { gameAudio } from '../lib/gameAudio'

/** Fixed completion award for clearing all 6 pairs. */
export const MEMORY_COMPLETE_POINTS = 600

const PAIR_COUNT = 6
const FLIP_BACK_MS = 650
const COLS = 4

const PAIR_IMAGES = [
  'game/memory/m1.jpeg',
  'game/memory/m2.jpeg',
  'game/memory/m3.png',
  'game/memory/m4.jpeg',
  'game/memory/m5.jpeg',
  'game/memory/m6.jpeg',
] as const

type Phase = 'idle' | 'playing' | 'ended'

interface Card {
  id: number
  pairId: number
  src: string
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildDeck(): Card[] {
  const cards: Card[] = []
  PAIR_IMAGES.forEach((src, pairId) => {
    cards.push({ id: pairId * 2, pairId, src })
    cards.push({ id: pairId * 2 + 1, pairId, src })
  })
  return shuffle(cards)
}

interface MemoryMatchViewProps {
  session: Session | null
  account: PointsAccount
  onRequireAuth: () => void
  onRoundComplete: (score: number, hits: number) => void
  onBack: () => void
}

export function MemoryMatchView({
  session,
  account,
  onRequireAuth,
  onRoundComplete,
  onBack,
}: MemoryMatchViewProps) {
  const { t } = useI18n()
  const [phase, setPhase] = useState<Phase>('idle')
  const [deck, setDeck] = useState<Card[]>(() => buildDeck())
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<Set<number>>(() => new Set())
  const [lockBoard, setLockBoard] = useState(false)
  const [moves, setMoves] = useState(0)
  const [pairsFound, setPairsFound] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [muted, setMuted] = useState(() => gameAudio.isMuted())
  const [volume, setVolume] = useState(() => gameAudio.getVolume())

  const phaseRef = useRef<Phase>('idle')
  const matchedRef = useRef<Set<number>>(new Set())
  const flippedRef = useRef<number[]>([])
  const reported = useRef(false)
  const roundStart = useRef(0)
  const flipTimer = useRef<number | null>(null)

  const clearFlipTimer = useCallback(() => {
    if (flipTimer.current != null) {
      window.clearTimeout(flipTimer.current)
      flipTimer.current = null
    }
  }, [])

  const finishRound = useCallback(() => {
    if (phaseRef.current !== 'playing') return
    phaseRef.current = 'ended'
    setPhase('ended')
    setLockBoard(true)
    gameAudio.stopBgm()
    gameAudio.playEnd(false)
    if (!reported.current) {
      reported.current = true
      onRoundComplete(MEMORY_COMPLETE_POINTS, PAIR_COUNT)
    }
  }, [onRoundComplete])

  const startRound = useCallback(() => {
    if (!session) {
      onRequireAuth()
      return
    }
    clearFlipTimer()
    const next = buildDeck()
    setDeck(next)
    setFlipped([])
    flippedRef.current = []
    matchedRef.current = new Set()
    setMatched(new Set())
    setLockBoard(false)
    setMoves(0)
    setPairsFound(0)
    setElapsedMs(0)
    reported.current = false
    roundStart.current = Date.now()
    phaseRef.current = 'playing'
    setPhase('playing')
    void gameAudio.unlock().then(() => {
      gameAudio.playStart()
      gameAudio.startBgm()
    })
  }, [session, onRequireAuth, clearFlipTimer])

  useEffect(() => {
    if (phase !== 'playing') return
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - roundStart.current)
    }, 200)
    return () => window.clearInterval(id)
  }, [phase])

  useEffect(
    () => () => {
      clearFlipTimer()
      gameAudio.stopBgm()
    },
    [clearFlipTimer],
  )

  const onCardTap = (index: number) => {
    if (phaseRef.current !== 'playing' || lockBoard) return
    if (matchedRef.current.has(index)) return
    if (flippedRef.current.includes(index)) return
    if (flippedRef.current.length >= 2) return

    const nextFlipped = [...flippedRef.current, index]
    flippedRef.current = nextFlipped
    setFlipped(nextFlipped)
    gameAudio.playHit(10)

    if (nextFlipped.length < 2) return

    setMoves((m) => m + 1)
    const [a, b] = nextFlipped
    const cardA = deck[a]
    const cardB = deck[b]
    if (cardA.pairId === cardB.pairId) {
      const nextMatched = new Set(matchedRef.current)
      nextMatched.add(a)
      nextMatched.add(b)
      matchedRef.current = nextMatched
      setMatched(nextMatched)
      flippedRef.current = []
      setFlipped([])
      const found = nextMatched.size / 2
      setPairsFound(found)
      gameAudio.playHit(MEMORY_COMPLETE_POINTS / PAIR_COUNT)
      if (found >= PAIR_COUNT) {
        finishRound()
      }
    } else {
      setLockBoard(true)
      gameAudio.playMiss()
      clearFlipTimer()
      flipTimer.current = window.setTimeout(() => {
        flippedRef.current = []
        setFlipped([])
        setLockBoard(false)
        flipTimer.current = null
      }, FLIP_BACK_MS)
    }
  }

  const seconds = useMemo(() => (elapsedMs / 1000).toFixed(1), [elapsedMs])

  if (!session) {
    return (
      <section className="hawk-card mx-auto max-w-lg px-6 py-14 text-center">
        <Lock className="mx-auto mb-3 h-10 w-10 text-hawk-gold" />
        <h1 className="text-2xl font-bold text-hawk-cream">{t('memory.title')}</h1>
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
          clearFlipTimer()
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
            <Grid2x2 className="h-3.5 w-3.5" />
            {t('memory.badge')}
          </p>
          <h1 className="text-2xl font-bold text-hawk-cream sm:text-3xl">{t('memory.title')}</h1>
          <p className="mt-2 max-w-xl text-sm text-hawk-muted">{t('memory.subtitle')}</p>
        </div>
        <div className="rounded-xl border border-hawk-gold/30 bg-hawk-gold/10 px-4 py-3 text-right">
          <p className="text-xs text-hawk-muted">{t('game.totalPoints')}</p>
          <p className="text-2xl font-bold text-hawk-gold">{account.total}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-[11px]">
        <span className="rounded-full border border-hawk-gold/40 bg-hawk-gold/10 px-2 py-1 text-hawk-gold">
          {t('memory.rewardHint')}
        </span>
        <span className="rounded-full border border-hawk-border bg-hawk-panel px-2 py-1 text-hawk-muted">
          {t('memory.tapHint')}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-hawk-muted">{t('memory.pairHint')}</p>
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
          <p className="text-xs text-hawk-muted">{t('memory.pairs')}</p>
          <p className="text-xl font-bold text-hawk-cream">
            {pairsFound}/{PAIR_COUNT}
          </p>
        </div>
        <div className="hawk-card px-3 py-3 text-center">
          <p className="text-xs text-hawk-muted">{t('memory.moves')}</p>
          <p className="text-xl font-bold text-hawk-blue-bright">{moves}</p>
        </div>
        <div className="hawk-card px-3 py-3 text-center">
          <p className="text-xs text-hawk-muted">{t('game.time')}</p>
          <p className="text-xl font-bold text-hawk-cream">{phase === 'idle' ? '—' : `${seconds}s`}</p>
        </div>
      </div>

      <div className="relative mx-auto max-w-lg">
        <div
          className="grid gap-2 sm:gap-3"
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        >
          {deck.map((card, index) => {
            const isOpen =
              matched.has(index) || flipped.includes(index) || phase === 'ended'
            const isMatched = matched.has(index)
            return (
              <button
                key={card.id}
                type="button"
                aria-label={t('memory.card')}
                disabled={phase !== 'playing' || lockBoard || isMatched}
                onClick={() => onCardTap(index)}
                className={`relative aspect-square select-none overflow-hidden rounded-xl border transition [perspective:800px] ${
                  isMatched
                    ? 'border-hawk-gold bg-hawk-gold/15'
                    : isOpen
                      ? 'border-hawk-gold/60 bg-hawk-panel'
                      : 'border-hawk-border bg-hawk-navy/80 hover:border-hawk-gold/40'
                }`}
              >
                <div
                  className={`absolute inset-0 transition-transform duration-300 [transform-style:preserve-3d] ${
                    isOpen ? '[transform:rotateY(180deg)]' : ''
                  }`}
                >
                  {/* back */}
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-hawk-navy to-hawk-black [backface-visibility:hidden]">
                    <span className="text-2xl font-black text-hawk-gold/80 sm:text-3xl">?</span>
                  </div>
                  {/* front */}
                  <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <img
                      src={asset(card.src)}
                      alt=""
                      draggable={false}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {phase === 'idle' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-black/50 p-6 text-center backdrop-blur-[2px]">
            <p className="mb-4 max-w-sm text-sm text-hawk-cream">{t('memory.ready')}</p>
            <button
              type="button"
              className="hawk-btn hawk-btn-primary inline-flex items-center gap-2 px-5 py-2.5"
              onClick={() => void startRound()}
            >
              <Play className="h-4 w-4" />
              {t('memory.start')}
            </button>
          </div>
        )}

        {phase === 'ended' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-black/60 p-6 text-center backdrop-blur-[2px]">
            <img
              src={asset('game/hawk-reward.jpg')}
              alt=""
              className="mb-3 h-24 w-full max-w-xs rounded-xl object-cover"
            />
            <p className="text-lg font-bold text-hawk-cream">{t('game.roundOver')}</p>
            <p className="mt-1 text-sm text-hawk-gold">
              {t('game.earned', { n: MEMORY_COMPLETE_POINTS })}
            </p>
            <p className="mt-1 text-xs text-hawk-muted">
              {t('memory.cleared', { moves, time: seconds })}
            </p>
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
                clearFlipTimer()
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
