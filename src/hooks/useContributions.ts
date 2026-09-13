import { useCallback, useState } from 'react'
import type { Contribution, Opportunity } from '../types'
import { createId, loadContributions, saveContributions } from '../lib/storage'

export function useContributions() {
  const [contributions, setContributions] = useState<Contribution[]>(() =>
    loadContributions(),
  )

  const addContribution = useCallback(
    (input: {
      opportunity: Opportunity
      title: string
      description: string
      proofUrl?: string
      participantName: string
      /** Localized title snapshot for ledger display */
      opportunityTitleSnapshot: string
    }) => {
      const entry: Contribution = {
        id: createId('contrib'),
        opportunityId: input.opportunity.id,
        opportunityTitle: input.opportunityTitleSnapshot,
        opportunityType: input.opportunity.type,
        title: input.title.trim(),
        description: input.description.trim(),
        proofUrl: input.proofUrl?.trim() || undefined,
        createdAt: new Date().toISOString(),
        participantName: input.participantName,
      }

      // FUTURE REWARDS HOOK: after persisting a contribution, call
      // evaluateReward(entry, input.opportunity) and store / display points.
      // See types.ts FutureRewardHook — MVP records contributions only.

      setContributions((prev) => {
        const next = [entry, ...prev]
        saveContributions(next)
        return next
      })

      return entry
    },
    [],
  )

  return { contributions, addContribution }
}
