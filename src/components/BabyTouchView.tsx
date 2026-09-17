import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ArrowLeft, Heart, Lock, Smile, Star, Volume2, VolumeX } from 'lucide-react'
import type { PointsAccount, Session } from '../types'
import { useI18n } from '../i18n'
import { gameAudio } from '../lib/gameAudio'
import {
  BABY_BATCH_FLUSH_AT,
  BABY_COMBO_WINDOW_MS,
  BABY_TOUCH_COOLDOWN_MS,
  BABY_TOUCH_SESSION_CAP,
  clampSessionAward,
  comboProgress,
  pointsForAction,
  poseForZone,
  pruneCheekTaps,
  reactionCopyKey,
  reactionHoldMs,
  sfxIntensity,
  zoneLabelKey,
  type BabyMode,
  type BabyPose,
  type BabyZone,
  type CheekTap,
} from '../lib/babyTouch'
import { BabySpeechBubble, NurseryScene, type BabyFocusSide } from './BabyTouchArt'

interface BabyTouchViewProps {
  session: Session | null
  account: PointsAccount
  onRequireAuth: () => void
  onBack: () => void
  onRoundComplete: (score: number, hits: number) => void
}

/** Coordinate space matches the 3:4 nursery painting. */
const SCENE_W = 400
const SCENE_H = 533

const ZONE_ANCHORS: { id: BabyZone; key: string; x: number; y: number; r: number; side?: BabyFocusSide }[] = [
  { id: 'hair', key: 'hair', x: 205, y: 118, r: 36 },
  { id: 'cheekL', key: 'cheekL', x: 162, y: 215, r: 34, side: 'left' },
  { id: 'cheekR', key: 'cheekR', x: 250, y: 215, r: 34, side: 'right' },
  { id: 'palm', key: 'palmL', x: 138, y: 310, r: 38, side: 'left' },
  { id: 'palm', key: 'palmR', x: 278, y: 328, r: 32, side: 'right' },
  { id: 'shoulder', key: 'shoulderL', x: 170, y: 272, r: 28, side: 'left' },
  { id: 'shoulder', key: 'shoulderR', x: 258, y: 282, r: 34, side: 'right' },
  { id: 'belly', key: 'belly', x: 205, y: 342, r: 36 },
  { id: 'feet', key: 'footL', x: 168, y: 440, r: 36, side: 'left' },
  { id: 'feet', key: 'footR', x: 242, y: 440, r: 36, side: 'right' },
]

const CHIP_ZONES: BabyZone[] = ['hair', 'palm', 'shoulder', 'belly', 'feet', 'cheekL', 'cheekR']

const ZONES: { id: BabyZone; key: string; side?: BabyFocusSide; style: CSSProperties }[] = ZONE_ANCHORS.map((z) => ({
  id: z.id,
  key: z.key,
  side: z.side,
  style: {
    left: `${(z.x / SCENE_W) * 100}%`,
    top: `${(z.y / SCENE_H) * 100}%`,
    width: `${((z.r * 2) / SCENE_W) * 100}%`,
    height: `${((z.r * 2) / SCENE_H) * 100}%`,
    transform: 'translate(-50%, -50%)',
    zIndex: z.id === 'cheekL' || z.id === 'cheekR' ? 6 : 4,
  },
}))

function SpiralIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M12 12c.2-2 1.7-3.1 3.3-3.1 2.5 0 4 2.2 4 4.9 0 4.4-3.5 8-8.3 8S3 18.2 3 12.2 7.4 4 12.2 4c3.4 0 6 1.7 7.2 3.6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function playPoseSfx(pose: BabyPose, mode: BabyMode) {
  const intensity = sfxIntensity(mode)
  const soft = mode === 'gentle'
  const wild = mode === 'crazy'
  switch (pose) {
    case 'nuzzle':
    case 'cuddle':
      if (soft) gameAudio.playSoftGiggle(intensity)
      else gameAudio.playBrightGiggle(intensity)
      break
    case 'pout':
      gameAudio.playPout(intensity)
      break
    case 'grab':
      gameAudio.playHihi(intensity)
      break
    case 'tickle':
      if (soft) gameAudio.playSoftGiggle(intensity * 1.2)
      else gameAudio.playBellyLaugh(wild ? intensity * 1.12 : intensity)
      break
    case 'kick':
      gameAudio.playSqueakGiggle(intensity)
      break
    case 'crazy':
      gameAudio.playBellyLaugh(intensity * 1.15)
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
  const [focusSide, setFocusSide] = useState<BabyFocusSide>(null)
  const [poseTick, setPoseTick] = useState(0)
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
    (nextPose: BabyPose, side: BabyFocusSide) => {
      void gameAudio.unlock().then(() => {
        playPoseSfx(nextPose, modeRef.current)
        gameAudio.startBgm()
      })
      setPose(nextPose)
      setFocusSide(side)
      setPoseTick((n) => n + 1)
      setBubble(t(reactionCopyKey(nextPose)))
      if (poseTimer.current != null) window.clearTimeout(poseTimer.current)
      const hold = reactionHoldMs(modeRef.current, nextPose)
      poseTimer.current = window.setTimeout(() => {
        setPose('idle')
        setFocusSide(null)
        setBubble(null)
      }, hold)
    },
    [t],
  )

  const onZone = useCallback(
    (zone: BabyZone, side: BabyFocusSide = null) => {
      const now = Date.now()
      const isCheek = zone === 'cheekL' || zone === 'cheekR'
      const focus: BabyFocusSide = isCheek ? (zone === 'cheekL' ? 'left' : 'right') : side

      if (isCheek) {
        const cheek: 'left' | 'right' = zone === 'cheekL' ? 'left' : 'right'
        const prev = lastCheekRef.current
        lastCheekRef.current = { side: cheek, at: now }
        cheekTaps.current = pruneCheekTaps([...cheekTaps.current, { side: cheek, at: now }], now)

        if (modeRef.current === 'crazy') {
          const pair = !!prev && prev.side !== cheek && now - prev.at <= BABY_COMBO_WINDOW_MS
          const prog = comboProgress(cheekTaps.current, now)
          if (pair || prog.ready) {
            cheekTaps.current = []
            lastCheekRef.current = null
            setComboHint(null)
            if (session) awardTouch(true)
            runReaction('crazy', null)
            return
          }
          setComboHint(t('babyTouch.comboProgress', { n: 1, total: 2 }))
          if (session) awardTouch(false)
          runReaction('pout', focus)
          return
        }
        if (session && comboProgress(cheekTaps.current, now).ready) {
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
      if (session) awardTouch(false)
      runReaction(poseForZone(zone), focus)
    },
    [session, awardTouch, runReaction, showHint, t],
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

  const modeBtn = (id: BabyMode, icon: ReactNode, label: string, extra: string) => (
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
      className={`baby-pill ${extra} ${mode === id ? 'is-on' : ''}`}
      aria-pressed={mode === id}
    >
      {icon}
      {label}
    </button>
  )

  const poster = (inner: ReactNode) => (
    <section className="relative mx-auto w-full max-w-lg">
      <button
        type="button"
        onClick={leaveToHub}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-hawk-muted hover:text-hawk-cream"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('gameHub.back')}
      </button>
      <div className="baby-poster">{inner}</div>
    </section>
  )

  return poster(
    <>
      <CloudTitle title={t('babyTouch.posterTitle')} />
      {!session && (
        <button type="button" onClick={onRequireAuth} className="baby-sign-in mb-3">
          <Lock className="h-4 w-4" />
          {t('auth.signIn')}
        </button>
      )}

      <p className="baby-tip">
        <span className="baby-tip-bulb" aria-hidden>
          💡
        </span>
        {t('babyTouch.subtitle')}
      </p>

      <div className="baby-mode-row">
        <span className="baby-pill baby-pill-select">
          <Star className="h-3.5 w-3.5 fill-current" />
          {t('babyTouch.modeSelect')}
        </span>
        {modeBtn('gentle', <Heart className="h-3.5 w-3.5 fill-current" />, t('babyTouch.modeGentle'), 'baby-pill-gentle')}
        {modeBtn('funny', <Smile className="h-3.5 w-3.5" />, t('babyTouch.modeFunny'), 'baby-pill-funny')}
        {modeBtn('crazy', <SpiralIcon className="h-3.5 w-3.5" />, t('babyTouch.modeCrazy'), 'baby-pill-crazy')}
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#8a6a48]">
        <span>
          {t('babyTouch.sessionPts')} {sessionPts}/{BABY_TOUCH_SESSION_CAP} · {t('babyTouch.touches')} {touches} ·{' '}
          {t('game.totalPoints')} {account.total}
        </span>
        <div className="flex items-center gap-2">
          <label className={`flex items-center gap-1.5 ${muted ? 'opacity-50' : ''}`}>
            <span className="sr-only">{t('game.volume')}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              className="h-1.5 w-20 cursor-pointer accent-[#e8b85a] sm:w-24"
              onChange={(ev) => {
                const v = Number(ev.target.value)
                setVolume(v)
                gameAudio.setVolume(v)
              }}
            />
          </label>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 text-[#7a5a40]"
            onClick={() => {
              const next = gameAudio.toggleMute()
              setMuted(next)
              if (next) gameAudio.stopBgm()
            }}
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            <span className="sr-only">{muted ? t('game.unmute') : t('game.mute')}</span>
          </button>
        </div>
      </div>

      {mode === 'crazy' && <p className="mb-2 text-center text-xs font-medium text-[#7a4ec8]">{t('babyTouch.crazyHint')}</p>}
      {hint && <p className="mb-2 text-center text-xs font-medium text-[#b8860b]">{hint}</p>}

      <div className="mb-2 space-y-1.5">
        <BabySpeechBubble text={bubble ?? t('babyTouch.idlePrompt')} />
        {comboHint && <p className="text-center text-xs font-medium text-[#c45a7a]">{comboHint}</p>}
      </div>

      <div
        className={`baby-scene relative mx-auto aspect-[400/533] w-full overflow-hidden rounded-[1.35rem] shadow-[0_12px_28px_rgba(120,70,30,0.18)] ${
          mode === 'gentle' ? 'baby-mode-gentle' : mode === 'crazy' ? 'baby-mode-crazy' : 'baby-mode-funny'
        }`}
        role="application"
        aria-label={t('babyTouch.scene')}
      >
        <NurseryScene pose={pose} mode={mode} focusSide={focusSide} poseTick={poseTick} />
        {ZONES.map((z) => (
          <button
            key={z.key}
            type="button"
            className="baby-hotspot"
            style={z.style}
            aria-label={t(zoneLabelKey(z.id))}
            onClick={() => onZone(z.id, z.side ?? null)}
          />
        ))}
      </div>

      <div className="mx-auto mt-3 grid w-full grid-cols-4 gap-1.5 sm:grid-cols-7">
        {CHIP_ZONES.map((id) => (
          <button
            key={`chip-${id}`}
            type="button"
            className="baby-chip"
            onClick={() => onZone(id, id === 'cheekL' ? 'left' : id === 'cheekR' ? 'right' : null)}
          >
            {t(zoneLabelKey(id))}
          </button>
        ))}
      </div>

      {capped && <p className="mt-3 text-center text-xs text-[#b8860b]">{t('babyTouch.sessionCap')}</p>}
      <p className="mt-2 text-center text-[11px] text-[#a08060]">{t('babyTouch.rewardHint')}</p>
    </>,
  )
}

function CloudTitle({ title }: { title: string }) {
  return (
    <div className="baby-cloud-banner">
      <span className="baby-deco baby-deco-star-l" aria-hidden>
        ✦
      </span>
      <h1>{title}</h1>
      <span className="baby-deco baby-deco-heart" aria-hidden>
        ♡
      </span>
      <span className="baby-deco baby-deco-star-r" aria-hidden>
        ✦
      </span>
    </div>
  )
}
