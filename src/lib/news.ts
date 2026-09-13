/** Official Hawk news source on X (Twitter). */
export const NEWS_SOURCE = {
  platform: 'X',
  handle: 'hawk_killshib',
  handleAt: '@hawk_killshib',
  profileUrl: 'https://x.com/hawk_killshib',
  embedProfileUrl: 'https://twitter.com/hawk_killshib',
  widgetsScript: 'https://platform.twitter.com/widgets.js',
} as const

/** Only surface posts from this rolling window. */
export const NEWS_WINDOW_DAYS = 30

/** After an empty / unavailable result, do not re-search until this elapses. */
export const NEWS_EMPTY_COOLDOWN_MS = 8 * 60 * 60 * 1000 // 8 hours

/** Positive hit cache TTL (still re-filter by 30d on read). */
export const NEWS_POSTS_CACHE_MS = 2 * 60 * 60 * 1000 // 2 hours

export const NEWS_CACHE_KEY = 'hawk-contribute:news-v2'
export const NEWS_SESSION_ATTEMPTED_KEY = 'hawk-contribute:news-attempted-session'

export type NewsPost = {
  id: string
  url: string
  publishedAt: string // ISO
  text: string
}

export type NewsCachePayload = {
  version: 2
  fetchedAt: string
  windowDays: number
  status: 'posts' | 'empty' | 'unavailable'
  source: 'syndication' | 'rss' | 'embed' | 'none'
  posts: NewsPost[]
}

export type NewsLoadResult = {
  status: 'posts' | 'empty' | 'unavailable'
  posts: NewsPost[]
  source: NewsCachePayload['source']
  fetchedAt: string
  fromCache: boolean
  cooldownUntil: string | null
}

/**
 * Optional curated fallback. Keep empty unless manually verified — never invent.
 */
export type CuratedNewsItem = NewsPost
export const CURATED_NEWS: CuratedNewsItem[] = []

export function windowCutoff(now = Date.now()): Date {
  return new Date(now - NEWS_WINDOW_DAYS * 24 * 60 * 60 * 1000)
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

function readCache(): NewsCachePayload | null {
  try {
    const raw = localStorage.getItem(NEWS_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as NewsCachePayload
    if (!parsed || parsed.version !== 2) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(payload: NewsCachePayload): void {
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

function cooldownRemaining(cache: NewsCachePayload, now = Date.now()): number {
  if (cache.status === 'posts') {
    const age = now - Date.parse(cache.fetchedAt)
    return Math.max(0, NEWS_POSTS_CACHE_MS - age)
  }
  const age = now - Date.parse(cache.fetchedAt)
  return Math.max(0, NEWS_EMPTY_COOLDOWN_MS - age)
}

function resultFromCache(cache: NewsCachePayload, now = Date.now()): NewsLoadResult {
  const posts = filterPostsLastDays(cache.posts, NEWS_WINDOW_DAYS, now)
  const remain = cooldownRemaining(cache, now)
  const cooldownUntil =
    remain > 0 ? new Date(now + remain).toISOString() : null

  if (cache.status === 'posts') {
    if (posts.length === 0) {
      // Cached posts aged out of the 30d window → treat as empty, keep cooldown.
      return {
        status: 'empty',
        posts: [],
        source: cache.source,
        fetchedAt: cache.fetchedAt,
        fromCache: true,
        cooldownUntil,
      }
    }
    return {
      status: 'posts',
      posts,
      source: cache.source,
      fetchedAt: cache.fetchedAt,
      fromCache: true,
      cooldownUntil,
    }
  }

  return {
    status: cache.status,
    posts: [],
    source: cache.source,
    fetchedAt: cache.fetchedAt,
    fromCache: true,
    cooldownUntil,
  }
}

function parseLooseDate(raw: string): string | null {
  const t = Date.parse(raw)
  if (Number.isFinite(t)) return new Date(t).toISOString()
  return null
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** Best-effort syndication JSON/HTML parse (format varies). */
function parseSyndicationPayload(raw: string): NewsPost[] {
  const posts: NewsPost[] = []
  try {
    const data = JSON.parse(raw) as Record<string, unknown>
    const body = typeof data.body === 'string' ? data.body : raw
    // Prefer structured tweets if present
    const candidates = (data.tweets ?? data.entries ?? data.items) as unknown
    if (Array.isArray(candidates)) {
      for (const item of candidates) {
        if (!item || typeof item !== 'object') continue
        const o = item as Record<string, unknown>
        const id = String(o.id_str ?? o.id ?? '')
        const text = String(o.text ?? o.full_text ?? o.body ?? '')
        const created = String(o.created_at ?? o.createdAt ?? o.time ?? '')
        const iso = created ? parseLooseDate(created) : null
        if (!id || !iso || !text) continue
        posts.push({
          id,
          url: `https://x.com/${NEWS_SOURCE.handle}/status/${id}`,
          publishedAt: iso,
          text: stripHtml(text).slice(0, 400),
        })
      }
    }
    if (posts.length) return posts
    return parseTimelineHtml(typeof body === 'string' ? body : raw)
  } catch {
    return parseTimelineHtml(raw)
  }
}

function parseTimelineHtml(html: string): NewsPost[] {
  const posts: NewsPost[] = []
  const blocks = html.split(/data-tweet-id="/i).slice(1)
  for (const block of blocks) {
    const id = block.slice(0, block.indexOf('"'))
    if (!/^\d+$/.test(id)) continue
    const timeMatch = block.match(
      /datetime="([^"]+)"|data-time="(\d+)"|title="([^"]+)"/i,
    )
    let iso: string | null = null
    if (timeMatch?.[1]) iso = parseLooseDate(timeMatch[1])
    else if (timeMatch?.[2]) {
      const sec = Number(timeMatch[2])
      if (Number.isFinite(sec))
        iso = new Date(sec > 1e12 ? sec : sec * 1000).toISOString()
    } else if (timeMatch?.[3]) iso = parseLooseDate(timeMatch[3])
    const textMatch = block.match(
      /tweet-text[^>]*>([\s\S]*?)<\/p>|dir="auto"[^>]*>([\s\S]*?)<\//i,
    )
    const text = stripHtml(textMatch?.[1] || textMatch?.[2] || '').slice(0, 400)
    if (!iso || !text) continue
    posts.push({
      id,
      url: `https://x.com/${NEWS_SOURCE.handle}/status/${id}`,
      publishedAt: iso,
      text,
    })
  }
  return posts
}

function parseRssXml(xml: string): NewsPost[] {
  const posts: NewsPost[] = []
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? []
  for (const item of items) {
    const title =
      item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i)?.[1] ||
      item.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ||
      ''
    const link =
      item.match(/<link><!\[CDATA\[([\s\S]*?)\]\]><\/link>/i)?.[1] ||
      item.match(/<link>([\s\S]*?)<\/link>/i)?.[1] ||
      ''
    const pub =
      item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() || ''
    const cleanedTitle = stripHtml(title)
    // Skip whitelist / error stubs
    if (/not yet whitelisted|Attention Required/i.test(cleanedTitle)) continue
    const iso = pub ? parseLooseDate(pub) : null
    if (!iso || !cleanedTitle) continue
    const idMatch = link.match(/status\/(\d+)/)
    const id = idMatch?.[1] || `rss-${iso}-${cleanedTitle.slice(0, 12)}`
    const url = link.startsWith('http')
      ? link.replace('http://', 'https://')
      : `https://x.com/${NEWS_SOURCE.handle}`
    posts.push({
      id,
      url: url.includes('xcancel') || url.includes('nitter')
        ? `https://x.com/${NEWS_SOURCE.handle}/status/${idMatch?.[1] ?? ''}`
        : url,
      publishedAt: iso,
      text: cleanedTitle.slice(0, 400),
    })
  }
  return posts.filter((p) => /\/status\/\d+/.test(p.url) || p.text.length > 0)
}

async function fetchText(url: string, timeoutMs = 10000): Promise<string> {
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json, application/rss+xml, text/html, */*' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally {
    window.clearTimeout(timer)
  }
}

/**
 * Try free dated sources (no API key). May fail due to CORS / rate limits —
 * never invents posts.
 */
export async function fetchDatedNewsPosts(): Promise<{
  posts: NewsPost[]
  source: 'syndication' | 'rss'
} | null> {
  const endpoints: { source: 'syndication' | 'rss'; url: string }[] = [
    {
      source: 'syndication',
      url: `https://cdn.syndication.twimg.com/timeline/profile?screen_name=${NEWS_SOURCE.handle}&with_replies=false&limit=40`,
    },
    {
      source: 'rss',
      url: `https://xcancel.com/${NEWS_SOURCE.handle}/rss`,
    },
    {
      source: 'rss',
      url: `https://rss.xcancel.com/${NEWS_SOURCE.handle}/rss`,
    },
  ]

  for (const ep of endpoints) {
    try {
      const text = await fetchText(ep.url)
      if (!text || text.length < 20) continue
      const parsed =
        ep.source === 'syndication'
          ? parseSyndicationPayload(text)
          : parseRssXml(text)
      const filtered = filterPostsLastDays(parsed)
      // Even if filtered empty, a successful parse counts as a real fetch
      if (parsed.length > 0 || /<item[\s>]/i.test(text) || /tweet/i.test(text)) {
        return { posts: filtered, source: ep.source }
      }
    } catch {
      /* try next */
    }
  }
  return null
}

/**
 * Load news with 30-day filter + cache/cooldown.
 * - Does not auto-poll.
 * - Remount within cooldown after empty/unavailable does NOT re-fetch.
 * - force=true (manual Reload) allows one network attempt, then re-enters cooldown if still empty.
 */
export async function loadNews(options?: {
  force?: boolean
}): Promise<NewsLoadResult> {
  const force = options?.force ?? false
  const now = Date.now()
  const cache = readCache()

  if (cache) {
    const remain = cooldownRemaining(cache, now)
    if (!force && remain > 0) {
      return resultFromCache(cache, now)
    }
    // Soft: same browser session already attempted and cache exists → don't hammer
    if (!force && sessionAlreadyAttempted() && remain > 0) {
      return resultFromCache(cache, now)
    }
  } else if (!force && sessionAlreadyAttempted()) {
    // No cache but already tried this session → unavailable without re-search
    return {
      status: 'unavailable',
      posts: [],
      source: 'none',
      fetchedAt: new Date().toISOString(),
      fromCache: true,
      cooldownUntil: new Date(now + NEWS_EMPTY_COOLDOWN_MS).toISOString(),
    }
  }

  markSessionAttempted()
  const fetchedAt = new Date().toISOString()

  try {
    const hit = await fetchDatedNewsPosts()
    if (hit) {
      const posts = filterPostsLastDays(hit.posts)
      if (posts.length > 0) {
        const payload: NewsCachePayload = {
          version: 2,
          fetchedAt,
          windowDays: NEWS_WINDOW_DAYS,
          status: 'posts',
          source: hit.source,
          posts,
        }
        writeCache(payload)
        return {
          status: 'posts',
          posts,
          source: hit.source,
          fetchedAt,
          fromCache: false,
          cooldownUntil: new Date(now + NEWS_POSTS_CACHE_MS).toISOString(),
        }
      }
      // Dated source worked but nothing in 30 days
      const payload: NewsCachePayload = {
        version: 2,
        fetchedAt,
        windowDays: NEWS_WINDOW_DAYS,
        status: 'empty',
        source: hit.source,
        posts: [],
      }
      writeCache(payload)
      return {
        status: 'empty',
        posts: [],
        source: hit.source,
        fetchedAt,
        fromCache: false,
        cooldownUntil: new Date(now + NEWS_EMPTY_COOLDOWN_MS).toISOString(),
      }
    }
  } catch {
    /* fall through */
  }

  // Free dated fetch impossible → unavailable (embed may be offered separately, once)
  const payload: NewsCachePayload = {
    version: 2,
    fetchedAt,
    windowDays: NEWS_WINDOW_DAYS,
    status: 'unavailable',
    source: 'none',
    posts: [],
  }
  writeCache(payload)
  return {
    status: 'unavailable',
    posts: [],
    source: 'none',
    fetchedAt,
    fromCache: false,
    cooldownUntil: new Date(now + NEWS_EMPTY_COOLDOWN_MS).toISOString(),
  }
}

/** Whether we may load the X embed once as a secondary fallback. */
export function canLoadEmbedFallback(force = false): boolean {
  if (force) return true
  const cache = readCache()
  if (!cache) return true
  // Empty 30d window: never auto-embed / re-search during cooldown
  if (cache.status === 'empty' && cooldownRemaining(cache) > 0) return false
  // Embed already attempted this cooldown window
  if (cache.source === 'embed' && cooldownRemaining(cache) > 0) return false
  // Dated fetch failed (source none) → allow a single embed attempt
  if (cache.status === 'unavailable' && cache.source === 'none') return true
  if (cache.status === 'unavailable' && cooldownRemaining(cache) > 0) return false
  return true
}

export function markEmbedAttempt(_ok: boolean): void {
  const fetchedAt = new Date().toISOString()
  // Embed has no reliable dated filter — record as unavailable-with-embed
  // so cooldown prevents repeated widget / network searches.
  writeCache({
    version: 2,
    fetchedAt,
    windowDays: NEWS_WINDOW_DAYS,
    status: 'unavailable',
    source: 'embed',
    posts: [],
  })
}
