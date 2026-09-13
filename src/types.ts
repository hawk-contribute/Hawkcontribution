import type { LocalizedString, LocalizedStringList } from './i18n'

/** Opportunity / contribution categories */
export type OpportunityType = 'event' | 'collab' | 'content'
export type ContributionCategory = OpportunityType

export interface Opportunity {
  id: string
  type: OpportunityType
  title: LocalizedString
  summary: LocalizedString
  host: LocalizedString
  location: LocalizedString
  deadline: string
  tags: LocalizedStringList
  status: 'open' | 'closing-soon' | 'ongoing'
  image: string
}

/** Local email session (MVP — no server verification) */
export interface Session {
  email: string
  displayName: string
  signedInAt: string // ISO
}

export interface UploadedFileMeta {
  name: string
  type: string
  size: number
  dataUrl: string
}

export interface Contribution {
  id: string
  opportunityId?: string
  opportunityTitle: string
  category: ContributionCategory
  title: string
  description: string
  proofUrl?: string
  files: UploadedFileMeta[]
  createdAt: string
  participantName: string
  participantEmail: string
  /** Seeded demo flag — optional */
  seeded?: boolean
}

export type ActivityKind = 'contribute' | 'like' | 'comment' | 'quote'

export interface ActivityEvent {
  id: string
  kind: ActivityKind
  at: string
  actorName: string
  actorEmail: string
  contributionId: string
  contributionTitle: string
}

export interface Comment {
  id: string
  contributionId: string
  body: string
  authorName: string
  authorEmail: string
  createdAt: string
}

export interface Quote {
  id: string
  /** Contribution that contains / owns this quote note */
  contributionId: string
  /** Contribution being cited */
  quotedContributionId: string
  quotedTitle: string
  remark: string
  authorName: string
  authorEmail: string
  createdAt: string
}

/** Likes map: contributionId -> emails who liked */
export type LikesMap = Record<string, string[]>

export interface SocialState {
  likes: LikesMap
  comments: Comment[]
  quotes: Quote[]
  activities: ActivityEvent[]
  /** Emails that have signed in on this browser (demo counter) */
  memberEmails: string[]
}

/**
 * FUTURE REWARDS HOOK
 * When reward / points / redemption ships, evaluate Contribution + Opportunity here.
 */
export type FutureRewardHook = {
  evaluate?: (contribution: Contribution, opportunity?: Opportunity) => number
}

export const MAX_UPLOAD_BYTES = 2.5 * 1024 * 1024
export const MAX_ACTIVITIES = 30
