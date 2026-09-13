/** Official Hawk news source on X (Twitter). */
export const NEWS_SOURCE = {
  platform: 'X',
  handle: 'hawk_killshib',
  handleAt: '@hawk_killshib',
  profileUrl: 'https://x.com/hawk_killshib',
} as const

export const NEWS_WINDOW_DAYS = 30
export const NEWS_EMPTY_COOLDOWN_MS = 8 * 60 * 60 * 1000
export const NEWS_CACHE_KEY = 'hawk-contribute:news-v3'
export const NEWS_SESSION_ATTEMPTED_KEY = 'hawk-contribute:news-attempted-v3'
