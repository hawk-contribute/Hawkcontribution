import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import {
  Egg,
  Feather,
  Heart,
  Lock,
  ShoppingBag,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react'
import type { PointsAccount, Session } from '../types'
import { useI18n } from '../i18n'
import { gameAudio } from '../lib/gameAudio'
import {
  CARE_COOLDOWN_MS,
  COURTYARD_SLOTS,
  DECOR_CATALOG,
  DROP_DELAY_MS,
  EGG_AUTO_MS,
  HATCH_DAY_POINTS,
  ITEMS_PER_HATCH,
  MAX_CHICKS,
  MAX_EGGS,
  MAX_NEST_ITEMS,
  clampToNest,
  inNest,
  loadHatchDaySave,
  newId,
  nextCourtyardSlot,
  percentToView,
  randomNestPoint,
  saveHatchDaySave,
  type CareKind,
  type DecorId,
  type HatchDaySave,
  type HatchTool,
  type NestItemKind,
} from '../lib/hatchDay'
import {
  Cabin,
  ChickSprite,
  DecorSprite,
  EggSprite,
  LuckyFeatherSprite,
  NestBowl,
  NestItemSprite,
  PapaEagle,
  SceneMountains,
} from './HatchDayArt'
import { GameHubLeaveButton } from './GameHubLeaveButton'

interface HatchDayViewProps {
  session: Session | null
  account: PointsAccount
  onRequireAuth: () => void
  onRoundComplete: (score: number, hits: number) => void
  onBack: () => void
}

export function HatchDayView({
  session,
  account,
  onRequireAuth,
  onRoundComplete,
  onBack,
}: HatchDayViewProps) {
  const { t } = useI18n()
  const [save, setSave] = useState<HatchDaySave>(() => loadHatchDaySave())
  const [tool, setTool] = useState<HatchTool>('feather')
  const [hint, setHint] = useState<string | null>(null)
  const [shopOpen, setShopOpen] = useState(false)
  const [muted, setMuted] = useState(() => gameAudio.isMuted())
  const [volume, setVolume] = useState(() => gameAudio.getVolume())
  const sceneRef = useRef<HTMLDivElement | null>(null)
  const saveRef = useRef(save)
  const hintTimer = useRef<number | null>(null)
  const hatchingRef = useRef(new Set<string>())

  useEffect(() => {
    saveRef.current = save
  }, [save])

  const patch = useCallback((updater: (prev: HatchDaySave) => HatchDaySave) => {
    setSave((prev) => {
      const next = updater(prev)
      saveRef.current = next
      saveHatchDaySave(next)
      return next
    })
  }, [])

  const showHint = useCallback((key: string, vars?: Record<string, string | number>) => {
    setHint(t(key, vars))
    if (hintTimer.current != null) window.clearTimeout(hintTimer.current)
    hintTimer.current = window.setTimeout(() => setHint(null), 2600)
  }, [t])


  const award = useCallback(
    (score: number, hits: number) => {
      if (!session || score <= 0) return
      onRoundComplete(score, hits)
    },
    [session, onRoundComplete],
  )

  const maybeLayEgg = useCallback((state: HatchDaySave): HatchDaySave => {
    let next = state
    while (
      next.chicks.length + next.eggs.length < MAX_CHICKS &&
      next.eggs.length < MAX_EGGS
    ) {
      const unused = next.items.filter((it) => !it.consumed)
      if (unused.length < ITEMS_PER_HATCH) break
      const usedIds = new Set(unused.slice(0, ITEMS_PER_HATCH).map((it) => it.id))
      const pos = randomNestPoint(0.4)
      next = {
        ...next,
        items: next.items.map((it) => (usedIds.has(it.id) ? { ...it, consumed: true } : it)),
        eggs: [...next.eggs, { id: newId('egg'), x: pos.x, y: pos.y, laidAt: Date.now() }],
      }
    }
    return next
  }, [])

  const hatchEgg = useCallback(
    (eggId: string) => {
      if (hatchingRef.current.has(eggId)) return
      const egg = saveRef.current.eggs.find((e) => e.id === eggId)
      if (!egg) return
      hatchingRef.current.add(eggId)
      const pos = randomNestPoint(0.5)
      patch((prev) => {
        if (!prev.eggs.some((e) => e.id === eggId)) return prev
        return {
          ...prev,
          eggs: prev.eggs.filter((e) => e.id !== eggId),
          chicks: [
            ...prev.chicks,
            {
              id: newId('chick'),
              x: pos.x,
              y: pos.y,
              hue: 16 + Math.random() * 24,
              mood: 'happy',
              lastCareAt: 0,
              dropAt: null,
            },
          ],
          hatched: prev.hatched + 1,
        }
      })
      gameAudio.playEnd(false)
      award(HATCH_DAY_POINTS.hatch, 1)
      showHint('hatchDay.hatchedMsg', { n: HATCH_DAY_POINTS.hatch })
    },
    [award, patch, showHint],
  )

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now()
      const ripe = saveRef.current.eggs.filter((e) => now - e.laidAt >= EGG_AUTO_MS)
      for (const egg of ripe) hatchEgg(egg.id)

      patch((prev) => {
        const drops = [...prev.drops]
        let changed = false
        const chicks = prev.chicks.map((c) => {
          if (c.dropAt != null && now >= c.dropAt && !drops.some((d) => d.chickId === c.id)) {
            changed = true
            const p = clampToNest(c.x + 4, c.y - 8)
            drops.push({ id: newId('drop'), x: p.x, y: p.y, chickId: c.id })
            return { ...c, dropAt: null, mood: 'happy' as const }
          }
          return c
        })
        if (!changed) return prev
        return { ...prev, chicks, drops }
      })
    }, 400)
    return () => window.clearInterval(id)
  }, [hatchEgg, patch])

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now()
      patch((prev) => {
        let changed = false
        const chicks = prev.chicks.map((c) => {
          const wander = {
            ...c,
            x: c.x + (Math.random() - 0.5) * 6,
            y: c.y + (Math.random() - 0.5) * 3,
            mood: now - c.lastCareAt > 2400 && c.mood !== 'idle' ? 'idle' : c.mood,
          }
          const clamped = clampToNest(wander.x, wander.y)
          wander.x = clamped.x
          wander.y = clamped.y
          if (wander.x !== c.x || wander.y !== c.y || wander.mood !== c.mood) changed = true
          return wander
        })
        if (!changed) return prev
        return { ...prev, chicks }
      })
    }, 2600)
    return () => window.clearInterval(id)
  }, [patch])

  useEffect(
    () => () => {
      if (hintTimer.current != null) window.clearTimeout(hintTimer.current)
      gameAudio.stopBgm()
    },
    [],
  )

  const scenePoint = (e: ReactPointerEvent<HTMLElement>) => {
    const el = sceneRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return null
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    }
  }

  const placeItem = (kind: NestItemKind, x: number, y: number) => {
    if (!inNest(x, y)) {
      showHint('hatchDay.needItems')
      return
    }
    if (saveRef.current.items.length >= MAX_NEST_ITEMS) {
      showHint('hatchDay.nestFull')
      return
    }
    const pos = clampToNest(x, y)
    void gameAudio.unlock().then(() => {
      gameAudio.playHit(8)
      gameAudio.startBgm()
    })
    patch((prev) =>
      maybeLayEgg({
        ...prev,
        items: [
          ...prev.items,
          {
            id: newId(kind),
            kind,
            x: pos.x,
            y: pos.y,
            rot: (Math.random() - 0.5) * 50,
            consumed: false,
          },
        ],
      }),
    )
    showHint('hatchDay.placed')
  }

  const onScenePointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    if (tool !== 'feather' && tool !== 'toy') return
    const pt = scenePoint(e)
    if (!pt) return
    placeItem(tool, pt.x, pt.y)
  }

  const careChick = (chickId: string, kind: CareKind) => {
    const chick = saveRef.current.chicks.find((c) => c.id === chickId)
    if (!chick) return
    const now = Date.now()
    if (now - chick.lastCareAt < CARE_COOLDOWN_MS) {
      showHint('hatchDay.busyChick')
      return
    }
    void gameAudio.unlock().then(() => gameAudio.playCatch(10))
    patch((prev) => ({
      ...prev,
      chicks: prev.chicks.map((c) =>
        c.id === chickId
          ? { ...c, mood: kind, lastCareAt: now, dropAt: now + DROP_DELAY_MS }
          : c,
      ),
    }))
    showHint(kind === 'feed' ? 'hatchDay.caredFeed' : 'hatchDay.caredPreen')
  }

  const collectDrop = (dropId: string) => {
    const drop = saveRef.current.drops.find((d) => d.id === dropId)
    if (!drop) return
    void gameAudio.unlock().then(() => gameAudio.playHit(HATCH_DAY_POINTS.collect))
    patch((prev) => ({
      ...prev,
      drops: prev.drops.filter((d) => d.id !== dropId),
      feathers: prev.feathers + 1,
      collected: prev.collected + 1,
    }))
    award(HATCH_DAY_POINTS.collect, 1)
    showHint('hatchDay.collectedMsg', { n: HATCH_DAY_POINTS.collect })
  }

  const buyDecor = (decorId: DecorId) => {
    const def = DECOR_CATALOG.find((d) => d.id === decorId)
    if (!def) return
    if (saveRef.current.courtyard.some((d) => d.decorId === decorId)) {
      showHint('hatchDay.owned')
      return
    }
    if (saveRef.current.feathers < def.cost) {
      showHint('hatchDay.needFeathers')
      return
    }
    const slot = nextCourtyardSlot(saveRef.current)
    if (slot == null) {
      showHint('hatchDay.slotFull')
      return
    }
    void gameAudio.unlock().then(() => gameAudio.playEnd(false))
    patch((prev) => ({
      ...prev,
      feathers: prev.feathers - def.cost,
      courtyard: [...prev.courtyard, { id: newId('decor'), decorId, slot }],
    }))
    award(HATCH_DAY_POINTS.decor, 1)
    showHint('hatchDay.bought', { name: t(def.nameKey), n: HATCH_DAY_POINTS.decor })
    setShopOpen(false)
    setTool(null)
  }

  if (!session) {
    return (
      <section className="hawk-card mx-auto max-w-lg px-6 py-14 text-center">
        <Lock className="mx-auto mb-3 h-10 w-10 text-hawk-gold" />
        <h1 className="text-2xl font-bold text-hawk-cream">{t('hatchDay.title')}</h1>
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

  const toolBtn = (id: HatchTool, label: string, icon: ReactNode) => (
    <button
      type="button"
      onClick={() => {
        if (id === 'shop') {
          setShopOpen((v) => !v)
          setTool('shop')
          return
        }
        setShopOpen(false)
        setTool(id)
      }}
      className={`hawk-btn px-3 py-2 text-xs sm:text-sm ${
        tool === id ? 'hawk-btn-primary' : 'hawk-btn-ghost text-hawk-cream'
      }`}
    >
      {icon}
      {label}
    </button>
  )

  return (
    <section className="relative">
      <GameHubLeaveButton
        onLeave={() => {
          gameAudio.stopBgm()
          onBack()
        }}
      />

      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-hawk-gold">
            <Egg className="h-3.5 w-3.5" />
            {t('hatchDay.badge')}
          </p>
          <h1 className="text-2xl font-bold text-hawk-cream sm:text-3xl">{t('hatchDay.title')}</h1>
          <p className="mt-2 max-w-xl text-sm text-hawk-muted">{t('hatchDay.subtitle')}</p>
        </div>
        <div className="rounded-xl border border-hawk-gold/30 bg-hawk-gold/10 px-4 py-3 text-right">
          <p className="text-xs text-hawk-muted">{t('game.totalPoints')}</p>
          <p className="text-2xl font-bold text-hawk-gold">{account.total}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-[11px]">
        <span className="rounded-full border border-hawk-gold/40 bg-hawk-gold/10 px-2 py-1 text-hawk-gold">
          {t('hatchDay.rewardHint')}
        </span>
        <span className="rounded-full border border-hawk-border bg-hawk-panel px-2 py-1 text-hawk-muted">
          {t('hatchDay.tapHint')}
        </span>
        <span className="rounded-full border border-hawk-border bg-hawk-panel px-2 py-1 text-hawk-muted">
          {t('hatchDay.noPressure')}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-hawk-muted">{t('hatchDay.loopHint')}</p>
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
              if (!next) gameAudio.startBgm()
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
          <p className="text-xs text-hawk-muted">{t('hatchDay.feathers')}</p>
          <p className="text-xl font-bold text-hawk-gold">{save.feathers}</p>
        </div>
        <div className="hawk-card px-3 py-3 text-center">
          <p className="text-xs text-hawk-muted">{t('hatchDay.chicks')}</p>
          <p className="text-xl font-bold text-hawk-cream">
            {save.chicks.length}/{MAX_CHICKS}
          </p>
        </div>
        <div className="hawk-card px-3 py-3 text-center">
          <p className="text-xs text-hawk-muted">{t('hatchDay.hatched')}</p>
          <p className="text-xl font-bold text-hawk-blue-bright">{save.hatched}</p>
        </div>
      </div>

      <div
        ref={sceneRef}
        className="hatch-scene relative mx-auto aspect-[400/220] w-full max-w-3xl overflow-hidden rounded-2xl border border-[#c9a07a]/40 shadow-[0_18px_40px_rgba(40,24,12,0.35)]"
        onPointerDown={onScenePointer}
        role="application"
        aria-label={t('hatchDay.scene')}
      >
        <div className="hatch-sky" />
        <div className="hatch-grain" />
        <svg viewBox="0 0 400 220" className="absolute inset-0 h-full w-full" aria-hidden>
          <SceneMountains />
          <Cabin x={18} y={78} scale={1} />
          {save.courtyard.map((d) => {
            const slot = COURTYARD_SLOTS[d.slot] ?? COURTYARD_SLOTS[0]
            const p = percentToView(slot.x, slot.y)
            return <DecorSprite key={d.id} id={d.decorId} x={p.x} y={p.y} />
          })}
          <NestBowl />
          {save.items.map((it) => {
            const p = percentToView(it.x, it.y)
            return <NestItemSprite key={it.id} kind={it.kind} x={p.x} y={p.y} rot={it.rot} />
          })}
          <PapaEagle x={304} y={118} scale={1} />
        </svg>

        {save.eggs.map((egg) => {
          return (
            <button
              key={egg.id}
              type="button"
              aria-label={t('hatchDay.egg')}
              title={t('hatchDay.eggHint')}
              className="absolute z-[2] -translate-x-1/2 -translate-y-1/2 rounded-full p-1"
              style={{ left: `${egg.x}%`, top: `${egg.y}%` }}
              onPointerDown={(ev) => {
                ev.stopPropagation()
                hatchEgg(egg.id)
              }}
            >
              <svg width="36" height="44" viewBox="-14 -18 28 36">
                <EggSprite x={0} y={0} />
              </svg>
            </button>
          )
        })}

        {save.chicks.map((chick) => (
          <button
            key={chick.id}
            type="button"
            aria-label={t('hatchDay.chick')}
            className="absolute z-[3] -translate-x-1/2 -translate-y-1/2 rounded-full p-0.5 transition-[left,top] duration-1000 ease-in-out"
            style={{ left: `${chick.x}%`, top: `${chick.y}%` }}
            onPointerDown={(ev) => {
              ev.stopPropagation()
              if (tool === 'feed' || tool === 'preen') careChick(chick.id, tool)
              else showHint('hatchDay.selectTool')
            }}
          >
            <svg width="44" height="48" viewBox="-18 -24 36 44">
              <ChickSprite x={0} y={0} hue={chick.hue} mood={chick.mood} />
            </svg>
          </button>
        ))}

        {save.drops.map((drop) => (
          <button
            key={drop.id}
            type="button"
            aria-label={t('hatchDay.luckyDrop')}
            className="absolute z-[4] -translate-x-1/2 -translate-y-1/2 rounded-full p-1"
            style={{ left: `${drop.x}%`, top: `${drop.y}%` }}
            onPointerDown={(ev) => {
              ev.stopPropagation()
              collectDrop(drop.id)
            }}
          >
            <svg width="28" height="36" viewBox="-10 -16 20 32">
              <LuckyFeatherSprite x={0} y={0} />
            </svg>
          </button>
        ))}

        <p className="pointer-events-none absolute left-3 top-3 max-w-[70%] rounded-full bg-[#3a2a1c]/45 px-3 py-1 text-[11px] text-[#f6f1e4] backdrop-blur-sm">
          {t('hatchDay.papa')}
        </p>

        {hint && (
          <p className="pointer-events-none absolute bottom-3 left-1/2 z-[5] w-[90%] -translate-x-1/2 rounded-full bg-[#3a2a1c]/70 px-3 py-1.5 text-center text-xs text-[#fff6d8] shadow-lg backdrop-blur-sm">
            {hint}
          </p>
        )}

        {shopOpen && (
          <div
            className="absolute inset-x-2 bottom-2 z-[6] max-h-[70%] overflow-auto rounded-2xl border border-[#e8c37a]/40 bg-[#3a2a1c]/88 p-3 shadow-xl backdrop-blur-md sm:inset-x-6"
            onPointerDown={(ev) => ev.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[#fff6d8]">{t('hatchDay.shop')}</p>
              <button
                type="button"
                className="text-xs text-[#e8d2a8] underline"
                onClick={() => setShopOpen(false)}
              >
                {t('hatchDay.closeShop')}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DECOR_CATALOG.map((d) => {
                const owned = save.courtyard.some((c) => c.decorId === d.id)
                return (
                  <button
                    key={d.id}
                    type="button"
                    disabled={owned}
                    onClick={() => buyDecor(d.id)}
                    className="rounded-xl border border-[#e8c37a]/30 bg-[#5a4030]/70 p-2 text-left disabled:opacity-50"
                  >
                    <svg width="48" height="40" viewBox="-20 -28 40 44" className="mx-auto">
                      <DecorSprite id={d.id} x={0} y={0} />
                    </svg>
                    <p className="mt-1 text-xs font-medium text-[#f6f1e4]">{t(d.nameKey)}</p>
                    <p className="text-[10px] text-[#e8c37a]">
                      {owned ? t('hatchDay.owned') : t('hatchDay.cost', { n: d.cost })}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="mx-auto mt-4 flex max-w-3xl flex-wrap justify-center gap-2">
        {toolBtn('feather', t('hatchDay.placeFeather'), <Feather className="h-3.5 w-3.5" />)}
        {toolBtn('toy', t('hatchDay.placeToy'), <Sparkles className="h-3.5 w-3.5" />)}
        {toolBtn('feed', t('hatchDay.feed'), <Heart className="h-3.5 w-3.5" />)}
        {toolBtn('preen', t('hatchDay.preen'), <Feather className="h-3.5 w-3.5" />)}
        {toolBtn('shop', t('hatchDay.shop'), <ShoppingBag className="h-3.5 w-3.5" />)}
      </div>
    </section>
  )
}
