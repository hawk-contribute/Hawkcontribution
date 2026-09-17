import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Feather, Lock, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import type { PointsAccount, Session } from '../types'
import { useI18n } from '../i18n'
import { asset } from '../lib/asset'
import { gameAudio } from '../lib/gameAudio'
import { GameHubLeaveButton } from './GameHubLeaveButton'

const PROGRESS_KEY = 'hawk-contribute:wing-soar'

export const WING_SOAR_LEVEL_POINTS = [100, 100, 100, 200, 300] as const

interface NodeDef {
  id: number
  x: number
  y: number
}

interface LevelDef {
  id: number
  points: number
  /** i18n key suffix: wingSoar.level1 … */
  nameKey: string
  cosmeticKey: string
  nodes: NodeDef[]
  /** Undirected required edges */
  edges: [number, number][]
}

/** Predefined one-stroke / Euler-friendly graphs (coords in 0–100 viewBox). */
const LEVELS: LevelDef[] = [
  {
    id: 1,
    points: 100,
    nameKey: 'wingSoar.level1',
    cosmeticKey: 'wingSoar.cosmetic1',
    nodes: [
      { id: 0, x: 50, y: 18 },
      { id: 1, x: 18, y: 82 },
      { id: 2, x: 82, y: 82 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 0],
    ],
  },
  {
    id: 2,
    points: 100,
    nameKey: 'wingSoar.level2',
    cosmeticKey: 'wingSoar.cosmetic2',
    nodes: [
      { id: 0, x: 50, y: 12 },
      { id: 1, x: 88, y: 50 },
      { id: 2, x: 50, y: 88 },
      { id: 3, x: 12, y: 50 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ],
  },
  {
    id: 3,
    points: 100,
    nameKey: 'wingSoar.level3',
    cosmeticKey: 'wingSoar.cosmetic3',
    nodes: [
      { id: 0, x: 50, y: 10 },
      { id: 1, x: 22, y: 42 },
      { id: 2, x: 78, y: 42 },
      { id: 3, x: 22, y: 88 },
      { id: 4, x: 78, y: 88 },
    ],
    edges: [
      [0, 1],
      [0, 2],
      [1, 2],
      [1, 3],
      [2, 4],
      [3, 4],
    ],
  },
  {
    id: 4,
    points: 200,
    nameKey: 'wingSoar.level4',
    cosmeticKey: 'wingSoar.cosmetic4',
    // Twin wings sharing the heart node (Euler circuit)
    nodes: [
      { id: 0, x: 12, y: 50 },
      { id: 1, x: 30, y: 18 },
      { id: 2, x: 30, y: 82 },
      { id: 3, x: 50, y: 50 },
      { id: 4, x: 70, y: 18 },
      { id: 5, x: 70, y: 82 },
      { id: 6, x: 88, y: 50 },
    ],
    edges: [
      [0, 1],
      [1, 3],
      [3, 2],
      [2, 0],
      [3, 4],
      [4, 6],
      [6, 5],
      [5, 3],
    ],
  },
  {
    id: 5,
    points: 300,
    nameKey: 'wingSoar.level5',
    cosmeticKey: 'wingSoar.cosmetic5',
    // Wings + body triangle (still Eulerian)
    nodes: [
      { id: 0, x: 12, y: 42 },
      { id: 1, x: 30, y: 12 },
      { id: 2, x: 30, y: 58 },
      { id: 3, x: 50, y: 36 },
      { id: 4, x: 70, y: 12 },
      { id: 5, x: 70, y: 58 },
      { id: 6, x: 88, y: 42 },
      { id: 7, x: 50, y: 88 },
    ],
    edges: [
      [0, 1],
      [1, 3],
      [3, 2],
      [2, 0],
      [3, 4],
      [4, 6],
      [6, 5],
      [5, 3],
      [2, 7],
      [5, 7],
      [2, 5],
    ],
  },
]

type Phase = 'select' | 'ready' | 'drawing' | 'won' | 'failed'

interface Progress {
  unlockedMax: number
  cleared: number[]
  cosmetics: string[]
}

function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (!raw) return { unlockedMax: 1, cleared: [], cosmetics: [] }
    const p = JSON.parse(raw) as Progress
    return {
      unlockedMax: Math.min(5, Math.max(1, Number(p.unlockedMax) || 1)),
      cleared: Array.isArray(p.cleared) ? p.cleared.filter((n) => n >= 1 && n <= 5) : [],
      cosmetics: Array.isArray(p.cosmetics) ? p.cosmetics : [],
    }
  } catch {
    return { unlockedMax: 1, cleared: [], cosmetics: [] }
  }
}

function saveProgress(p: Progress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(p))
}

function edgeKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

function neighborsOf(level: LevelDef, nodeId: number): number[] {
  const out: number[] = []
  for (const [a, b] of level.edges) {
    if (a === nodeId) out.push(b)
    else if (b === nodeId) out.push(a)
  }
  return out
}

function oddDegreeNodes(level: LevelDef): number[] {
  const deg = new Map<number, number>()
  for (const [a, b] of level.edges) {
    deg.set(a, (deg.get(a) ?? 0) + 1)
    deg.set(b, (deg.get(b) ?? 0) + 1)
  }
  return [...deg.entries()].filter(([, d]) => d % 2 === 1).map(([id]) => id)
}


interface WingSoarViewProps {
  session: Session | null
  account: PointsAccount
  onRequireAuth: () => void
  onRoundComplete: (score: number, hits: number) => void
  onBack: () => void
}

export function WingSoarView({
  session,
  account,
  onRequireAuth,
  onRoundComplete,
  onBack,
}: WingSoarViewProps) {
  const { t } = useI18n()
  const [progress, setProgress] = useState<Progress>(() => loadProgress())
  const [levelId, setLevelId] = useState(1)
  const [phase, setPhase] = useState<Phase>('select')
  const [path, setPath] = useState<number[]>([])
  const [usedEdges, setUsedEdges] = useState<Set<string>>(() => new Set())
  const [trailPts, setTrailPts] = useState<{ x: number; y: number }[]>([])
  const [hoverNode, setHoverNode] = useState<number | null>(null)
  const [failMsg, setFailMsg] = useState<string | null>(null)
  const [unlockedCosmetic, setUnlockedCosmetic] = useState<string | null>(null)
  const [muted, setMuted] = useState(() => gameAudio.isMuted())
  const [volume, setVolume] = useState(() => gameAudio.getVolume())

  const phaseRef = useRef<Phase>('select')
  const pathRef = useRef<number[]>([])
  const usedRef = useRef<Set<string>>(new Set())
  const reported = useRef(false)
  const drawing = useRef(false)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const level = LEVELS[levelId - 1]
  const preferredStarts = useMemo(() => oddDegreeNodes(level), [level])

  const requiredKeys = useMemo(
    () => new Set(level.edges.map(([a, b]) => edgeKey(a, b))),
    [level],
  )

  const syncPhase = (p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }

  const resetBoard = useCallback(() => {
    pathRef.current = []
    usedRef.current = new Set()
    setPath([])
    setUsedEdges(new Set())
    setTrailPts([])
    setFailMsg(null)
    setUnlockedCosmetic(null)
    reported.current = false
    drawing.current = false
  }, [])

  const buildTrail = useCallback(
    (nodePath: number[]) => {
      const pts: { x: number; y: number }[] = []
      for (let i = 0; i < nodePath.length; i++) {
        const n = level.nodes.find((nd) => nd.id === nodePath[i])
        if (!n) continue
        if (i === 0) {
          pts.push({ x: n.x, y: n.y })
          continue
        }
        const prev = level.nodes.find((nd) => nd.id === nodePath[i - 1])
        if (!prev) continue
        const steps = 8
        for (let s = 1; s <= steps; s++) {
          const t = s / steps
          pts.push({
            x: prev.x + (n.x - prev.x) * t,
            y: prev.y + (n.y - prev.y) * t,
          })
        }
      }
      setTrailPts(pts)
    },
    [level],
  )

  const finishWin = useCallback(() => {
    if (reported.current) return
    reported.current = true
    syncPhase('won')
    gameAudio.stopBgm()
    gameAudio.playEnd(false)
    onRoundComplete(level.points, level.edges.length)

    const next: Progress = {
      unlockedMax: Math.min(5, Math.max(progress.unlockedMax, level.id + 1)),
      cleared: progress.cleared.includes(level.id)
        ? progress.cleared
        : [...progress.cleared, level.id],
      cosmetics: progress.cosmetics.includes(level.cosmeticKey)
        ? progress.cosmetics
        : [...progress.cosmetics, level.cosmeticKey],
    }
    setProgress(next)
    saveProgress(next)
    setUnlockedCosmetic(level.cosmeticKey)
  }, [level, onRoundComplete, progress])

  const softFail = useCallback(
    (msg: string) => {
      setFailMsg(msg)
      syncPhase('failed')
      drawing.current = false
      gameAudio.playMiss()
    },
    [],
  )

  const tryVisit = useCallback(
    (nextId: number) => {
      const p = pathRef.current
      if (p.length === 0) {
        pathRef.current = [nextId]
        setPath([nextId])
        buildTrail([nextId])
        syncPhase('drawing')
        gameAudio.playHit(10)
        return
      }
      const cur = p[p.length - 1]
      if (nextId === cur) return
      const key = edgeKey(cur, nextId)
      if (!requiredKeys.has(key)) {
        softFail(t('wingSoar.badEdge'))
        return
      }
      if (usedRef.current.has(key)) {
        softFail(t('wingSoar.reuseEdge'))
        return
      }
      const nextPath = [...p, nextId]
      const nextUsed = new Set(usedRef.current)
      nextUsed.add(key)
      pathRef.current = nextPath
      usedRef.current = nextUsed
      setPath(nextPath)
      setUsedEdges(nextUsed)
      buildTrail(nextPath)
      gameAudio.playHit(20)

      if (nextUsed.size >= requiredKeys.size) {
        finishWin()
        return
      }

      const hasMove = neighborsOf(level, nextId).some((nb) => {
        const k = edgeKey(nextId, nb)
        return requiredKeys.has(k) && !nextUsed.has(k)
      })
      if (!hasMove) {
        softFail(t('wingSoar.stuck'))
      }
    },
    [requiredKeys, buildTrail, softFail, t, finishWin, level],
  )

  const startLevel = useCallback(
    (id: number) => {
      if (!session) {
        onRequireAuth()
        return
      }
      if (id > progress.unlockedMax) return
      setLevelId(id)
      resetBoard()
      syncPhase('ready')
      void gameAudio.unlock().then(() => {
        gameAudio.playStart()
        gameAudio.startBgm()
      })
    },
    [session, onRequireAuth, progress.unlockedMax, resetBoard],
  )

  const restartLevel = useCallback(() => {
    resetBoard()
    syncPhase('ready')
    void gameAudio.unlock().then(() => {
      gameAudio.playStart()
      gameAudio.startBgm()
    })
  }, [resetBoard])

  useEffect(
    () => () => {
      gameAudio.stopBgm()
    },
    [],
  )

  const clientToSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return null
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const local = pt.matrixTransform(ctm.inverse())
    return { x: local.x, y: local.y }
  }

  const hitNode = (x: number, y: number): number | null => {
    const R = 7
    let best: number | null = null
    let bestD = R
    for (const n of level.nodes) {
      const d = Math.hypot(n.x - x, n.y - y)
      if (d <= bestD) {
        bestD = d
        best = n.id
      }
    }
    return best
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (phaseRef.current !== 'ready' && phaseRef.current !== 'drawing') return
    const local = clientToSvg(e.clientX, e.clientY)
    if (!local) return
    const id = hitNode(local.x, local.y)
    if (id == null) return
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    drawing.current = true
    tryVisit(id)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const local = clientToSvg(e.clientX, e.clientY)
    if (!local) return
    const id = hitNode(local.x, local.y)
    setHoverNode(id)
    if (!drawing.current) return
    if (phaseRef.current !== 'drawing' && phaseRef.current !== 'ready') return
    if (id != null) tryVisit(id)
  }

  const onPointerUp = () => {
    drawing.current = false
  }

  const onNodeTap = (id: number) => {
    if (phaseRef.current === 'ready' || phaseRef.current === 'drawing') {
      tryVisit(id)
    }
  }

  if (!session) {
    return (
      <section className="hawk-card mx-auto max-w-lg px-6 py-14 text-center">
        <Lock className="mx-auto mb-3 h-10 w-10 text-hawk-gold" />
        <h1 className="text-2xl font-bold text-hawk-cream">{t('wingSoar.title')}</h1>
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

  const covered = usedEdges.size
  const totalEdges = level.edges.length

  return (
    <section className="relative">
      <GameHubLeaveButton
        onLeave={() => {
          gameAudio.stopBgm()
          syncPhase('select')
          onBack()
        }}
      />

      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-hawk-gold">
            <Feather className="h-3.5 w-3.5" />
            {t('wingSoar.badge')}
          </p>
          <h1 className="text-2xl font-bold text-hawk-cream sm:text-3xl">{t('wingSoar.title')}</h1>
          <p className="mt-2 max-w-xl text-sm text-hawk-muted">{t('wingSoar.subtitle')}</p>
        </div>
        <div className="rounded-xl border border-hawk-gold/30 bg-hawk-gold/10 px-4 py-3 text-right">
          <p className="text-xs text-hawk-muted">{t('game.totalPoints')}</p>
          <p className="text-2xl font-bold text-hawk-gold">{account.total}</p>
        </div>
      </div>

      {phase === 'select' ? (
        <>
          <div className="mb-4 flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full border border-hawk-gold/40 bg-hawk-gold/10 px-2 py-1 text-hawk-gold">
              {t('wingSoar.rewardHint')}
            </span>
            <span className="rounded-full border border-hawk-border bg-hawk-panel px-2 py-1 text-hawk-muted">
              {t('wingSoar.tapHint')}
            </span>
          </div>
          <p className="mb-3 text-xs text-hawk-muted">{t('wingSoar.selectHint')}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {LEVELS.map((lv) => {
              const locked = lv.id > progress.unlockedMax
              const cleared = progress.cleared.includes(lv.id)
              return (
                <button
                  key={lv.id}
                  type="button"
                  disabled={locked}
                  onClick={() => startLevel(lv.id)}
                  className={`hawk-card flex flex-col p-4 text-left transition ${
                    locked
                      ? 'cursor-not-allowed opacity-50'
                      : 'hover:border-hawk-gold/50'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-hawk-gold">
                      {t('wingSoar.levelLabel', { n: lv.id })}
                    </span>
                    {locked ? (
                      <Lock className="h-4 w-4 text-hawk-muted" />
                    ) : cleared ? (
                      <span className="text-[10px] text-hawk-gold">{t('wingSoar.clearedBadge')}</span>
                    ) : null}
                  </div>
                  <h2 className="text-base font-bold text-hawk-cream">{t(lv.nameKey)}</h2>
                  <p className="mt-1 text-sm text-hawk-gold">+{lv.points} pts</p>
                  {cleared && progress.cosmetics.includes(lv.cosmeticKey) && (
                    <p className="mt-2 text-[11px] text-hawk-muted">{t(lv.cosmeticKey)}</p>
                  )}
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full border border-hawk-gold/40 bg-hawk-gold/10 px-2 py-1 text-hawk-gold">
                {t(level.nameKey)} · +{level.points}
              </span>
              <span className="rounded-full border border-hawk-border bg-hawk-panel px-2 py-1 text-hawk-muted">
                {t('wingSoar.edges', { n: covered, total: totalEdges })}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label
                className={`flex items-center gap-2 text-sm ${muted ? 'opacity-50' : 'text-hawk-cream'}`}
              >
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
                  if (!next && (phaseRef.current === 'drawing' || phaseRef.current === 'ready')) {
                    gameAudio.startBgm()
                  }
                  if (next) gameAudio.stopBgm()
                }}
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                {muted ? t('game.unmute') : t('game.mute')}
              </button>
              <button
                type="button"
                className="hawk-btn hawk-btn-ghost px-3 py-1.5 text-sm"
                onClick={() => {
                  gameAudio.stopBgm()
                  syncPhase('select')
                  resetBoard()
                }}
              >
                {t('wingSoar.levels')}
              </button>
            </div>
          </div>

          <div className="relative mx-auto max-w-lg">
            <div className="overflow-hidden rounded-2xl border border-hawk-gold/40 bg-gradient-to-b from-[#0b1a33] to-[#122848] shadow-lg">
              <svg
                ref={svgRef}
                viewBox="0 0 100 100"
                className="aspect-square w-full touch-none select-none"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                role="img"
                aria-label={t('wingSoar.board')}
              >
                {/* stars */}
                {[
                  [8, 12],
                  [22, 6],
                  [40, 9],
                  [70, 7],
                  [90, 14],
                  [15, 40],
                  [92, 55],
                  [6, 70],
                  [88, 80],
                  [55, 4],
                ].map(([sx, sy], i) => (
                  <circle
                    key={i}
                    cx={sx}
                    cy={sy}
                    r={i % 3 === 0 ? 0.7 : 0.45}
                    fill={i % 2 === 0 ? '#fbbf24' : '#93c5fd'}
                    opacity={0.7}
                  />
                ))}

                {/* required edges (ghost) */}
                {level.edges.map(([a, b]) => {
                  const na = level.nodes.find((n) => n.id === a)!
                  const nb = level.nodes.find((n) => n.id === b)!
                  const used = usedEdges.has(edgeKey(a, b))
                  return (
                    <line
                      key={`${a}-${b}`}
                      x1={na.x}
                      y1={na.y}
                      x2={nb.x}
                      y2={nb.y}
                      stroke={used ? '#fbbf24' : '#334155'}
                      strokeWidth={used ? 1.8 : 1.1}
                      strokeLinecap="round"
                      opacity={used ? 1 : 0.55}
                    />
                  )
                })}

                {/* feather trail */}
                {trailPts.length > 1 && (
                  <polyline
                    points={trailPts.map((p) => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke="#fde68a"
                    strokeWidth={1.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.95}
                  />
                )}
                {trailPts.map((p, i) =>
                  i % 3 === 0 ? (
                    <ellipse
                      key={`f-${i}`}
                      cx={p.x}
                      cy={p.y}
                      rx={1.2}
                      ry={0.55}
                      fill={i % 6 === 0 ? '#ffffff' : '#fbbf24'}
                      opacity={0.85}
                      transform={`rotate(${(i * 17) % 60} ${p.x} ${p.y})`}
                    />
                  ) : null,
                )}

                {/* cute eagle tip at path end */}
                {path.length > 0 &&
                  (() => {
                    const cur = level.nodes.find((n) => n.id === path[path.length - 1])!
                    return (
                      <g transform={`translate(${cur.x} ${cur.y})`}>
                        <circle r={3.2} fill="#6b3e26" stroke="#1a0f08" strokeWidth={0.4} />
                        <circle cx={2.2} cy={-1.2} r={2.4} fill="#fff" stroke="#1a0f08" strokeWidth={0.35} />
                        <circle cx={2.8} cy={-1.4} r={0.7} fill="#2563eb" />
                        <polygon points="4.4,-1.6 7.2,-0.6 4.4,0.2" fill="#f59e0b" />
                      </g>
                    )
                  })()}

                {/* nodes */}
                {level.nodes.map((n) => {
                  const onPath = path.includes(n.id)
                  const isCurrent = path.length > 0 && path[path.length - 1] === n.id
                  const isHover = hoverNode === n.id
                  const canStart = path.length === 0
                  const preferred =
                    canStart &&
                    (preferredStarts.length === 0 || preferredStarts.includes(n.id))
                  const adj =
                    path.length > 0 &&
                    neighborsOf(level, path[path.length - 1]).includes(n.id) &&
                    !usedEdges.has(edgeKey(path[path.length - 1], n.id))
                  const highlight = isCurrent || isHover || preferred || adj
                  return (
                    <g
                      key={n.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onNodeTap(n.id)
                      }}
                      className="cursor-pointer"
                    >
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r={highlight ? 5.2 : 4.4}
                        fill="#0f172a"
                        stroke="#fbbf24"
                        strokeWidth={highlight ? 1.4 : 1}
                      />
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r={2.6}
                        fill={isCurrent ? '#fbbf24' : onPath ? '#93c5fd' : '#64748b'}
                      />
                    </g>
                  )
                })}
              </svg>
            </div>

            {(phase === 'ready' || phase === 'drawing') && (
              <p className="mt-3 text-center text-xs text-hawk-muted">
                {phase === 'ready'
                  ? preferredStarts.length === 2
                    ? t('wingSoar.readyOdd')
                    : t('wingSoar.ready')
                  : t('wingSoar.drawingHint')}
              </p>
            )}

            {phase === 'ready' && path.length === 0 && (
              <div className="mt-3 flex justify-center gap-2">
                <button
                  type="button"
                  className="hawk-btn hawk-btn-ghost inline-flex items-center gap-2 px-5 py-2.5"
                  onClick={() => {
                    gameAudio.stopBgm()
                    syncPhase('select')
                    resetBoard()
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('wingSoar.levels')}
                </button>
                <button
                  type="button"
                  className="hawk-btn hawk-btn-primary inline-flex items-center gap-2 px-5 py-2.5"
                  onClick={() => void gameAudio.unlock()}
                >
                  <Play className="h-4 w-4" />
                  {t('wingSoar.start')}
                </button>
              </div>
            )}

            {phase === 'failed' && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-black/60 p-6 text-center backdrop-blur-[2px]">
                <p className="text-lg font-bold text-hawk-cream">{t('wingSoar.softFail')}</p>
                <p className="mt-2 text-sm text-hawk-muted">{failMsg}</p>
                <button
                  type="button"
                  className="hawk-btn hawk-btn-primary mt-5 inline-flex items-center gap-2 px-5 py-2.5"
                  onClick={restartLevel}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t('wingSoar.retry')}
                </button>
                <button
                  type="button"
                  className="hawk-btn hawk-btn-ghost mt-3 inline-flex items-center gap-2 px-5 py-2.5"
                  onClick={() => {
                    gameAudio.stopBgm()
                    syncPhase('select')
                    resetBoard()
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('wingSoar.levels')}
                </button>
              </div>
            )}

            {phase === 'won' && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-black/60 p-6 text-center backdrop-blur-[2px]">
                <img
                  src={asset('game/hawk-reward.jpg')}
                  alt=""
                  className="mb-3 h-24 w-full max-w-xs rounded-xl object-cover"
                />
                <p className="text-lg font-bold text-hawk-cream">{t('game.roundOver')}</p>
                <p className="mt-1 text-sm text-hawk-gold">{t('game.earned', { n: level.points })}</p>
                {unlockedCosmetic && (
                  <p className="mt-2 text-xs text-hawk-cream">{t('wingSoar.cosmeticUnlock', { name: t(unlockedCosmetic) })}</p>
                )}
                <p className="mt-2 text-xs text-hawk-muted">{t('game.totalNow', { n: account.total })}</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {level.id < 5 && progress.unlockedMax >= level.id + 1 && (
                    <button
                      type="button"
                      className="hawk-btn hawk-btn-primary inline-flex items-center gap-2 px-5 py-2.5"
                      onClick={() => startLevel(level.id + 1)}
                    >
                      <Play className="h-4 w-4" />
                      {t('wingSoar.nextLevel')}
                    </button>
                  )}
                  <button
                    type="button"
                    className="hawk-btn hawk-btn-primary inline-flex items-center gap-2 px-5 py-2.5"
                    onClick={restartLevel}
                  >
                    <RotateCcw className="h-4 w-4" />
                    {t('game.playAgain')}
                  </button>
                </div>
                <button
                  type="button"
                  className="hawk-btn hawk-btn-ghost mt-3 inline-flex items-center gap-2 px-5 py-2.5"
                  onClick={() => {
                    gameAudio.stopBgm()
                    syncPhase('select')
                    resetBoard()
                    onBack()
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('gameHub.leave')}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}
