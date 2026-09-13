import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchCommunityLiveCounts,
  type CountsResult,
} from '../lib/communityCounts'

const POLL_MS = 20_000

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

  useEffect(() => {
    if (!live) return
    const id = window.setInterval(() => void refresh(), POLL_MS)
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    const onVis = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [live, refresh])

  return { result, loading, refresh }
}
