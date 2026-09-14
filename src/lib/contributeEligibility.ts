import type { Contribution, ContributionCategory, Session } from '../types'

/** Default value awarded per accepted (non-seeded) contribution. */
export const DEFAULT_CONTRIBUTE_VALUE_PER_ITEM = 50

/**
 * Claim/redeem stage requires sum of **this user's** contribution values
 * **strictly greater** than this threshold (e.g. two × 50 = 100 does NOT pass).
 */
export const DEFAULT_CONTRIBUTE_VALUE_THRESHOLD = 100

/** At least this many distinct contribution categories (event/collab/content). */
export const DEFAULT_MIN_CONTRIBUTE_TYPES = 2

export type ContributeClaimSettings = {
  contributeValuePerItem: number
  contributeValueThreshold: number
  minContributeTypes: number
}

export const DEFAULT_CONTRIBUTE_CLAIM_SETTINGS: ContributeClaimSettings = {
  contributeValuePerItem: DEFAULT_CONTRIBUTE_VALUE_PER_ITEM,
  contributeValueThreshold: DEFAULT_CONTRIBUTE_VALUE_THRESHOLD,
  minContributeTypes: DEFAULT_MIN_CONTRIBUTE_TYPES,
}

const CATEGORIES: ContributionCategory[] = ['event', 'collab', 'content']

/**
 * Only the signed-in user's own non-seeded contributions in the **current
 * claim cycle** count. Match by participant email (never site-wide).
 *
 * After a successful claim, `eligibilityResetAt` advances so prior posts
 * no longer count — feed rows stay; only eligibility restarts from zero.
 */
export function isCountableContribution(
  c: Contribution,
  session: Session | null | undefined,
  eligibilityResetAt?: string | null,
): boolean {
  if (!session?.email) return false
  if (c.seeded) return false
  const email = session.email.trim().toLowerCase()
  const cEmail = (c.participantEmail ?? '').trim().toLowerCase()
  if (!email || !cEmail || cEmail !== email) return false
  if (eligibilityResetAt) {
    const resetMs = new Date(eligibilityResetAt).getTime()
    const createdMs = new Date(c.createdAt).getTime()
    if (
      Number.isFinite(resetMs) &&
      Number.isFinite(createdMs) &&
      createdMs <= resetMs
    ) {
      return false
    }
  }
  return true
}

export function contributionUnitValue(
  c: Contribution,
  settings: ContributeClaimSettings,
): number {
  if (c.seeded) return 0
  const raw = c.contributeValue
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
    return Math.floor(raw)
  }
  return Math.max(0, Math.floor(settings.contributeValuePerItem))
}

export type ContributeEligibility = {
  /** Sum of this user's contribution values in the current claim cycle */
  sum: number
  threshold: number
  /** sum > threshold */
  meetsValue: boolean
  /** Distinct categories among this user's countable contributions */
  types: ContributionCategory[]
  typeCount: number
  minTypes: number
  /** typeCount >= minTypes */
  meetsTypes: boolean
  /** Both personal contribution gates (value + types) */
  meetsContributeGate: boolean
  countable: Contribution[]
  /** ISO time of last claim-cycle reset (null = never claimed / full history) */
  eligibilityResetAt: string | null
}

export function evaluateContributeEligibility(
  contributions: Contribution[],
  session: Session | null | undefined,
  settings: ContributeClaimSettings = DEFAULT_CONTRIBUTE_CLAIM_SETTINGS,
  eligibilityResetAt: string | null = null,
): ContributeEligibility {
  const threshold = Math.max(0, Math.floor(settings.contributeValueThreshold))
  const minTypes = Math.max(1, Math.floor(settings.minContributeTypes))
  const countable = contributions.filter((c) =>
    isCountableContribution(c, session, eligibilityResetAt),
  )
  let sum = 0
  const typeSet = new Set<ContributionCategory>()
  for (const c of countable) {
    sum += contributionUnitValue(c, settings)
    if (CATEGORIES.includes(c.category)) typeSet.add(c.category)
  }
  const types = CATEGORIES.filter((k) => typeSet.has(k))
  const typeCount = types.length
  const meetsValue = sum > threshold
  const meetsTypes = typeCount >= minTypes
  return {
    sum,
    threshold,
    meetsValue,
    types,
    typeCount,
    minTypes,
    meetsTypes,
    meetsContributeGate: meetsValue && meetsTypes,
    countable,
    eligibilityResetAt,
  }
}

const LOCAL_ELIGIBILITY_RESET_KEY = 'hawk-contribute:contribute-eligibility-reset'

type ResetMap = Record<string, string>

function loadResetMap(): ResetMap {
  try {
    const raw = localStorage.getItem(LOCAL_ELIGIBILITY_RESET_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as ResetMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function getLocalEligibilityResetAt(email: string): string | null {
  const v = loadResetMap()[email.trim().toLowerCase()]
  return typeof v === 'string' && v ? v : null
}

/** Persist claim-cycle reset locally (also used when cloud profile update succeeds). */
export function setLocalEligibilityResetAt(
  email: string,
  at: string = new Date().toISOString(),
): string {
  const map = loadResetMap()
  const key = email.trim().toLowerCase()
  map[key] = at
  localStorage.setItem(LOCAL_ELIGIBILITY_RESET_KEY, JSON.stringify(map))
  return at
}

/** Prefer the newer of cloud vs local reset timestamps. */
export function mergeEligibilityResetAt(
  cloud: string | null | undefined,
  local: string | null | undefined,
): string | null {
  const c = cloud && Number.isFinite(new Date(cloud).getTime()) ? cloud : null
  const l = local && Number.isFinite(new Date(local).getTime()) ? local : null
  if (c && l) return new Date(c).getTime() >= new Date(l).getTime() ? c : l
  return c ?? l
}
