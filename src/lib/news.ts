/** Official Hawk news source on X (Twitter). */
export const NEWS_SOURCE = {
  platform: 'X',
  handle: 'hawk_killshib',
  /** Display with @ */
  handleAt: '@hawk_killshib',
  profileUrl: 'https://x.com/hawk_killshib',
  /** Legacy twitter.com URL — used by the official timeline embed widget. */
  embedProfileUrl: 'https://twitter.com/hawk_killshib',
  widgetsScript: 'https://platform.twitter.com/widgets.js',
} as const

/**
 * Optional curated fallback posts. Keep empty unless manually verified —
 * never invent tweets. Shape reserved for future editorial picks.
 */
export type CuratedNewsItem = {
  id: string
  url: string
  publishedAt: string
  summary: string
}

export const CURATED_NEWS: CuratedNewsItem[] = []
