import { useCallback, useEffect, useRef, useState } from 'react'
import type { ActivityEvent } from '../types'
import {
  cachedDonations,
  fetchBnbBalance,
  syncIncomingDonations,
  truncateAddress,
  type BnbBalanceResult,
  type IncomingDonation,
} from '../lib/bscDonation'

const POLL_MS = 20_000

function toActivity(d: IncomingDonation): ActivityEvent {
  return {
    id: `donate-${d.hash}`,
    kind: 'donate',
    at: d.at,
    actorName: truncateAddress(d.from),
    actorEmail: d.from.toLowerCase(),
    contributionId: d.hash,
    contributionTitle: d.amountBnb,
  }
}

export function useDonationFeed(options?: { live?: boolean }) {
  const live = options?.live ?? true
  const [donations, setDonations] = useState<IncomingDonation[]>(() =>
    typeof window !== 'undefined' ? cachedDonations() : [],
  )
  const [balance, setBalance] = useState<BnbBalanceResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const busy = useRef(false)

  const refresh = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    try {
      const [bal, sync] = await Promise.all([
        fetchBnbBalance(),
        syncIncomingDonations().catch((e) => {
          console.warn('[useDonationFeed] tx sync failed', e)
          return {
            donations: cachedDonations(),
            latestBlock: 0,
            scannedFrom: 0,
            scannedTo: 0,
          }
        }),
      ])
      setBalance(bal)
      setDonations(sync.donations)
      setError(bal.ok ? null : bal.error)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'donation feed unavailable')
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

  const activities: ActivityEvent[] = donations.map(toActivity)

  return { donations, activities, balance, loading, error, refresh }
}
