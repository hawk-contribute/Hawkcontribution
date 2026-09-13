import { useCallback, useEffect, useState } from 'react'
import type { PointsAccount } from '../types'
import {
  addRoundPoints,
  getPointsAccount,
  getTotalPointsAll,
} from '../lib/points'
import { subscribeStoreUpdates } from '../lib/sync'

export function usePoints(email: string | undefined) {
  const [account, setAccount] = useState<PointsAccount>(() =>
    email ? getPointsAccount(email) : { total: 0, history: [] },
  )
  const [communityPoints, setCommunityPoints] = useState(() => getTotalPointsAll())

  const refresh = useCallback(() => {
    setAccount(email ? getPointsAccount(email) : { total: 0, history: [] })
    setCommunityPoints(getTotalPointsAll())
  }, [email])

  useEffect(() => {
    refresh()
    return subscribeStoreUpdates(refresh)
  }, [refresh])

  const recordRound = useCallback(
    (score: number, hits: number) => {
      if (!email || score <= 0) {
        refresh()
        return email ? getPointsAccount(email) : { total: 0, history: [] }
      }
      const next = addRoundPoints(email, score, hits)
      setAccount(next)
      setCommunityPoints(getTotalPointsAll())
      return next
    },
    [email, refresh],
  )

  return { account, communityPoints, recordRound, refresh }
}
