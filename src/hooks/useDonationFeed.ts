import { useCallback, useEffect, useRef, useState } from 'react'
import { useVisibilityPoll } from './useVisibilityPoll'
import type { ActivityEvent } from '../types'
import { DONATION } from '../lib/donation'
import {
  cachedDonations,
  fetchBnbBalance,
  fetchHawkBalance,
  fetchHawkBurnStats,
  syncIncomingDonations,
  truncateAddress,
  type BnbBalanceResult,
  type BurnStatsResult,
  type IncomingDonation,
  type TokenBalanceResult,
} from '../lib/bscDonation'

const POLL_MS = 45_000

function toActivity(d: IncomingDonation): ActivityEvent {
  return {
    id: d.id,
    kind: 'donate',
    at: d.at,
    actorName: truncateAddress(d.from),
    actorEmail: d.from.toLowerCase(),
    contributionId: d.hash,
    contributionTitle: `${d.amount} ${d.asset}`,
  }
}

export function useDonationFeed(options?: { live?: boolean }) {
  const live = options?.live ?? true
  const [donations, setDonations] = useState<IncomingDonation[]>(() =>
    typeof window !== 'undefined' ? cachedDonations() : [],
  )
  const [balance, setBalance] = useState<BnbBalanceResult | null>(null)
  const [hawkBalance, setHawkBalance] = useState<TokenBalanceResult | null>(null)
  const [burnStats, setBurnStats] = useState<BurnStatsResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const busy = useRef(false)

  const refresh = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    try {
      const [bal, hawk, burns, sync] = await Promise.all([
        fetchBnbBalance(),
        fetchHawkBalance(DONATION.address),
        fetchHawkBurnStats(),
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
      setHawkBalance(hawk)
      setBurnStats(burns)
      setDonations(sync.donations)
      const errs = [
        !bal.ok ? bal.error : null,
        !hawk.ok ? hawk.error : null,
        !burns.ok ? burns.error : null,
      ].filter(Boolean)
      setError(errs.length ? errs.join('; ') : null)
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

  useVisibilityPoll(() => void refresh(), POLL_MS, live)

  const activities: ActivityEvent[] = donations.map(toActivity)

  return {
    donations,
    activities,
    balance,
    hawkBalance,
    burnStats,
    loading,
    error,
    refresh,
  }
}
