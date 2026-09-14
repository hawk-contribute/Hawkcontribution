import { HAWK_TOKEN } from './donation'

const DEX_URL = `https://api.dexscreener.com/latest/dex/tokens/${HAWK_TOKEN.address}`
const CACHE_KEY = 'hawk-contribute:hawk-price-v1'
const CACHE_MS = 120_000
export const HAWK_PRICE_POLL_MS = 120_000

export type HawkPriceQuote = {
  ok: true
  priceUsd: number
  priceText: string
  change24h: number | null
  pairUrl: string
  dexId: string
  liquidityUsd: number
  updatedAt: string
}

export type HawkPriceResult =
  | HawkPriceQuote
  | { ok: false; error: string; updatedAt: string; pairUrl: string }

function formatPrice(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '—'
  if (n >= 1) return n.toFixed(4)
  if (n >= 0.01) return n.toFixed(5)
  // many HAWK decimals
  const s = n.toFixed(8).replace(/0+$/, '').replace(/\.$/, '')
  return s
}

function readCache(): HawkPriceResult | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as HawkPriceResult & { _cachedAt?: number }
    const at = Date.parse(parsed.updatedAt)
    if (!Number.isFinite(at) || Date.now() - at > CACHE_MS * 2) return parsed
    return parsed
  } catch {
    return null
  }
}

function writeCache(r: HawkPriceResult): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(r))
  } catch {
    /* ignore */
  }
}

export function cachedHawkPrice(): HawkPriceResult | null {
  return readCache()
}

export async function fetchHawkPrice(): Promise<HawkPriceResult> {
  const updatedAt = new Date().toISOString()
  const fallbackUrl = `https://dexscreener.com/bsc/${HAWK_TOKEN.address}`
  try {
    const res = await fetch(DEX_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as {
      pairs?: Array<{
        chainId?: string
        dexId?: string
        url?: string
        priceUsd?: string
        priceChange?: { h24?: number }
        liquidity?: { usd?: number }
      }>
    }
    const pairs = (data.pairs ?? []).filter(
      (p) => (p.chainId || '').toLowerCase() === 'bsc' && p.priceUsd,
    )
    if (!pairs.length) {
      const miss: HawkPriceResult = {
        ok: false,
        error: 'no pairs',
        updatedAt,
        pairUrl: fallbackUrl,
      }
      writeCache(miss)
      return miss
    }
    pairs.sort(
      (a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0),
    )
    const best = pairs[0]
    const priceUsd = Number(best.priceUsd)
    if (!Number.isFinite(priceUsd)) throw new Error('bad price')
    const changeRaw = best.priceChange?.h24
    const change24h =
      typeof changeRaw === 'number' && Number.isFinite(changeRaw)
        ? changeRaw
        : null
    const quote: HawkPriceQuote = {
      ok: true,
      priceUsd,
      priceText: formatPrice(priceUsd),
      change24h,
      pairUrl: best.url || fallbackUrl,
      dexId: best.dexId || 'dex',
      liquidityUsd: best.liquidity?.usd ?? 0,
      updatedAt,
    }
    writeCache(quote)
    return quote
  } catch (e) {
    const cached = readCache()
    if (cached?.ok) return cached
    const fail: HawkPriceResult = {
      ok: false,
      error: e instanceof Error ? e.message : 'unavailable',
      updatedAt,
      pairUrl: fallbackUrl,
    }
    writeCache(fail)
    return fail
  }
}
