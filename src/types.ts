import type { LocalizedString, LocalizedStringList } from './i18n'

/** Opportunity types shown in UI */
export type OpportunityType = 'event' | 'collab' | 'content'

export interface Opportunity {
  id: string
  type: OpportunityType
  title: LocalizedString
  summary: LocalizedString
  host: LocalizedString
  location: LocalizedString
  deadline: string // ISO date display (shared)
  tags: LocalizedStringList
  status: 'open' | 'closing-soon' | 'ongoing'
  /** Local cover photo under /public/photos */
  image: string
}

export interface Identity {
  displayName: string
  email?: string
}

export interface Contribution {
  id: string
  opportunityId: string
  /** Snapshot of title in the locale used at submit time */
  opportunityTitle: string
  opportunityType: OpportunityType
  title: string
  description: string
  proofUrl?: string
  createdAt: string // ISO
  participantName: string
}

/**
 * FUTURE REWARDS HOOK
 * --------------------
 * When reward / points / redemption ships, map Contribution + Opportunity
 * through a rule engine here (e.g. evaluateReward(contribution, opportunity)).
 * Do not store points on Contribution until that layer exists.
 */
export type FutureRewardHook = {
  /** Placeholder for future points calculation */
  evaluate?: (contribution: Contribution, opportunity: Opportunity) => number
}
