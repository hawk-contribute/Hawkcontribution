import { useCallback, useState } from 'react'
import type { Contribution, ContributionCategory, UploadedFileMeta } from '../types'
import { createId, loadContributions, saveContributions } from '../lib/storage'

export function useContributions() {
  const [contributions, setContributions] = useState<Contribution[]>(() =>
    loadContributions(),
  )

  const addContribution = useCallback(
    (input: {
      category: ContributionCategory
      opportunityId?: string
      opportunityTitle: string
      title: string
      description: string
      proofUrl?: string
      files: UploadedFileMeta[]
      participantName: string
      participantEmail: string
    }) => {
      const entry: Contribution = {
        id: createId('contrib'),
        opportunityId: input.opportunityId,
        opportunityTitle: input.opportunityTitle,
        category: input.category,
        title: input.title.trim(),
        description: input.description.trim(),
        proofUrl: input.proofUrl?.trim() || undefined,
        files: input.files,
        createdAt: new Date().toISOString(),
        participantName: input.participantName,
        participantEmail: input.participantEmail,
      }

      // FUTURE REWARDS HOOK: evaluateReward(entry) after persist.

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
