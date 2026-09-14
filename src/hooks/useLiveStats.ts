import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchCommunityLiveCounts,
  type CountsResult,
} from '../lib/communityCounts'
import { useVisibilityPoll } from './useVisibilityPoll'

const POLL_MS = 45_000

export function useLiveStats(options?: { live?: boolean }) {
  const live = options?.live ?? true
  const [result, setResult] = useState<CountsResult | null>(null)
  const [loading, setLoading] = useState(true)
  const busy = useRef(false)

  const refresh = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    try {
      const next = await fetchCommunityLiveCounts()
      setResult(next)
    } finally {
      busy.current = false
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useVisibilityPoll(() => void refresh(), POLL_MS, live)

  return { result, loading, refresh }
}
