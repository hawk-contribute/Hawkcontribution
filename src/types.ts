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

/** Signed-in app session (Supabase Auth email or Web3 wallet) */
export interface Session {
  /**
   * Account key for local points/claims ledgers.
   * Real email for password users; synthetic `0x…@ethereum.wallet` for Web3-only.
   */
  email: string
  displayName: string
  signedInAt: string // ISO
  /** Supabase auth user id when available */
  userId?: string
  /** Verified EVM address when signed in via SIWE / Web3 */
  walletAddress?: string
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
  /**
   * Content contribution value (貢獻值) for claim eligibility.
   * Seeded rows are 0; non-seeded default from reward_settings.contribute_value_per_item.
   */
  contributeValue?: number
}

export type ActivityKind = 'contribute' | 'like' | 'comment' | 'quote' | 'game' | 'nft' | 'donate'

/** Stable ids for arcade mini-games (excludes the hub screen). */
export type MiniGameId = 'whack' | 'fruit' | 'catch' | 'flappy' | 'memory' | 'wingSoar'

export interface ActivityEvent {
  id: string
  kind: ActivityKind
  at: string
  actorName: string
  actorEmail: string
  contributionId: string
  contributionTitle: string
  /** Set on kind `game` when recorded; omitted on legacy rows. */
  gameId?: MiniGameId
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

/** Per-email cumulative game points (local demo) */
export interface PointsRound {
  at: string
  score: number
  hits: number
}

export interface PointsAccount {
  total: number
  history: PointsRound[]
  /** ISO time of last local write; used to accept newer cloud clawbacks. */
  updatedAt?: string
}

/** email -> points account */
export type PointsMap = Record<string, PointsAccount>

export const NFT_REDEEM_POINTS = 10_000

/** Points awarded when a contribution is successfully uploaded. */
export const CONTRIBUTE_REWARD_POINTS = 500

export interface NftDefinition {
  id: string
  image: string
  rarityKey: string // i18n key suffix e.g. legendary / epic / rare / common
  /** Optional i18n overlay for seeded static items */
  titleKey?: string
  blurbKey?: string
  /** Display text from DB (or static fallback) */
  title?: string
  blurb?: string
  /** Points required to unlock / claim this NFT (per-item) */
  requiredPoints: number
  /** Stored per-NFT points from DB (same as requiredPoints when from cloud) */
  requiredPointsOverride?: number | null
  sortOrder?: number
}

export type NftClaimsMap = Record<
  string,
  Record<string, { claimedAt: string }>
>
