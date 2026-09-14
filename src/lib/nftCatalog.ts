import { NFT_CATALOG as STATIC_CATALOG } from '../data/nfts'
import type { NftDefinition } from '../types'
import { NFT_REDEEM_POINTS } from '../types'
import { supabase } from './supabase'
import { safeNftImagePath } from './safeUrl'

export type RewardSettings = {
  redeemPoints: number
}

export type NftCatalogSnapshot = {
  settings: RewardSettings
  catalog: NftDefinition[]
  fromCloud: boolean
}

type CatalogRow = {
  id: string
  image_path: string
  title: string
  blurb: string | null
  rarity: string
  required_points: number | null
  sort_order: number | null
  active: boolean | null
}

/** Map known static ids → i18n keys for optional overlay. */
const STATIC_I18N: Record<string, { titleKey: string; blurbKey: string }> = {
  'nft-eco-02-guardian': { titleKey: 'eco02', blurbKey: 'eco02' },
  'nft-the-aegis': { titleKey: 'aegis', blurbKey: 'aegis' },
  'nft-hawk-token-space': { titleKey: 'tokenSpace', blurbKey: 'tokenSpace' },
  'nft-sus-03-cyber': { titleKey: 'sus03', blurbKey: 'sus03' },
  'nft-token-grove': { titleKey: 'tokenGrove', blurbKey: 'tokenGrove' },
  'nft-empire-evolution': { titleKey: 'empire', blurbKey: 'empire' },
}

const RARITY_OK = new Set(['legendary', 'epic', 'rare', 'common'])

function normalizeRarity(raw: string | null | undefined): string {
  const k = (raw ?? 'rare').toLowerCase().trim()
  return RARITY_OK.has(k) ? k : 'rare'
}

function mapRow(row: CatalogRow, globalPoints: number): NftDefinition {
  const overlay = STATIC_I18N[row.id]
  const override =
    row.required_points == null || Number.isNaN(Number(row.required_points))
      ? null
      : Number(row.required_points)
  const image =
    safeNftImagePath(row.image_path) ??
    row.image_path.replace(/^\//, '')
  return {
    id: row.id,
    image,
    rarityKey: normalizeRarity(row.rarity),
    titleKey: overlay?.titleKey,
    blurbKey: overlay?.blurbKey,
    title: row.title || row.id,
    blurb: row.blurb ?? '',
    requiredPointsOverride: override,
    requiredPoints: override ?? globalPoints,
    sortOrder: row.sort_order ?? 0,
  }
}

function staticSnapshot(globalPoints = NFT_REDEEM_POINTS): NftCatalogSnapshot {
  return {
    settings: { redeemPoints: globalPoints },
    catalog: STATIC_CATALOG.map((n) => ({
      ...n,
      title: undefined,
      blurb: undefined,
      requiredPoints: n.requiredPoints || globalPoints,
      requiredPointsOverride: null,
    })),
    fromCloud: false,
  }
}

export async function fetchNftCatalog(): Promise<NftCatalogSnapshot> {
  try {
    const [settingsRes, catalogRes] = await Promise.all([
      supabase
        .from('reward_settings')
        .select('redeem_points')
        .eq('id', 1)
        .maybeSingle(),
      supabase
        .from('nft_catalog')
        .select(
          'id,image_path,title,blurb,rarity,required_points,sort_order,active',
        )
        .eq('active', true)
        .order('sort_order', { ascending: true }),
    ])

    if (settingsRes.error) {
      console.warn('[nftCatalog] settings', settingsRes.error.message)
    }
    if (catalogRes.error) {
      console.warn('[nftCatalog] catalog', catalogRes.error.message)
    }

    const redeemPoints =
      typeof settingsRes.data?.redeem_points === 'number' &&
      settingsRes.data.redeem_points > 0
        ? settingsRes.data.redeem_points
        : NFT_REDEEM_POINTS

    const rows = (catalogRes.data as CatalogRow[] | null) ?? []
    if (!rows.length) {
      return staticSnapshot(redeemPoints)
    }

    const catalog = rows
      .map((r) => mapRow(r, redeemPoints))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

    return {
      settings: { redeemPoints },
      catalog,
      fromCloud: true,
    }
  } catch (e) {
    console.warn('[nftCatalog] fetch failed', e)
    return staticSnapshot()
  }
}

export async function updateRedeemPoints(points: number): Promise<void> {
  const n = Math.max(1, Math.floor(points))
  const { error } = await supabase
    .from('reward_settings')
    .update({ redeem_points: n })
    .eq('id', 1)
  if (error) throw new Error(error.message)
}


const NFT_BUCKET = 'nft-rewards'
const MAX_NFT_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_NFT_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

function safeFileBase(name: string): string {
  const base = name.split(/[/\\]/).pop() || 'image'
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-')
  return cleaned.slice(0, 80) || 'image'
}

/** Upload admin NFT image to public bucket; returns public https URL. */
export async function uploadNftRewardImage(
  nftId: string,
  file: File,
): Promise<string> {
  const id = nftId.trim().toLowerCase()
  if (!/^[a-z0-9][a-z0-9_-]{1,62}$/.test(id)) {
    throw new Error('INVALID_ID')
  }
  if (!ALLOWED_NFT_MIME.has(file.type)) {
    throw new Error('INVALID_FILE_TYPE')
  }
  if (file.size <= 0 || file.size > MAX_NFT_IMAGE_BYTES) {
    throw new Error('INVALID_FILE_SIZE')
  }
  const path = `${id}/${Date.now()}-${safeFileBase(file.name)}`
  const { error } = await supabase.storage
    .from(NFT_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw new Error(error.message || 'UPLOAD_FAILED')
  const { data } = supabase.storage.from(NFT_BUCKET).getPublicUrl(path)
  const url = safeNftImagePath(data.publicUrl)
  if (!url) throw new Error('INVALID_IMAGE')
  return url
}

export type NftUpsertInput = {
  id: string
  title: string
  blurb: string
  rarity: string
  imagePath: string
  requiredPoints: number | null
  sortOrder: number
}

export async function upsertNftCatalogItem(
  input: NftUpsertInput,
): Promise<void> {
  const id = input.id.trim().toLowerCase()
  if (!/^[a-z0-9][a-z0-9_-]{1,62}$/.test(id)) {
    throw new Error('INVALID_ID')
  }
  const image = safeNftImagePath(input.imagePath)
  if (!image) throw new Error('INVALID_IMAGE')
  const rarity = normalizeRarity(input.rarity)
  const title = input.title.trim()
  if (!title) throw new Error('INVALID_TITLE')

  const { error } = await supabase.from('nft_catalog').upsert(
    {
      id,
      title,
      blurb: input.blurb.trim() || null,
      rarity,
      image_path: image,
      required_points: input.requiredPoints,
      sort_order: Math.floor(input.sortOrder) || 0,
      active: true,
    },
    { onConflict: 'id' },
  )
  if (error) throw new Error(error.message)
}

export async function deleteNftCatalogItem(id: string): Promise<void> {
  const { error } = await supabase.from('nft_catalog').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Resolve display title: i18n overlay if known, else DB title. */
export function resolveNftTitle(
  nft: NftDefinition,
  t: (key: string) => string,
): string {
  if (nft.titleKey) {
    const key = `rewards.nft.${nft.titleKey}.title`
    const translated = t(key)
    if (translated !== key) return translated
  }
  return nft.title || nft.id
}

export function resolveNftBlurb(
  nft: NftDefinition,
  t: (key: string) => string,
): string {
  if (nft.blurbKey) {
    const key = `rewards.nft.${nft.blurbKey}.blurb`
    const translated = t(key)
    if (translated !== key) return translated
  }
  return nft.blurb || ''
}
