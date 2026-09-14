import { useCallback, useEffect, useState } from 'react'
import { SEEDED_OPPORTUNITIES } from '../data/opportunities'
import {
  deleteOpportunity,
  fetchOpportunities,
  upsertOpportunity,
  type OpportunitiesSnapshot,
  type OpportunityUpsertInput,
} from '../lib/opportunitiesCloud'
import { useVisibilityPoll } from './useVisibilityPoll'

const fallback: OpportunitiesSnapshot = {
  opportunities: SEEDED_OPPORTUNITIES,
  fromCloud: false,
}

export function useOpportunities(options?: { live?: boolean }) {
  const live = options?.live ?? true
  const [snap, setSnap] = useState<OpportunitiesSnapshot>(fallback)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const next = await fetchOpportunities()
      setSnap(next)
      setError(null)
    } catch (e) {
      console.warn('[useOpportunities]', e)
      setError(e instanceof Error ? e.message : 'load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useVisibilityPoll(() => void refresh(), 90_000, live)

  const saveOpportunity = useCallback(
    async (input: OpportunityUpsertInput) => {
      await upsertOpportunity(input)
      await refresh()
    },
    [refresh],
  )

  const removeOpportunity = useCallback(
    async (id: string) => {
      await deleteOpportunity(id)
      await refresh()
    },
    [refresh],
  )

  return {
    opportunities: snap.opportunities,
    fromCloud: snap.fromCloud,
    loading,
    error,
    refresh,
    saveOpportunity,
    removeOpportunity,
  }
}
