import { SEEDED_OPPORTUNITIES } from '../data/opportunities'
import type { LocalizedString, LocalizedStringList, Locale } from '../i18n'
import type { Opportunity, OpportunityType } from '../types'
import { asset } from './asset'
import { supabase } from './supabase'

export type OpportunitiesSnapshot = {
  opportunities: Opportunity[]
  fromCloud: boolean
}

type OppRow = {
  id: string
  type: string
  image_path: string
  title: LocalizedString | Record<string, string>
  summary: LocalizedString | Record<string, string>
  host: LocalizedString | Record<string, string>
  location: LocalizedString | Record<string, string>
  deadline: string
  tags: LocalizedStringList | Record<string, string[]>
  status: string
  sort_order: number | null
  active: boolean | null
}

const LOCALES: Locale[] = ['en', 'zh-CN', 'zh-TW']
const TYPES = new Set<OpportunityType>(['event', 'collab', 'content'])
const STATUSES = new Set(['open', 'closing-soon', 'ongoing'])

/** Live title cache for contribution feed lookups (seed + last cloud fetch). */
const titleCache = new Map<string, LocalizedString>()

function seedTitleCache(list: Opportunity[]) {
  for (const o of list) titleCache.set(o.id, o.title)
}

seedTitleCache(SEEDED_OPPORTUNITIES)

export function resolveOpportunityTitle(
  opportunityId: string | null | undefined,
  preferred: Locale = 'zh-TW',
): string {
  if (!opportunityId) return ''
  const title = titleCache.get(opportunityId)
  if (!title) return opportunityId
  return title[preferred] || title['zh-TW'] || title.en || opportunityId
}

function emptyLocalized(): LocalizedString {
  return { en: '', 'zh-CN': '', 'zh-TW': '' }
}

function emptyLocalizedList(): LocalizedStringList {
  return { en: [], 'zh-CN': [], 'zh-TW': [] }
}

function asLocalized(
  raw: LocalizedString | Record<string, string> | null | undefined,
  fallback?: LocalizedString,
): LocalizedString {
  const base = fallback ?? emptyLocalized()
  const out = { ...base }
  if (!raw || typeof raw !== 'object') return out
  for (const loc of LOCALES) {
    const v = (raw as Record<string, string>)[loc]
    if (typeof v === 'string' && v.trim()) out[loc] = v
  }
  // Fill blanks from en / zh-TW
  const fill = out.en || out['zh-TW'] || out['zh-CN'] || ''
  for (const loc of LOCALES) {
    if (!out[loc]) out[loc] = fill
  }
  return out
}

function asLocalizedList(
  raw: LocalizedStringList | Record<string, string[]> | null | undefined,
  fallback?: LocalizedStringList,
): LocalizedStringList {
  const base = fallback ?? emptyLocalizedList()
  const out: LocalizedStringList = {
    en: [...base.en],
    'zh-CN': [...base['zh-CN']],
    'zh-TW': [...base['zh-TW']],
  }
  if (!raw || typeof raw !== 'object') return out
  for (const loc of LOCALES) {
    const v = (raw as Record<string, string[]>)[loc]
    if (Array.isArray(v)) {
      out[loc] = v.map((t) => String(t).trim()).filter(Boolean)
    }
  }
  const fill = out.en.length
    ? out.en
    : out['zh-TW'].length
      ? out['zh-TW']
      : out['zh-CN']
  for (const loc of LOCALES) {
    if (!out[loc].length) out[loc] = [...fill]
  }
  return out
}

/** Strip Vite base / absolute site prefix → store relative public path when possible. */
export function normalizeImagePath(raw: string): string {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  let path = trimmed.replace(/^\//, '')
  if (base && path.startsWith(base.replace(/^\//, ''))) {
    path = path.slice(base.replace(/^\//, '').length).replace(/^\//, '')
  }
  // asset() may have already prepended base without leading slash strip edge cases
  const marker = 'photos/'
  const idx = path.indexOf(marker)
  if (idx >= 0) return path.slice(idx)
  const rewards = path.indexOf('rewards/')
  if (rewards >= 0) return path.slice(rewards)
  return path
}

function mapRow(row: OppRow): Opportunity {
  const type = (TYPES.has(row.type as OpportunityType)
    ? row.type
    : 'content') as OpportunityType
  const status = (STATUSES.has(row.status)
    ? row.status
    : 'open') as Opportunity['status']
  const imagePath = normalizeImagePath(row.image_path) || row.image_path
  return {
    id: row.id,
    type,
    image: asset(imagePath),
    title: asLocalized(row.title),
    summary: asLocalized(row.summary),
    host: asLocalized(row.host),
    location: asLocalized(row.location),
    deadline: row.deadline || '',
    tags: asLocalizedList(row.tags),
    status,
  }
}

function staticSnapshot(): OpportunitiesSnapshot {
  seedTitleCache(SEEDED_OPPORTUNITIES)
  return { opportunities: SEEDED_OPPORTUNITIES, fromCloud: false }
}

export async function fetchOpportunities(): Promise<OpportunitiesSnapshot> {
  try {
    const { data, error } = await supabase
      .from('opportunities')
      .select(
        'id,type,image_path,title,summary,host,location,deadline,tags,status,sort_order,active',
      )
      .eq('active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.warn('[opportunitiesCloud] fetch', error.message)
      return staticSnapshot()
    }

    const rows = (data as OppRow[] | null) ?? []
    if (!rows.length) return staticSnapshot()

    const opportunities = rows.map(mapRow)
    seedTitleCache(opportunities)
    return { opportunities, fromCloud: true }
  } catch (e) {
    console.warn('[opportunitiesCloud] fetch failed', e)
    return staticSnapshot()
  }
}

export type OpportunityUpsertInput = {
  id: string
  type: OpportunityType
  imagePath: string
  title: LocalizedString
  summary: LocalizedString
  host: LocalizedString
  location: LocalizedString
  deadline: string
  tags: LocalizedStringList
  status: Opportunity['status']
  sortOrder?: number
}

function assertId(id: string): string {
  const cleaned = id.trim().toLowerCase()
  if (!/^[a-z0-9][a-z0-9_-]{1,62}$/.test(cleaned)) {
    throw new Error('INVALID_ID')
  }
  return cleaned
}

export async function upsertOpportunity(
  input: OpportunityUpsertInput,
): Promise<void> {
  const id = assertId(input.id)
  if (!TYPES.has(input.type)) throw new Error('INVALID_TYPE')
  if (!STATUSES.has(input.status)) throw new Error('INVALID_STATUS')
  const titleEn = input.title.en.trim()
  if (!titleEn && !input.title['zh-TW'].trim() && !input.title['zh-CN'].trim()) {
    throw new Error('INVALID_TITLE')
  }
  const imagePath = normalizeImagePath(input.imagePath)
  if (!imagePath) throw new Error('INVALID_IMAGE')

  const title = asLocalized(input.title)
  const summary = asLocalized(input.summary)
  const host = asLocalized(input.host)
  const location = asLocalized(input.location)
  const tags = asLocalizedList(input.tags)

  const { error } = await supabase.from('opportunities').upsert(
    {
      id,
      type: input.type,
      image_path: imagePath,
      title,
      summary,
      host,
      location,
      deadline: input.deadline.trim(),
      tags,
      status: input.status,
      sort_order: Math.floor(input.sortOrder ?? 0) || 0,
      active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )
  if (error) throw new Error(error.message)
  titleCache.set(id, title)
}

export async function deleteOpportunity(id: string): Promise<void> {
  const { error } = await supabase.from('opportunities').delete().eq('id', id)
  if (error) throw new Error(error.message)
  titleCache.delete(id)
}

/** Parse comma / # separated tags into a clean list. */
export function parseTagsInput(raw: string): string[] {
  return raw
    .split(/[,，#＃\n]+/)
    .map((t) => t.trim().replace(/^#+/, ''))
    .filter(Boolean)
}

export function tagsToInput(tags: string[]): string {
  return tags.join(', ')
}

/** Relative image path for admin forms (from Opportunity.image). */
export function opportunityImagePath(opp: Opportunity): string {
  return normalizeImagePath(opp.image) || opp.image
}
