import { SEEDED_ACTIVITIES, SEEDED_CONTRIBUTIONS } from '../data/seedSocial'
import type {
  ActivityEvent,
  Comment,
  Contribution,
  LikesMap,
  MiniGameId,
  Quote,
  Session,
  SocialState,
} from '../types'
import { MAX_ACTIVITIES } from '../types'
import { broadcastStoreUpdate } from './sync'
import {
  recordGameActivityCloud,
  recordNftActivityCloud,
} from './communityCloud'

const SESSION_KEY = 'hawk-contribute:session'
const CONTRIBUTIONS_KEY = 'hawk-contribute:contributions'
const SOCIAL_KEY = 'hawk-contribute:social'
const LEGACY_IDENTITY_KEY = 'hawk-contribute:identity'
const SEED_FLAG = 'hawk-contribute:seeded-v1'

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Session
      if (parsed?.email?.trim() && parsed?.displayName?.trim()) return parsed
    }
    const legacy = localStorage.getItem(LEGACY_IDENTITY_KEY)
    if (legacy) {
      const id = JSON.parse(legacy) as { displayName?: string; email?: string }
      if (id.email?.trim() && id.displayName?.trim()) {
        const session: Session = {
          email: id.email.trim(),
          displayName: id.displayName.trim(),
          signedInAt: new Date().toISOString(),
        }
        saveSession(session)
        localStorage.removeItem(LEGACY_IDENTITY_KEY)
        return session
      }
    }
    return null
  } catch {
    return null
  }
}

export function saveSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  const social = loadSocial()
  if (!social.memberEmails.includes(session.email)) {
    social.memberEmails = [...social.memberEmails, session.email]
    saveSocial(social)
  } else {
    broadcastStoreUpdate()
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(LEGACY_IDENTITY_KEY)
  broadcastStoreUpdate()
}

/** Track member email for local community stats (no auth side effects). */
export function registerMemberEmail(email: string): void {
  const trimmed = email.trim()
  if (!trimmed) return
  const social = loadSocial()
  if (!social.memberEmails.includes(trimmed)) {
    social.memberEmails = [...social.memberEmails, trimmed]
    saveSocial(social)
  }
}


function normalizeContribution(c: Contribution): Contribution {
  return {
    ...c,
    category:
      c.category ??
      (c as { opportunityType?: Contribution['category'] }).opportunityType ??
      'content',
    files: Array.isArray(c.files) ? c.files : [],
    participantEmail: c.participantEmail ?? '',
    opportunityTitle: c.opportunityTitle ?? '',
  }
}

export function ensureSeedData(): void {
  try {
    if (localStorage.getItem(SEED_FLAG)) return
    const existing = loadContributionsRaw()
    const ids = new Set(existing.map((c) => c.id))
    const merged = [
      ...SEEDED_CONTRIBUTIONS.filter((s) => !ids.has(s.id)),
      ...existing,
    ]
    localStorage.setItem(CONTRIBUTIONS_KEY, JSON.stringify(merged))

    const social = loadSocialRaw()
    const actIds = new Set(social.activities.map((a) => a.id))
    social.activities = [
      ...SEEDED_ACTIVITIES.filter((a) => !actIds.has(a.id)),
      ...social.activities,
    ]
      .sort((a, b) => (a.at < b.at ? 1 : -1))
      .slice(0, MAX_ACTIVITIES)

    // Seed a few likes/comments so counters aren't zero
    if (!social.likes['seed-contrib-3']?.length) {
      social.likes['seed-contrib-3'] = ['ava@example.com', 'ken@example.com']
    }
    if (!social.likes['seed-contrib-1']?.length) {
      social.likes['seed-contrib-1'] = ['mika@example.com']
    }
    if (!social.comments.some((c) => c.id === 'seed-comment-1')) {
      social.comments.push({
        id: 'seed-comment-1',
        contributionId: 'seed-contrib-2',
        body: '徽章金邊很有 Hawk 感，期待下一版！',
        authorName: 'Mika Chen',
        authorEmail: 'mika@example.com',
        createdAt: '2026-09-11T10:00:00.000Z',
      })
    }
    if (!social.quotes.some((q) => q.id === 'seed-quote-1')) {
      social.quotes.push({
        id: 'seed-quote-1',
        contributionId: 'seed-contrib-4',
        quotedContributionId: 'seed-contrib-1',
        quotedTitle: 'Hawk Night 現場筆記',
        remark: '見面會的互惠觀察很值得延伸。',
        authorName: 'Ken Wu',
        authorEmail: 'ken@example.com',
        createdAt: '2026-09-12T19:00:00.000Z',
      })
    }
    for (const email of [
      'ava@example.com',
      'ken@example.com',
      'mika@example.com',
      'jordan@example.com',
    ]) {
      if (!social.memberEmails.includes(email)) social.memberEmails.push(email)
    }
    localStorage.setItem(SOCIAL_KEY, JSON.stringify(social))
    localStorage.setItem(SEED_FLAG, '1')
  } catch {
    /* ignore */
  }
}

function loadContributionsRaw(): Contribution[] {
  try {
    const raw = localStorage.getItem(CONTRIBUTIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Contribution[]
    return Array.isArray(parsed) ? parsed.map(normalizeContribution) : []
  } catch {
    return []
  }
}

export function loadContributions(): Contribution[] {
  ensureSeedData()
  return loadContributionsRaw().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export function saveContributions(items: Contribution[]): void {
  localStorage.setItem(CONTRIBUTIONS_KEY, JSON.stringify(items))
  broadcastStoreUpdate()
}

function emptySocial(): SocialState {
  return { likes: {}, comments: [], quotes: [], activities: [], memberEmails: [] }
}

function loadSocialRaw(): SocialState {
  try {
    const raw = localStorage.getItem(SOCIAL_KEY)
    if (!raw) return emptySocial()
    const parsed = JSON.parse(raw) as SocialState
    return {
      likes: parsed.likes && typeof parsed.likes === 'object' ? parsed.likes : {},
      comments: Array.isArray(parsed.comments) ? parsed.comments : [],
      quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
      activities: Array.isArray(parsed.activities) ? parsed.activities : [],
      memberEmails: Array.isArray(parsed.memberEmails) ? parsed.memberEmails : [],
    }
  } catch {
    return emptySocial()
  }
}

export function loadSocial(): SocialState {
  ensureSeedData()
  return loadSocialRaw()
}

export function saveSocial(state: SocialState): void {
  localStorage.setItem(SOCIAL_KEY, JSON.stringify(state))
  broadcastStoreUpdate()
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim())
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('read failed'))
    reader.readAsDataURL(file)
  })
}

export function pushActivity(
  social: SocialState,
  event: Omit<ActivityEvent, 'id'> & { id?: string },
): SocialState {
  const entry: ActivityEvent = {
    id: event.id ?? createId('act'),
    kind: event.kind,
    at: event.at,
    actorName: event.actorName,
    actorEmail: event.actorEmail,
    contributionId: event.contributionId,
    contributionTitle: event.contributionTitle,
    ...(event.gameId ? { gameId: event.gameId } : {}),
  }
  return {
    ...social,
    activities: [entry, ...social.activities].slice(0, MAX_ACTIVITIES),
  }
}

export type { LikesMap, Comment, Quote }

export async function recordGameActivity(input: {
  actorName: string
  actorEmail: string
  score: number
  gameId: MiniGameId
}): Promise<void> {
  await recordGameActivityCloud(input)
}

export async function recordNftActivity(input: {
  actorName: string
  actorEmail: string
  nftTitle: string
}): Promise<void> {
  await recordNftActivityCloud(input)
}
