import type { MiniGameId } from '../types'

export const MINI_GAME_IDS: readonly MiniGameId[] = [
  'whack',
  'fruit',
  'catch',
  'flappy',
  'memory',
  'wingSoar',
  'hatchDay',
]

/** Locale-appropriate short display names already used in the game hub. */
export const MINI_GAME_NAME_I18N_KEY: Record<MiniGameId, string> = {
  whack: 'game.title',
  fruit: 'fruit.badge',
  catch: 'catch.badge',
  flappy: 'flappy.badge',
  memory: 'memory.badge',
  wingSoar: 'wingSoar.badge',
  hatchDay: 'hatchDay.badge',
}

export function isMiniGameId(value: unknown): value is MiniGameId {
  return typeof value === 'string' && (MINI_GAME_IDS as readonly string[]).includes(value)
}

/** Resolve a stored game identity from activity meta or contribution_id. */
export function parseStoredMiniGameId(
  metaGameId: unknown,
  contributionId?: string,
): MiniGameId | undefined {
  if (isMiniGameId(metaGameId)) return metaGameId
  const raw = (contributionId ?? '').replace(/^game-/, '')
  if (raw === 'eagle') return 'whack'
  if (isMiniGameId(raw)) return raw
  return undefined
}

/** i18n key for the marquee game name; legacy/unknown rows fall back to Whack. */
export function miniGameNameI18nKey(gameId?: string): string {
  if (isMiniGameId(gameId)) return MINI_GAME_NAME_I18N_KEY[gameId]
  return 'game.title'
}
