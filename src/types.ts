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
  /** data URL for demo persistence in localStorage */
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
}

/**
 * FUTURE REWARDS HOOK
 * When reward / points / redemption ships, evaluate Contribution + Opportunity here.
 */
export type FutureRewardHook = {
  evaluate?: (contribution: Contribution, opportunity?: Opportunity) => number
}

/** Max total upload size for local demo storage */
export const MAX_UPLOAD_BYTES = 2.5 * 1024 * 1024
