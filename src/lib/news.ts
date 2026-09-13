import { supabase } from './supabase'
import { safeHttpUrl } from './safeUrl'
export { NEWS_SOURCE, NEWS_WINDOW_DAYS, NEWS_EMPTY_COOLDOWN_MS } from './newsSource'
import {
  NEWS_SOURCE,
  NEWS_WINDOW_DAYS,
  NEWS_EMPTY_COOLDOWN_MS,
  NEWS_CACHE_KEY,
  NEWS_SESSION_ATTEMPTED_KEY,
} from './newsSource'

export type NewsPost = {
  id: string
  url: string
  publishedAt: string
  text: string
  authorHandle?: string
  source?: string
}

export type NewsLoadResult = {
  status: 'posts' | 'empty' | 'unavailable'
  posts: NewsPost[]
  source: 'supabase' | 'syndication' | 'rss' | 'none'
  fetchedAt: string
  fromCache: boolean
  cooldownUntil: string | null
}

export type NewsUpsertInput = {
  id: string
  url: string
  body: string
  publishedAt: string
  authorHandle?: string
  source?: string
}

type CachePayload = {
  version: 3
  fetchedAt: string
  status: 'posts' | 'empty' | 'unavailable'
  source: NewsLoadResult['source']
  posts: NewsPost[]
}

export function filterPostsLastDays(
  posts: NewsPost[],
  days = NEWS_WINDOW_DAYS,
  now = Date.now(),
): NewsPost[] {
  const cutoff = now - days * 24 * 60 * 60 * 1000
  return posts
    .filter((p) => {
      const t = Date.parse(p.publishedAt)
      return Number.isFinite(t) && t >= cutoff
    })
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
}

function readCache(): CachePayload | null {
  try {
    const raw = localStorage.getItem(NEWS_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachePayload
    if (!parsed || parsed.version !== 3) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(payload: CachePayload): void {
  try {
    localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

export function clearNewsSessionAttempt(): void {
  try {
    sessionStorage.removeItem(NEWS_SESSION_ATTEMPTED_KEY)
  } catch {
    /* ignore */
  }
}

function markSessionAttempted(): void {
  try {
    sessionStorage.setItem(NEWS_SESSION_ATTEMPTED_KEY, '1')
  } catch {
    /* ignore */
  }
}

function sessionAlreadyAttempted(): boolean {
  try {
    return sessionStorage.getItem(NEWS_SESSION_ATTEMPTED_KEY) === '1'
  } catch {
    return false
  }
}

function cooldownRemaining(cache: CachePayload, now = Date.now()): number {
  const age = now - Date.parse(cache.fetchedAt)
  if (cache.status === 'posts' && cache.posts.length > 0) {
    // Soft TTL for positive cloud hits — still allow remount from cache
    return Math.max(0, 5 * 60 * 1000 - age)
  }
  return Math.max(0, NEWS_EMPTY_COOLDOWN_MS - age)
}


function coerceIsoDate(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const direct = Date.parse(trimmed)
  if (Number.isFinite(direct)) return new Date(direct).toISOString()
  // Twitter-style: "8:07 AM · Aug 23, 2026"
  const m = trimmed.match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)\s*[·.•]\s*([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})$/i,
  )
  if (m) {
    const [, hh, mm, ap, mon, day, year] = m
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    }
    const mi = months[mon.toLowerCase()]
    if (mi == null) return null
    let h = Number(hh) % 12
    if (ap.toUpperCase() === 'PM') h += 12
    const d = new Date(Date.UTC(Number(year), mi, Number(day), h, Number(mm)))
    if (Number.isNaN(d.getTime())) return null
    return d.toISOString()
  }
  return null
}

function idFromUrl(url: string): string | null {
  const m = url.match(/status\/(\d+)/)
  return m?.[1] ?? null
}

type NewsRow = {
  id: string
  url: string
  published_at: string
  body: string
  author_handle: string | null
  source: string | null
}

function mapRow(row: NewsRow): NewsPost {
  return {
    id: row.id,
    url: row.url,
    publishedAt: row.published_at,
    text: row.body,
    authorHandle: row.author_handle ?? NEWS_SOURCE.handleAt,
    source: row.source ?? 'supabase',
  }
}

/** Public read of pasted/cloud news for the last N days. */
export async function fetchNewsFromSupabase(): Promise<NewsPost[]> {
  const cutoff = new Date(
    Date.now() - NEWS_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString()
  const { data, error } = await supabase
    .from('news_posts')
    .select('id,url,published_at,body,author_handle,source')
    .gte('published_at', cutoff)
    .order('published_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return ((data as NewsRow[]) ?? []).map(mapRow)
}

export async function upsertNewsPost(input: NewsUpsertInput): Promise<void> {
  const id = input.id.trim() || idFromUrl(input.url) || ''
  if (!id) throw new Error('MISSING_ID')
  const body = input.body.trim()
  if (!body) throw new Error('EMPTY_BODY')
  const fallback = `https://x.com/${NEWS_SOURCE.handle}/status/${id}`
  const url = safeHttpUrl(input.url.trim() || fallback) ?? safeHttpUrl(fallback)
  if (!url) throw new Error('INVALID_URL')
  const publishedAt =
    coerceIsoDate(input.publishedAt) || new Date().toISOString()
  const { error } = await supabase.from('news_posts').upsert(
    {
      id,
      url,
      published_at: publishedAt,
      body,
      author_handle: input.authorHandle?.trim() || NEWS_SOURCE.handle,
      source: input.source?.trim() || 'admin-paste',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )
  if (error) throw error
}

export async function deleteNewsPost(id: string): Promise<void> {
  const { error } = await supabase.from('news_posts').delete().eq('id', id)
  if (error) throw error
}

export async function upsertNewsPostsBatch(
  items: NewsUpsertInput[],
): Promise<number> {
  let n = 0
  for (const item of items) {
    await upsertNewsPost(item)
    n += 1
  }
  return n
}

/** Optional: import from a JSON file shape [{id,url,publishedAt|published_at,body|text,authorHandle?}]. */
export function parseNewsImportJson(raw: string): NewsUpsertInput[] {
  const data = JSON.parse(raw) as unknown
  const list = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { posts?: unknown }).posts)
      ? ((data as { posts: unknown[] }).posts)
      : null
  if (!list) throw new Error('INVALID_JSON')
  const out: NewsUpsertInput[] = []
  for (const row of list) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const id = String(o.id ?? idFromUrl(String(o.url ?? '')) ?? '').trim()
    const body = String(o.body ?? o.text ?? '').trim()
    const url = String(o.url ?? '').trim()
    const publishedRaw = String(
      o.publishedAt ?? o.published_at ?? o.created_at ?? '',
    ).trim()
    const publishedAt = coerceIsoDate(publishedRaw)
    if (!id || !body || !publishedAt) continue
    out.push({
      id,
      url: url || `https://x.com/${NEWS_SOURCE.handle}/status/${id}`,
      body,
      publishedAt,
      authorHandle: String(o.authorHandle ?? o.author_handle ?? NEWS_SOURCE.handle),
      source: String(o.source ?? 'import'),
    })
  }
  return out
}

/**
 * Load news: Supabase first. Third-party scrape only as a light one-shot
 * when cloud is empty and not in cooldown — never invents posts.
 */
export async function loadNews(options?: {
  force?: boolean
  allowScrape?: boolean
}): Promise<NewsLoadResult> {
  const force = options?.force ?? false
  const allowScrape = options?.allowScrape ?? false
  const now = Date.now()
  const cache = readCache()

  if (cache && !force) {
    const remain = cooldownRemaining(cache, now)
    const posts = filterPostsLastDays(cache.posts)
    if (cache.status === 'posts' && posts.length > 0) {
      return {
        status: 'posts',
        posts,
        source: cache.source,
        fetchedAt: cache.fetchedAt,
        fromCache: true,
        cooldownUntil: remain > 0 ? new Date(now + remain).toISOString() : null,
      }
    }
    if (
      (cache.status === 'empty' || cache.status === 'unavailable') &&
      remain > 0
    ) {
      return {
        status: cache.status,
        posts: [],
        source: cache.source,
        fetchedAt: cache.fetchedAt,
        fromCache: true,
        cooldownUntil: new Date(now + remain).toISOString(),
      }
    }
  }

  const fetchedAt = new Date().toISOString()

  try {
    const cloud = filterPostsLastDays(await fetchNewsFromSupabase())
    if (cloud.length > 0) {
      writeCache({
        version: 3,
        fetchedAt,
        status: 'posts',
        source: 'supabase',
        posts: cloud,
      })
      return {
        status: 'posts',
        posts: cloud,
        source: 'supabase',
        fetchedAt,
        fromCache: false,
        cooldownUntil: null,
      }
    }

    // Cloud empty — optional light scrape (admin / force), once per session max
    if ((allowScrape || force) && (force || !sessionAlreadyAttempted())) {
      markSessionAttempted()
      const scraped = await tryLightScrape()
      if (scraped && scraped.posts.length > 0) {
        writeCache({
          version: 3,
          fetchedAt,
          status: 'posts',
          source: scraped.source,
          posts: scraped.posts,
        })
        return {
          status: 'posts',
          posts: scraped.posts,
          source: scraped.source,
          fetchedAt,
          fromCache: false,
          cooldownUntil: null,
        }
      }
    }

    markSessionAttempted()
    writeCache({
      version: 3,
      fetchedAt,
      status: 'empty',
      source: 'supabase',
      posts: [],
    })
    return {
      status: 'empty',
      posts: [],
      source: 'supabase',
      fetchedAt,
      fromCache: false,
      cooldownUntil: new Date(now + NEWS_EMPTY_COOLDOWN_MS).toISOString(),
    }
  } catch {
    writeCache({
      version: 3,
      fetchedAt,
      status: 'unavailable',
      source: 'none',
      posts: [],
    })
    return {
      status: 'unavailable',
      posts: [],
      source: 'none',
      fetchedAt,
      fromCache: false,
      cooldownUntil: new Date(now + NEWS_EMPTY_COOLDOWN_MS).toISOString(),
    }
  }
}

async function tryLightScrape(): Promise<{
  posts: NewsPost[]
  source: 'syndication' | 'rss'
} | null> {
  // Best-effort only; failures are silent. Never invent.
  const urls: { source: 'syndication' | 'rss'; url: string }[] = [
    {
      source: 'syndication',
      url: `https://cdn.syndication.twimg.com/timeline/profile?screen_name=${NEWS_SOURCE.handle}&limit=20`,
    },
  ]
  for (const ep of urls) {
    try {
      const ctrl = new AbortController()
      const timer = window.setTimeout(() => ctrl.abort(), 8000)
      const res = await fetch(ep.url, { signal: ctrl.signal })
      window.clearTimeout(timer)
      if (!res.ok) continue
      const text = await res.text()
      const posts = filterPostsLastDays(parseLooseTimeline(text))
      if (posts.length) return { posts, source: ep.source }
    } catch {
      /* next */
    }
  }
  return null
}

function parseLooseTimeline(raw: string): NewsPost[] {
  const posts: NewsPost[] = []
  try {
    const data = JSON.parse(raw) as { body?: string }
    const html = typeof data.body === 'string' ? data.body : raw
    const blocks = html.split(/data-tweet-id="/i).slice(1)
    for (const block of blocks) {
      const id = block.slice(0, block.indexOf('"'))
      if (!/^\d+$/.test(id)) continue
      const timeMatch = block.match(/datetime="([^"]+)"/i)
      const textMatch = block.match(/tweet-text[^>]*>([\s\S]*?)<\/p>/i)
      const publishedAt = timeMatch?.[1]
        ? new Date(timeMatch[1]).toISOString()
        : ''
      const text = (textMatch?.[1] || '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
      if (!publishedAt || !text) continue
      posts.push({
        id,
        url: `https://x.com/${NEWS_SOURCE.handle}/status/${id}`,
        publishedAt,
        text,
        authorHandle: NEWS_SOURCE.handle,
        source: 'syndication',
      })
    }
  } catch {
    /* ignore */
  }
  return posts
}

