import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, CloudSun, Lock, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import type { PointsAccount, Session } from '../types'
import { useI18n } from '../i18n'
import { gameAudio } from '../lib/gameAudio'
import { GameHubLeaveButton } from './GameHubLeaveButton'
import {
  FLUFFY_SOAR_SESSION_CAP,
  formatFlightTime,
  sessionScoreFromElapsed,
} from '../lib/fluffySoar'

const GRAVITY = 0.16
const TAP_IMPULSE = -5.8
const MAX_VY = 6.4
const EAGLE_R = 26
const CATCH_H = 78
const CATCH_BOUNCE = -4.4
const SOFT_BOUNCE = -5.1
const HEAL_BOUNCE = -2.4
const CLOUD_SPEED = 1.05
const JELLY_SPEED = 1.35

type Phase = 'idle' | 'playing' | 'ended'

interface SoftPad {
  x: number
  y: number
  w: number
  h: number
  seed: number
}

interface JellyCloud {
  x: number
  y: number
  r: number
  hue: number
  seed: number
  popping: boolean
  popT: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  color: string
  r: number
}

interface Breeze {
  x: number
  y: number
  life: number
  w: number
}

interface FluffySoarViewProps {
  session: Session | null
  account: PointsAccount
  onRequireAuth: () => void
  onRoundComplete: (score: number, hits: number) => void
  onBack: () => void
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function drawPengpeng(
  ctx: CanvasRenderingContext2D,
  wingPhase: number,
  tilt: number,
  squash: number,
) {
  const wing = Math.sin(wingPhase) * 0.55
  ctx.save()
  ctx.rotate(tilt)
  ctx.scale(1 + squash * 0.08, 1 - squash * 0.1)

  // far wing
  ctx.fillStyle = '#c48b6a'
  ctx.beginPath()
  ctx.ellipse(-18, 2, 14, 7, -0.7 + wing * 0.5, 0, Math.PI * 2)
  ctx.fill()

  // cotton body
  const body = ctx.createRadialGradient(-4, 6, 4, 0, 10, 24)
  body.addColorStop(0, '#f0c4a4')
  body.addColorStop(0.55, '#d4a07a')
  body.addColorStop(1, '#b87a58')
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.ellipse(0, 10, 22, 18, 0.08, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 236, 220, 0.45)'
  ctx.beginPath()
  ctx.ellipse(-6, 8, 10, 8, -0.2, 0, Math.PI * 2)
  ctx.fill()

  // near wing
  ctx.fillStyle = '#b87a58'
  ctx.beginPath()
  ctx.ellipse(16, 6, 13, 6.5, 0.55 - wing * 0.6, 0, Math.PI * 2)
  ctx.fill()

  // cotton-candy white head (bald-eagle Q)
  ctx.fillStyle = '#fff6f0'
  ctx.beginPath()
  ctx.arc(0, -10, 16, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffe4f0'
  ctx.beginPath()
  ctx.ellipse(-11, -12, 7, 8, -0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(11, -12, 7, 8, 0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.ellipse(0, -18, 9, 7, 0, 0, Math.PI * 2)
  ctx.fill()

  // blush
  ctx.fillStyle = 'rgba(243, 194, 180, 0.9)'
  ctx.beginPath()
  ctx.ellipse(-6, -3.5, 4.2, 2.4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(6, -3.5, 4.2, 2.4, 0, 0, Math.PI * 2)
  ctx.fill()

  // eyes
  ctx.fillStyle = '#3a2a1c'
  ctx.beginPath()
  ctx.arc(-5, -11, 2.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(5, -11, 2.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(-4.3, -11.8, 0.75, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(5.7, -11.8, 0.75, 0, Math.PI * 2)
  ctx.fill()

  // beak
  ctx.fillStyle = '#f0b429'
  ctx.beginPath()
  ctx.moveTo(-2.4, -6)
  ctx.lineTo(0, 2.5)
  ctx.lineTo(2.4, -6)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#e09a28'
  ctx.beginPath()
  ctx.moveTo(-1.4, 0)
  ctx.quadraticCurveTo(0, 4, 1.4, 0)
  ctx.fill()

  // feet
  ctx.fillStyle = '#f0b429'
  ctx.beginPath()
  ctx.ellipse(-8, 24, 5, 3.2, -0.15, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(8, 24, 5, 3.2, 0.15, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function drawSoftPad(ctx: CanvasRenderingContext2D, c: SoftPad, t: number) {
  const wob = Math.sin(t * 0.003 + c.seed) * 2
  ctx.save()
  ctx.translate(c.x, c.y + wob)
  ctx.fillStyle = 'rgba(232, 215, 245, 0.4)'
  ctx.beginPath()
  ctx.ellipse(0, c.h * 0.35, c.w * 0.55, c.h * 0.35, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff8fb'
  ctx.beginPath()
  ctx.ellipse(-c.w * 0.28, 0, c.w * 0.32, c.h * 0.42, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.ellipse(0, -c.h * 0.12, c.w * 0.38, c.h * 0.48, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff1e8'
  ctx.beginPath()
  ctx.ellipse(c.w * 0.28, 0, c.w * 0.3, c.h * 0.4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawJelly(ctx: CanvasRenderingContext2D, j: JellyCloud, t: number) {
  const pop = j.popping ? clamp(j.popT, 0, 1) : 0
  const scale = j.popping ? 1 + pop * 0.35 : 1 + Math.sin(t * 0.006 + j.seed) * 0.08
  const alpha = j.popping ? 1 - pop : 1
  ctx.save()
  ctx.translate(j.x, j.y)
  ctx.scale(scale, scale * (j.popping ? 1 - pop * 0.4 : 1))
  ctx.globalAlpha = alpha
  const hues = [j.hue, (j.hue + 40) % 360, (j.hue + 80) % 360, (j.hue + 140) % 360]
  const blobs: [number, number, number, number][] = [
    [0, 0, j.r, j.r * 0.82],
    [-j.r * 0.35, -j.r * 0.1, j.r * 0.62, j.r * 0.55],
    [j.r * 0.4, 0, j.r * 0.55, j.r * 0.5],
    [0, j.r * 0.25, j.r * 0.6, j.r * 0.42],
  ]
  blobs.forEach(([bx, by, rx, ry], i) => {
    ctx.fillStyle = `hsl(${hues[i]} 78% 72%)`
    ctx.beginPath()
    ctx.ellipse(bx, by, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.beginPath()
  ctx.ellipse(-j.r * 0.22, -j.r * 0.32, j.r * 0.22, j.r * 0.16, -0.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawCottonSea(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const base = h - CATCH_H + 18
  const colors = ['#fff6e8', '#ffe4f0', '#f3e8ff', '#e4f0ff', '#fff8fb']
  for (let i = 0; i < 8; i++) {
    const cx = ((i / 8) * w + t * 0.018 * (i % 2 === 0 ? 1 : -1) + w) % (w + 80) - 40
    const cy = base + Math.sin(t * 0.002 + i) * 5 + (i % 3) * 6
    ctx.fillStyle = colors[i % colors.length]
    ctx.beginPath()
    ctx.ellipse(cx, cy, 52, 22, 0, 0, Math.PI * 2)
    ctx.ellipse(cx + 28, cy - 6, 36, 18, 0, 0, Math.PI * 2)
    ctx.ellipse(cx - 24, cy - 4, 32, 16, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

export function FluffySoarView({
  session,
  account,
  onRequireAuth,
  onRoundComplete,
  onBack,
}: FluffySoarViewProps) {
  const { t } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [score, setScore] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [pops, setPops] = useState(0)
  const [capped, setCapped] = useState(false)
  const [muted, setMuted] = useState(() => gameAudio.isMuted())
  const [volume, setVolume] = useState(() => gameAudio.getVolume())

  const phaseRef = useRef<Phase>('idle')
  const scoreRef = useRef(0)
  const elapsedRef = useRef(0)
  const popsRef = useRef(0)
  const awardedRef = useRef(false)
  const eagleRef = useRef({ x: 110, y: 220, vy: 0, squash: 0 })
  const padsRef = useRef<SoftPad[]>([])
  const jelliesRef = useRef<JellyCloud[]>([])
  const particlesRef = useRef<Particle[]>([])
  const breezesRef = useRef<Breeze[]>([])
  const rafRef = useRef(0)
  const sizeRef = useRef({ w: 360, h: 520 })
  const wingRef = useRef(0)
  const timeRef = useRef(0)
  const lastTsRef = useRef(0)
  const lastCatchSfxRef = useRef(0)
  const lastUiRef = useRef(0)
  const pausedRef = useRef(false)

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

  const spawnWorld = useCallback((w: number, h: number) => {
    const pads: SoftPad[] = []
    for (let i = 0; i < 5; i++) {
      pads.push({
        x: 40 + i * (w / 4.2) + rand(-12, 18),
        y: 90 + (i % 3) * ((h - CATCH_H - 130) / 3) + rand(-16, 20),
        w: rand(70, 96),
        h: rand(28, 38),
        seed: Math.random() * 10,
      })
    }
    padsRef.current = pads
    const jellies: JellyCloud[] = []
    for (let i = 0; i < 4; i++) {
      jellies.push({
        x: w * 0.45 + i * 90 + rand(0, 40),
        y: 70 + rand(0, h - CATCH_H - 140),
        r: rand(18, 26),
        hue: [350, 28, 48, 140, 200, 280][i % 6],
        seed: Math.random() * 8,
        popping: false,
        popT: 0,
      })
    }
    jelliesRef.current = jellies
    particlesRef.current = []
    breezesRef.current = []
  }, [])

  const burst = useCallback((x: number, y: number, color: string, n = 10) => {
    for (let i = 0; i < n; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: rand(-2.4, 2.4),
        vy: rand(-3.2, 0.6),
        life: 1,
        max: rand(18, 34),
        color,
        r: rand(2, 4.5),
      })
    }
  }, [])

  const awardOnce = useCallback(() => {
    if (awardedRef.current) return
    const pts = scoreRef.current
    const hits = popsRef.current
    if (pts <= 0) return
    awardedRef.current = true
    onRoundComplete(pts, hits)
  }, [onRoundComplete])
  const awardOnceRef = useRef(awardOnce)
  useEffect(() => {
    awardOnceRef.current = awardOnce
  }, [awardOnce])

  const endSession = useCallback(
    (toHub = false) => {
      if (phaseRef.current !== 'playing') {
        if (toHub) onBack()
        return
      }
      phaseRef.current = 'ended'
      setPhase('ended')
      setElapsedMs(elapsedRef.current)
      setScore(scoreRef.current)
      clearRaf()
      gameAudio.stopBgm()
      gameAudio.playEnd(false)
      awardOnce()
      if (toHub) onBack()
    },
    [awardOnce, clearRaf, onBack],
  )

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { w, h } = sizeRef.current
    const t = timeRef.current
    ctx.clearRect(0, 0, w, h)

    const sky = ctx.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, '#f9b4a8')
    sky.addColorStop(0.22, '#f7c9a8')
    sky.addColorStop(0.5, '#f5d6c8')
    sky.addColorStop(0.78, '#d7c4ee')
    sky.addColorStop(1, '#b8d4f0')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, w, h)

    ctx.fillStyle = 'rgba(255, 232, 176, 0.45)'
    ctx.beginPath()
    ctx.arc(w * 0.82, h * 0.12, 54, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffd27a'
    ctx.beginPath()
    ctx.arc(w * 0.82, h * 0.12, 26, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff6d8'
    ctx.beginPath()
    ctx.arc(w * 0.82, h * 0.12, 14, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = 'rgba(255,255,255,0.38)'
    const far = (cx: number, cy: number, s: number) => {
      ctx.beginPath()
      ctx.ellipse(cx, cy, 34 * s, 16 * s, 0, 0, Math.PI * 2)
      ctx.ellipse(cx + 26 * s, cy - 4 * s, 24 * s, 14 * s, 0, 0, Math.PI * 2)
      ctx.ellipse(cx + 48 * s, cy, 28 * s, 15 * s, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    far((t * 0.012 + w * 0.1) % (w + 120) - 60, h * 0.18, 1)
    far((t * 0.008 + w * 0.55) % (w + 120) - 60, h * 0.1, 0.75)

    for (const pad of padsRef.current) drawSoftPad(ctx, pad, t)
    for (const j of jelliesRef.current) drawJelly(ctx, j, t)

    for (const b of breezesRef.current) {
      ctx.globalAlpha = clamp(b.life, 0, 0.45)
      ctx.strokeStyle = 'rgba(255, 248, 240, 0.9)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.ellipse(b.x, b.y, b.w, 8 + (1 - b.life) * 10, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    drawCottonSea(ctx, w, h, t)

    const e = eagleRef.current
    ctx.save()
    ctx.translate(e.x, e.y)
    drawPengpeng(ctx, wingRef.current, clamp(e.vy * 0.04, -0.35, 0.4), e.squash)
    ctx.restore()

    for (const p of particlesRef.current) {
      ctx.globalAlpha = clamp(p.life, 0, 1)
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    if (phaseRef.current === 'playing') {
      ctx.fillStyle = 'rgba(58, 42, 28, 0.4)'
      ctx.beginPath()
      ctx.roundRect(w / 2 - 48, 12, 96, 32, 12)
      ctx.fill()
      ctx.fillStyle = '#fff6d8'
      ctx.font = 'bold 18px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(scoreRef.current), w / 2, 28)
    }
  }, [])

  const recyclePad = useCallback((pad: SoftPad, w: number, h: number) => {
    const maxX = Math.max(...padsRef.current.map((p) => p.x), w)
    pad.x = maxX + rand(70, 130)
    pad.y = 80 + rand(0, Math.max(40, h - CATCH_H - 140))
    pad.w = rand(70, 96)
    pad.h = rand(28, 38)
    pad.seed = Math.random() * 10
  }, [])

  const recycleJelly = useCallback((j: JellyCloud, w: number, h: number) => {
    const maxX = Math.max(...jelliesRef.current.map((q) => q.x), w)
    j.x = maxX + rand(80, 160)
    j.y = 70 + rand(0, Math.max(40, h - CATCH_H - 140))
    j.r = rand(18, 26)
    j.hue = [350, 28, 48, 140, 200, 280][Math.floor(Math.random() * 6)]
    j.seed = Math.random() * 8
    j.popping = false
    j.popT = 0
  }, [])

  const tick = useCallback(() => {
    if (phaseRef.current !== 'playing') return
    const now = performance.now()
    const rawDt = lastTsRef.current ? now - lastTsRef.current : 16
    lastTsRef.current = now
    const dt = clamp(rawDt, 0, 50)
    const hidden = typeof document !== 'undefined' && document.hidden
    pausedRef.current = hidden

    if (!hidden) {
      elapsedRef.current += dt
      const nextScore = sessionScoreFromElapsed(elapsedRef.current)
      if (nextScore !== scoreRef.current) {
        scoreRef.current = nextScore
        setScore(nextScore)
        if (nextScore > 0 && nextScore < FLUFFY_SOAR_SESSION_CAP) {
          gameAudio.playHit(8)
        }
        if (nextScore >= FLUFFY_SOAR_SESSION_CAP) setCapped(true)
      }
      if (now - lastUiRef.current > 250) {
        lastUiRef.current = now
        setElapsedMs(elapsedRef.current)
      }
      timeRef.current += dt

      const { w, h } = sizeRef.current
      const e = eagleRef.current
      e.vy += GRAVITY
      e.vy = clamp(e.vy, -MAX_VY, MAX_VY)
      e.y += e.vy
      e.squash *= 0.86
      e.x += Math.sin(timeRef.current * 0.002) * 0.12
      e.x = clamp(e.x, 50, w * 0.42)
      wingRef.current += e.vy < -1 ? 0.42 : 0.16

      const catchY = h - CATCH_H + 8
      if (e.y + EAGLE_R > catchY) {
        e.y = catchY - EAGLE_R
        e.vy = CATCH_BOUNCE
        e.squash = 1
        burst(e.x, catchY, '#fff6e8', 8)
        if (now - lastCatchSfxRef.current > 420) {
          lastCatchSfxRef.current = now
          gameAudio.playCotton()
        }
      }
      if (e.y - EAGLE_R < 12) {
        e.y = 12 + EAGLE_R
        e.vy = Math.abs(e.vy) * 0.25
      }

      for (const pad of padsRef.current) {
        pad.x -= CLOUD_SPEED
        if (pad.x + pad.w < -20) recyclePad(pad, w, h)
        const top = pad.y - pad.h * 0.45
        const withinX = e.x > pad.x - pad.w * 0.5 && e.x < pad.x + pad.w * 0.5
        if (withinX && e.vy > 0.4 && e.y + EAGLE_R > top && e.y + EAGLE_R < top + 22) {
          e.y = top - EAGLE_R
          e.vy = SOFT_BOUNCE
          e.squash = 0.8
          burst(e.x, top, '#fff8fb', 6)
        }
      }

      for (const j of jelliesRef.current) {
        if (j.popping) {
          j.popT += dt / 280
          if (j.popT >= 1) recycleJelly(j, w, h)
          continue
        }
        j.x -= JELLY_SPEED
        if (j.x + j.r < -20) recycleJelly(j, w, h)
        const dx = e.x - j.x
        const dy = e.y - j.y
        if (dx * dx + dy * dy < (EAGLE_R + j.r * 0.75) ** 2) {
          j.popping = true
          j.popT = 0
          popsRef.current += 1
          setPops(popsRef.current)
          e.vy = Math.min(e.vy, HEAL_BOUNCE)
          e.squash = 0.6
          gameAudio.playBobo()
          burst(j.x, j.y, `hsl(${j.hue} 80% 70%)`, 14)
        }
      }

      breezesRef.current = breezesRef.current
        .map((b) => ({ ...b, y: b.y - 1.6, life: b.life - dt / 420, w: b.w + 0.4 }))
        .filter((b) => b.life > 0)
      particlesRef.current = particlesRef.current
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.06,
          life: p.life - 1 / p.max,
        }))
        .filter((p) => p.life > 0)
    }

    draw()
    rafRef.current = requestAnimationFrame(tick)
  }, [burst, draw, recycleJelly, recyclePad])

  const idleLoop = useCallback(() => {
    if (phaseRef.current !== 'idle') return
    timeRef.current += 16
    const { w, h } = sizeRef.current
    eagleRef.current.y = h * 0.42 + Math.sin(timeRef.current * 0.0022) * 10
    eagleRef.current.x = Math.min(110, w * 0.3)
    wingRef.current += 0.14
    draw()
    rafRef.current = requestAnimationFrame(idleLoop)
  }, [draw])

  const blowBreeze = useCallback(() => {
    if (phaseRef.current !== 'playing' || pausedRef.current) return
    const e = eagleRef.current
    e.vy = Math.min(e.vy, 0) + TAP_IMPULSE
    e.vy = clamp(e.vy, -MAX_VY, MAX_VY)
    e.squash = 0.5
    wingRef.current = 0
    breezesRef.current.push({ x: e.x, y: e.y + 28, life: 1, w: 16 })
    gameAudio.playBreeze()
  }, [])

  const startRound = async () => {
    if (!session) {
      onRequireAuth()
      return
    }
    await gameAudio.unlock()
    clearRaf()
    awardedRef.current = false
    scoreRef.current = 0
    elapsedRef.current = 0
    popsRef.current = 0
    setScore(0)
    setElapsedMs(0)
    setPops(0)
    setCapped(false)
    resize()
    const { w, h } = sizeRef.current
    eagleRef.current = { x: Math.min(110, w * 0.3), y: h * 0.42, vy: -1.2, squash: 0 }
    spawnWorld(w, h)
    lastTsRef.current = performance.now()
    timeRef.current = 0
    phaseRef.current = 'playing'
    setPhase('playing')
    gameAudio.playStart()
    gameAudio.startBgm()
    rafRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    resize()
    const onResize = () => {
      resize()
      if (phaseRef.current === 'idle') {
        const size = sizeRef.current
        eagleRef.current.x = Math.min(110, size.w * 0.3)
        spawnWorld(size.w, size.h)
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [resize, spawnWorld])

  useEffect(() => {
    if (phase !== 'idle') return
    resize()
    const { w, h } = sizeRef.current
    eagleRef.current = { x: Math.min(110, w * 0.3), y: h * 0.42, vy: 0, squash: 0 }
    spawnWorld(w, h)
    rafRef.current = requestAnimationFrame(idleLoop)
    return () => {
      if (phaseRef.current === 'idle') clearRaf()
    }
  }, [phase, clearRaf, idleLoop, resize, spawnWorld])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const block = (ev: TouchEvent) => {
      if (phaseRef.current === 'playing') ev.preventDefault()
    }
    el.addEventListener('touchmove', block, { passive: false })
    el.addEventListener('touchstart', block, { passive: false })
    return () => {
      el.removeEventListener('touchmove', block)
      el.removeEventListener('touchstart', block)
    }
  }, [])

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (phaseRef.current !== 'playing') return
      if (ev.code === 'Space' || ev.key === ' ') {
        ev.preventDefault()
        blowBreeze()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [blowBreeze])

  useEffect(
    () => () => {
      clearRaf()
      gameAudio.stopBgm()
      if (phaseRef.current === 'playing') awardOnceRef.current()
    },
    [clearRaf],
  )

  useEffect(() => {
    draw()
  }, [draw, phase])

  const leaveToHub = () => {
    clearRaf()
    gameAudio.stopBgm()
    if (phaseRef.current === 'playing') awardOnce()
    phaseRef.current = 'idle'
    onBack()
  }

  if (!session) {
    return (
      <section className="hawk-card mx-auto max-w-lg px-6 py-14 text-center">
        <Lock className="mx-auto mb-3 h-10 w-10 text-hawk-gold" />
        <h1 className="text-2xl font-bold text-hawk-cream">{t('fluffySoar.title')}</h1>
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
      <GameHubLeaveButton onLeave={leaveToHub} />

      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-hawk-gold">
            <CloudSun className="h-3.5 w-3.5" />
            {t('fluffySoar.badge')}
          </p>
          <h1 className="text-2xl font-bold text-hawk-cream sm:text-3xl">{t('fluffySoar.title')}</h1>
          <p className="mt-2 max-w-xl text-sm text-hawk-muted">{t('fluffySoar.subtitle')}</p>
        </div>
        <div className="rounded-xl border border-hawk-gold/30 bg-hawk-gold/10 px-4 py-3 text-right">
          <p className="text-xs text-hawk-muted">{t('game.totalPoints')}</p>
          <p className="text-2xl font-bold text-hawk-gold">{account.total}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-[11px]">
        <span className="rounded-full border border-hawk-gold/40 bg-hawk-gold/10 px-2 py-1 text-hawk-gold">
          {t('fluffySoar.rewardHint')}
        </span>
        <span className="rounded-full border border-hawk-border bg-hawk-panel px-2 py-1 text-hawk-muted">
          {t('fluffySoar.tapHint')}
        </span>
        <span className="rounded-full border border-hawk-border bg-hawk-panel px-2 py-1 text-hawk-muted">
          {t('fluffySoar.noPressure')}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-hawk-muted">{t('fluffySoar.catchHint')}</p>
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
          <p className="text-xl font-bold text-hawk-cream">
            {score}/{FLUFFY_SOAR_SESSION_CAP}
          </p>
        </div>
        <div className="hawk-card px-3 py-3 text-center">
          <p className="text-xs text-hawk-muted">{t('fluffySoar.time')}</p>
          <p className="text-xl font-bold text-hawk-gold">{formatFlightTime(elapsedMs)}</p>
        </div>
        <div className="hawk-card px-3 py-3 text-center">
          <p className="text-xs text-hawk-muted">{t('fluffySoar.pops')}</p>
          <p className="text-xl font-bold text-hawk-blue-bright">{pops}</p>
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
          aria-label={t('fluffySoar.scene')}
          onPointerDown={(ev) => {
            ev.preventDefault()
            if (phaseRef.current === 'playing') blowBreeze()
          }}
        />

        {phase === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/35 p-6 text-center backdrop-blur-[2px]">
            <p className="mb-4 max-w-sm text-sm text-hawk-cream">{t('fluffySoar.ready')}</p>
            <button
              type="button"
              className="hawk-btn hawk-btn-primary inline-flex items-center gap-2 px-5 py-2.5"
              onClick={() => void startRound()}
            >
              <Play className="h-4 w-4" />
              {t('fluffySoar.start')}
            </button>
          </div>
        )}

        {phase === 'ended' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 p-6 text-center backdrop-blur-[2px]">
            <p className="text-lg font-bold text-hawk-cream">{t('fluffySoar.ended')}</p>
            <p className="mt-1 text-sm text-hawk-gold">{t('game.earned', { n: score })}</p>
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
              onClick={leaveToHub}
            >
              <ArrowLeft className="h-4 w-4" />
              {t('gameHub.leave')}
            </button>
          </div>
        )}
      </div>

      {phase === 'playing' && (
        <div className="mx-auto mt-4 flex max-w-xl flex-col items-center gap-2">
          {capped && (
            <p className="text-center text-xs text-hawk-gold">{t('fluffySoar.sessionCap')}</p>
          )}
          <button
            type="button"
            className="hawk-btn hawk-btn-ghost px-5 py-2.5 text-sm"
            onClick={() => endSession(false)}
          >
            {t('fluffySoar.endFlight')}
          </button>
        </div>
      )}
    </section>
  )
}
