import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrowLeft, Baby, Heart, Laugh, Lock, Moon, Sparkles, Volume2, VolumeX, Zap } from 'lucide-react'
import type { PointsAccount, Session } from '../types'
import { useI18n } from '../i18n'
import { gameAudio } from '../lib/gameAudio'
import {
  BABY_BATCH_FLUSH_AT,
  BABY_COMBO_WINDOW_MS,
  BABY_REACTION_MS,
  BABY_TOUCH_COOLDOWN_MS,
  BABY_TOUCH_SESSION_CAP,
  clampSessionAward,
  comboProgress,
  pointsForAction,
  poseForZone,
  pruneCheekTaps,
  reactionCopyKey,
  sfxIntensity,
  zoneLabelKey,
  type BabyMode,
  type BabyPose,
  type BabyZone,
  type CheekTap,
} from '../lib/babyTouch'
import { BabyEagleSprite, BabySpeechBubble, BedroomBackdrop } from './BabyTouchArt'

interface BabyTouchViewProps {
  session: Session | null
  account: PointsAccount
  onRequireAuth: () => void
  onRoundComplete: (score: number, hits: number) => void
  onBack: () => void
}

const ZONE_ANCHORS: { id: BabyZone; x: number; y: number; r: number }[] = [
  { id: 'hair', x: 200, y: 88, r: 26 },
  { id: 'cheekL', x: 154, y: 168, r: 46 },
  { id: 'cheekR', x: 246, y: 168, r: 46 },
  { id: 'palm', x: 108, y: 224, r: 36 },
  { id: 'belly', x: 200, y: 230, r: 32 },
  { id: 'feet', x: 200, y: 312, r: 44 },
]

const ZONES: { id: BabyZone; style: CSSProperties }[] = ZONE_ANCHORS.map((z) => ({
  id: z.id,
  style: {
    left: `${(z.x / 400) * 100}%`,
    top: `${(z.y / 420) * 100}%`,
    width: `${((z.r * 2) / 400) * 100}%`,
    height: `${((z.r * 2) / 420) * 100}%`,
    transform: 'translate(-50%, -50%)',
    zIndex: z.id === 'cheekL' || z.id === 'cheekR' ? 6 : 4,
  },
}))

function playPoseSfx(pose: BabyPose, intensity: number) {
  switch (pose) {
    case 'nuzzle':
      gameAudio.playHum(intensity)
      break
    case 'pout':
      gameAudio.playPout(intensity)
      break
    case 'grab':
      gameAudio.playGiggle(intensity)
      break
    case 'tickle':
      gameAudio.playTickle(intensity)
      break
    case 'kick':
      gameAudio.playKick(intensity)
      break
    case 'crazy':
      gameAudio.playRaspberry(intensity)
      break
    default:
      break
  }
}

export function BabyTouchView({
  session,
  account,
  onRequireAuth,
  onRoundComplete,
  onBack,
}: BabyTouchViewProps) {
  const { t } = useI18n()
  const [mode, setMode] = useState<BabyMode>('gentle')
  const [pose, setPose] = useState<BabyPose>('idle')
  const [pinchSide, setPinchSide] = useState<'left' | 'right' | null>(null)
  const [bubble, setBubble] = useState<string | null>(null)
  const [comboHint, setComboHint] = useState<string | null>(null)
  const [sessionPts, setSessionPts] = useState(0)
  const [touches, setTouches] = useState(0)
  const [capped, setCapped] = useState(false)
  const [muted, setMuted] = useState(() => gameAudio.isMuted())
  const [volume, setVolume] = useState(() => gameAudio.getVolume())
  const [hint, setHint] = useState<string | null>(null)

  const modeRef = useRef(mode)
  const poseTimer = useRef<number | null>(null)
  const hintTimer = useRef<number | null>(null)
  const lastAwardAt = useRef(0)
  const lastZoneAt = useRef<Partial<Record<BabyZone | 'combo', number>>>({})
  const cheekTaps = useRef<CheekTap[]>([])
  const lastCheekRef = useRef<{ side: 'left' | 'right'; at: number } | null>(null)
  const pendingPts = useRef(0)
  const pendingHits = useRef(0)
  const sessionPtsRef = useRef(0)

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const flushPoints = useCallback(() => {
    const pts = pendingPts.current
    const hits = pendingHits.current
    pendingPts.current = 0
    pendingHits.current = 0
    if (!session || pts <= 0) return
    onRoundComplete(pts, hits)
  }, [session, onRoundComplete])

  const flushRef = useRef(flushPoints)
  useEffect(() => {
    flushRef.current = flushPoints
  }, [flushPoints])

  const showHint = useCallback(
    (key: string) => {
      setHint(t(key))
      if (hintTimer.current != null) window.clearTimeout(hintTimer.current)
      hintTimer.current = window.setTimeout(() => setHint(null), 2400)
    },
    [t],
  )

  const awardTouch = useCallback(
    (combo: boolean) => {
      const now = Date.now()
      if (!combo && now - lastAwardAt.current < BABY_TOUCH_COOLDOWN_MS) return 0
      lastAwardAt.current = now
      const raw = pointsForAction(modeRef.current, combo)
      const granted = clampSessionAward(sessionPtsRef.current, raw)
      if (granted <= 0) {
        setCapped(true)
        return 0
      }
      sessionPtsRef.current += granted
      setSessionPts(sessionPtsRef.current)
      setTouches((n) => n + 1)
      pendingPts.current += granted
      pendingHits.current += 1
      if (sessionPtsRef.current >= BABY_TOUCH_SESSION_CAP) setCapped(true)
      if (pendingPts.current >= BABY_BATCH_FLUSH_AT) flushRef.current()
      return granted
    },
    [],
  )

  const runReaction = useCallback(
    (nextPose: BabyPose, side: 'left' | 'right' | null) => {
      void gameAudio.unlock().then(() => {
        playPoseSfx(nextPose, sfxIntensity(modeRef.current))
        gameAudio.startBgm()
      })
      setPose(nextPose)
      setPinchSide(side)
      setBubble(t(reactionCopyKey(nextPose)))
      if (poseTimer.current != null) window.clearTimeout(poseTimer.current)
      const hold = modeRef.current === 'gentle' ? BABY_REACTION_MS + 400 : BABY_REACTION_MS
      poseTimer.current = window.setTimeout(() => {
        setPose('idle')
        setPinchSide(null)
        setBubble(null)
      }, hold)
    },
    [t],
  )

  const onZone = useCallback(
    (zone: BabyZone) => {
      if (!session) {
        onRequireAuth()
        return
      }
      const now = Date.now()
      const isCheek = zone === 'cheekL' || zone === 'cheekR'

      if (isCheek) {
        const side: 'left' | 'right' = zone === 'cheekL' ? 'left' : 'right'
        const prev = lastCheekRef.current
        lastCheekRef.current = { side, at: now }
        cheekTaps.current = pruneCheekTaps([...cheekTaps.current, { side, at: now }], now)

        if (modeRef.current === 'crazy') {
          const pair =
            !!prev && prev.side !== side && now - prev.at <= BABY_COMBO_WINDOW_MS
          const prog = comboProgress(cheekTaps.current, now)
          if (pair || prog.ready) {
            cheekTaps.current = []
            lastCheekRef.current = null
            setComboHint(null)
            awardTouch(true)
            runReaction('crazy', null)
            return
          }
          setComboHint(t('babyTouch.comboProgress', { n: 1, total: 2 }))
          awardTouch(false)
          setBubble(t('babyTouch.reactCheek'))
          void gameAudio.unlock().then(() => gameAudio.playPout(sfxIntensity('crazy')))
          return
        }
        if (comboProgress(cheekTaps.current, now).ready) {
          cheekTaps.current = []
          lastCheekRef.current = null
          showHint('babyTouch.lockedCrazy')
        }
      } else {
        cheekTaps.current = pruneCheekTaps(cheekTaps.current, now)
      }

      const last = lastZoneAt.current[zone] ?? 0
      if (now - last < BABY_TOUCH_COOLDOWN_MS) return
      lastZoneAt.current[zone] = now
      awardTouch(false)
      const side = zone === 'cheekL' ? 'left' : zone === 'cheekR' ? 'right' : null
      runReaction(poseForZone(zone), side)
    },
    [session, onRequireAuth, awardTouch, runReaction, showHint, t],
  )

  useEffect(
    () => () => {
      if (poseTimer.current != null) window.clearTimeout(poseTimer.current)
      if (hintTimer.current != null) window.clearTimeout(hintTimer.current)
      gameAudio.stopBgm()
      flushRef.current()
    },
    [],
  )

  const leaveToHub = () => {
    gameAudio.stopBgm()
    flushPoints()
    onBack()
  }

  if (!session) {
    return (
      <section className="hawk-card mx-auto max-w-lg px-6 py-14 text-center">
        <Lock className="mx-auto mb-3 h-10 w-10 text-hawk-gold" />
        <h1 className="text-2xl font-bold text-hawk-cream">{t('babyTouch.title')}</h1>
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

  const modeBtn = (id: BabyMode, icon: 'gentle' | 'funny' | 'crazy', label: string, hintKey: string) => (
    <button
      type="button"
      onClick={() => {
        setMode(id)
        modeRef.current = id
        cheekTaps.current = []
        lastCheekRef.current = null
        setComboHint(null)
        void gameAudio.unlock()
      }}
      className={`hawk-btn flex min-h-12 flex-1 flex-col items-center gap-0.5 px-2 py-2 text-xs sm:text-sm ${
        mode === id ? 'hawk-btn-primary' : 'hawk-btn-ghost text-hawk-cream'
      }`}
      aria-pressed={mode === id}
    >
      <span className="inline-flex items-center gap-1 font-semibold">
        {icon === 'gentle' ? (
          <Moon className="h-3.5 w-3.5" />
        ) : icon === 'funny' ? (
          <Laugh className="h-3.5 w-3.5" />
        ) : (
          <Zap className="h-3.5 w-3.5" />
        )}
        {label}
      </span>
      <span className={mode === id ? 'opacity-80' : 'text-hawk-muted'}>{t(hintKey)}</span>
    </button>
  )

  return (
    <section className="relative">
      <button
        type="button"
        onClick={leaveToHub}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-hawk-muted hover:text-hawk-cream"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('gameHub.back')}
      </button>

      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-hawk-gold">
            <Baby className="h-3.5 w-3.5" />
            {t('babyTouch.badge')}
          </p>
          <h1 className="text-2xl font-bold text-hawk-cream sm:text-3xl">{t('babyTouch.title')}</h1>
          <p className="mt-1 text-sm font-medium text-hawk-gold/90">{t('babyTouch.gameName')}</p>
          <p className="mt-2 max-w-xl text-sm text-hawk-muted">{t('babyTouch.subtitle')}</p>
        </div>
        <div className="rounded-xl border border-hawk-gold/30 bg-hawk-gold/10 px-4 py-3 text-right">
          <p className="text-xs text-hawk-muted">{t('game.totalPoints')}</p>
          <p className="text-2xl font-bold text-hawk-gold">{account.total}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-[11px]">
        <span className="rounded-full border border-hawk-gold/40 bg-hawk-gold/10 px-2 py-1 text-hawk-gold">
          {t('babyTouch.rewardHint')}
        </span>
        <span className="rounded-full border border-hawk-border bg-hawk-panel px-2 py-1 text-hawk-muted">
          {t('babyTouch.tapHint')}
        </span>
        <span className="rounded-full border border-hawk-border bg-hawk-panel px-2 py-1 text-hawk-muted">
          {t('babyTouch.noPressure')}
        </span>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        {modeBtn('gentle', 'gentle', t('babyTouch.modeGentle'), 'babyTouch.modeGentleHint')}
        {modeBtn('funny', 'funny', t('babyTouch.modeFunny'), 'babyTouch.modeFunnyHint')}
        {modeBtn('crazy', 'crazy', t('babyTouch.modeCrazy'), 'babyTouch.modeCrazyHint')}
      </div>

      {mode === 'crazy' && (
        <p className="mb-3 inline-flex items-center gap-1.5 text-xs text-hawk-gold">
          <Sparkles className="h-3.5 w-3.5" />
          {t('babyTouch.crazyHint')}
        </p>
      )}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-hawk-muted">{hint ?? t('babyTouch.tapHint')}</p>
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
              onChange={(ev) => {
                const v = Number(ev.target.value)
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
          <p className="text-xs text-hawk-muted">{t('babyTouch.sessionPts')}</p>
          <p className="text-xl font-bold text-hawk-gold">
            {sessionPts}/{BABY_TOUCH_SESSION_CAP}
          </p>
        </div>
        <div className="hawk-card px-3 py-3 text-center">
          <p className="text-xs text-hawk-muted">{t('babyTouch.touches')}</p>
          <p className="text-xl font-bold text-hawk-cream">{touches}</p>
        </div>
        <div className="hawk-card px-3 py-3 text-center">
          <p className="text-xs text-hawk-muted">{t('babyTouch.badge')}</p>
          <p className="inline-flex items-center justify-center gap-1 text-xl font-bold text-hawk-blue-bright">
            <Heart className="h-4 w-4" />
            {mode === 'gentle' ? '♡' : mode === 'funny' ? '✦' : '!'}
          </p>
        </div>
      </div>

      <div className="mx-auto mb-3 w-full max-w-lg space-y-2 sm:max-w-xl">
        <BabySpeechBubble text={bubble ?? t('babyTouch.idlePrompt')} />
        {comboHint && (
          <p className="text-center text-xs font-medium text-hawk-gold">{comboHint}</p>
        )}
      </div>

      <div
        className={`baby-scene relative mx-auto aspect-[400/420] w-full max-w-md overflow-hidden rounded-2xl border border-[#c9a07a]/40 shadow-[0_18px_40px_rgba(40,24,12,0.35)] sm:max-w-lg ${
          mode === 'gentle' ? 'baby-mode-gentle' : mode === 'crazy' ? 'baby-mode-crazy' : 'baby-mode-funny'
        }`}
        role="application"
        aria-label={t('babyTouch.scene')}
      >
        <div className="baby-sky" />
        <div className="hatch-grain" />
        <svg
          viewBox="0 0 400 420"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden
        >
          <BedroomBackdrop />
          <g transform="translate(200 168) scale(1.35)">
            <BabyEagleSprite pose={pose} mode={mode} pinchSide={pinchSide} />
          </g>
        </svg>
        {ZONES.map((z) => (
          <button
            key={z.id}
            type="button"
            className="baby-hotspot"
            style={z.style}
            aria-label={t(zoneLabelKey(z.id))}
            onClick={() => onZone(z.id)}
          >
            {(z.id === 'cheekL' || z.id === 'cheekR') && (
              <span className="text-[11px] font-bold text-white drop-shadow">
                {z.id === 'cheekL' ? 'L' : 'R'}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mx-auto mt-3 grid w-full max-w-md grid-cols-3 gap-2 sm:max-w-lg sm:grid-cols-6">
        {ZONES.map((z) => (
          <button
            key={`chip-${z.id}`}
            type="button"
            className="hawk-btn hawk-btn-ghost min-h-11 px-2 py-2 text-[11px] text-hawk-cream sm:text-xs"
            onClick={() => onZone(z.id)}
          >
            {t(zoneLabelKey(z.id))}
          </button>
        ))}
      </div>

      {capped && (
        <p className="mt-3 text-center text-xs text-hawk-gold">{t('babyTouch.sessionCap')}</p>
      )}
    </section>
  )
}
