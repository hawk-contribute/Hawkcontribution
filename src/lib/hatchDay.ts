/**
 * Papa Eagle’s Cozy Hatch Day — local nest save + point rules.
 *
 * Shared Hawk Games account points (via onRoundComplete / recordGameActivity):
 * - Hatch a chick: +15
 * - Collect a lucky feather: +10
 * - Place a courtyard decoration: +20
 * Feed / preen are cozy care only (they help chicks leave feathers) and do not
 * award account points, so tapping cannot be farmed.
 *
 * Lucky feathers (幸運羽毛) are an in-game currency spent on courtyard décor.
 * There are no fail states and no punishing timers — eggs auto-hatch if left be.
 */

export const HATCH_DAY_SAVE_KEY = 'hawk-contribute:hatch-day'

export const HATCH_DAY_POINTS = {
  hatch: 15,
  collect: 10,
  decor: 20,
} as const

export const ITEMS_PER_HATCH = 2
export const MAX_CHICKS = 6
export const MAX_EGGS = 2
export const MAX_NEST_ITEMS = 12
export const CARE_COOLDOWN_MS = 5200
export const DROP_DELAY_MS = 1600
export const EGG_AUTO_MS = 4200

export const NEST = { cx: 63, cy: 66, rx: 27, ry: 16 }

export type NestItemKind = 'feather' | 'toy'
export type CareKind = 'feed' | 'preen'
export type HatchTool = NestItemKind | CareKind | 'shop' | null

export type DecorId = 'lantern' | 'flowers' | 'chime' | 'wreath' | 'pond' | 'swing'

export interface NestItem {
  id: string
  kind: NestItemKind
  x: number
  y: number
  rot: number
  consumed: boolean
}

export interface HatchEgg {
  id: string
  x: number
  y: number
  laidAt: number
}

export interface HatchChick {
  id: string
  x: number
  y: number
  hue: number
  mood: 'idle' | 'feed' | 'preen' | 'happy'
  lastCareAt: number
  dropAt: number | null
}

export interface LuckyDrop {
  id: string
  x: number
  y: number
  chickId: string
}

export interface PlacedDecor {
  id: string
  decorId: DecorId
  slot: number
}

export interface HatchDaySave {
  v: 1
  items: NestItem[]
  eggs: HatchEgg[]
  chicks: HatchChick[]
  drops: LuckyDrop[]
  feathers: number
  hatched: number
  collected: number
  courtyard: PlacedDecor[]
}

export interface DecorDef {
  id: DecorId
  cost: number
  nameKey: string
}

export const DECOR_CATALOG: readonly DecorDef[] = [
  { id: 'lantern', cost: 6, nameKey: 'hatchDay.decorLantern' },
  { id: 'flowers', cost: 8, nameKey: 'hatchDay.decorFlowers' },
  { id: 'chime', cost: 10, nameKey: 'hatchDay.decorChime' },
  { id: 'wreath', cost: 12, nameKey: 'hatchDay.decorWreath' },
  { id: 'pond', cost: 14, nameKey: 'hatchDay.decorPond' },
  { id: 'swing', cost: 16, nameKey: 'hatchDay.decorSwing' },
]

export const emptySave = (): HatchDaySave => ({
  v: 1,
  items: [],
  eggs: [],
  chicks: [],
  drops: [],
  feathers: 0,
  hatched: 0,
  collected: 0,
  courtyard: [],
})

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function asNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function asString(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback
}

export function loadHatchDaySave(): HatchDaySave {
  try {
    const raw = localStorage.getItem(HATCH_DAY_SAVE_KEY)
    if (!raw) return emptySave()
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || parsed.v !== 1) return emptySave()
    const items: NestItem[] = Array.isArray(parsed.items)
      ? parsed.items.filter(isRecord).map((it, i) => {
          const kind: NestItemKind = it.kind === 'toy' ? 'toy' : 'feather'
          return {
            id: asString(it.id, `item-${i}`),
            kind,
            x: asNumber(it.x, NEST.cx),
            y: asNumber(it.y, NEST.cy),
            rot: asNumber(it.rot, 0),
            consumed: Boolean(it.consumed),
          }
        })
      : []
    const eggs = Array.isArray(parsed.eggs)
      ? parsed.eggs.filter(isRecord).map((it, i) => ({
          id: asString(it.id, `egg-${i}`),
          x: asNumber(it.x, NEST.cx),
          y: asNumber(it.y, NEST.cy),
          laidAt: asNumber(it.laidAt, Date.now()),
        }))
      : []
    const chicks: HatchChick[] = Array.isArray(parsed.chicks)
      ? parsed.chicks.filter(isRecord).map((it, i) => {
          const mood: HatchChick['mood'] =
            it.mood === 'feed' || it.mood === 'preen' || it.mood === 'happy' ? it.mood : 'idle'
          return {
            id: asString(it.id, `chick-${i}`),
            x: asNumber(it.x, NEST.cx),
            y: asNumber(it.y, NEST.cy),
            hue: asNumber(it.hue, 28),
            mood,
            lastCareAt: asNumber(it.lastCareAt, 0),
            dropAt: typeof it.dropAt === 'number' ? it.dropAt : null,
          }
        })
      : []
    const drops = Array.isArray(parsed.drops)
      ? parsed.drops.filter(isRecord).map((it, i) => ({
          id: asString(it.id, `drop-${i}`),
          x: asNumber(it.x, NEST.cx),
          y: asNumber(it.y, NEST.cy - 8),
          chickId: asString(it.chickId, ''),
        }))
      : []
    const courtyard: PlacedDecor[] = Array.isArray(parsed.courtyard)
      ? parsed.courtyard.filter(isRecord).flatMap((it, i) => {
          const raw = it.decorId
          const decorId: DecorId | null =
            raw === 'lantern' ||
            raw === 'flowers' ||
            raw === 'chime' ||
            raw === 'wreath' ||
            raw === 'pond' ||
            raw === 'swing'
              ? raw
              : null
          if (!decorId) return []
          return [
            {
              id: asString(it.id, `decor-${i}`),
              decorId,
              slot: Math.max(0, Math.min(5, Math.floor(asNumber(it.slot, i)))),
            },
          ]
        })
      : []
    return {
      v: 1,
      items: items.slice(0, MAX_NEST_ITEMS),
      eggs: eggs.slice(0, MAX_EGGS),
      chicks: chicks.slice(0, MAX_CHICKS),
      drops,
      feathers: Math.max(0, Math.floor(asNumber(parsed.feathers, 0))),
      hatched: Math.max(0, Math.floor(asNumber(parsed.hatched, 0))),
      collected: Math.max(0, Math.floor(asNumber(parsed.collected, 0))),
      courtyard: courtyard.slice(0, DECOR_CATALOG.length),
    }
  } catch {
    return emptySave()
  }
}

export function saveHatchDaySave(save: HatchDaySave): void {
  try {
    localStorage.setItem(HATCH_DAY_SAVE_KEY, JSON.stringify(save))
  } catch {
    /* ignore quota */
  }
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function inNest(x: number, y: number): boolean {
  const dx = (x - NEST.cx) / NEST.rx
  const dy = (y - NEST.cy) / NEST.ry
  return dx * dx + dy * dy <= 1
}

export function clampToNest(x: number, y: number): { x: number; y: number } {
  const dx = x - NEST.cx
  const dy = y - NEST.cy
  const mag = Math.hypot(dx / NEST.rx, dy / NEST.ry)
  if (mag <= 0.92) return { x, y }
  const scale = 0.92 / (mag || 1)
  return { x: NEST.cx + dx * scale, y: NEST.cy + dy * scale }
}

export function randomNestPoint(spread = 0.55): { x: number; y: number } {
  const t = Math.random() * Math.PI * 2
  const r = Math.sqrt(Math.random()) * spread
  return {
    x: NEST.cx + Math.cos(t) * NEST.rx * r,
    y: NEST.cy + Math.sin(t) * NEST.ry * r,
  }
}

export function nextCourtyardSlot(save: HatchDaySave): number | null {
  const used = new Set(save.courtyard.map((d) => d.slot))
  for (let i = 0; i < DECOR_CATALOG.length; i++) {
    if (!used.has(i)) return i
  }
  return null
}

export const COURTYARD_SLOTS: { x: number; y: number }[] = [
  { x: 11, y: 72 },
  { x: 20, y: 78 },
  { x: 29, y: 73 },
  { x: 14, y: 84 },
  { x: 24, y: 86 },
  { x: 34, y: 82 },
]

export function percentToView(xPct: number, yPct: number): { x: number; y: number } {
  return { x: (xPct / 100) * 400, y: (yPct / 100) * 220 }
}
