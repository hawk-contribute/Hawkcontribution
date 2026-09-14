import { useCallback, useEffect, useState } from 'react'
import type { PointsAccount } from '../types'
import {
  addBonusPoints,
  addRoundPoints,
  getPointsAccount,
  getTotalPointsAll,
} from '../lib/points'
import { syncPointsFromCloud, upsertGamePoints } from '../lib/cloudSync'
import { subscribeStoreUpdates } from '../lib/sync'

export function usePoints(email: string | undefined, userId?: string) {
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
      if (userId) {
        void upsertGamePoints(userId, next.total)
      }
      return next
    },
    [email, userId, refresh],
  )

  const awardBonus = useCallback(
    async (points: number) => {
      if (!email || points <= 0) {
        refresh()
        return email ? getPointsAccount(email) : { total: 0, history: [] }
      }
      // Prefer higher of local/cloud so we do not clobber remote total.
      if (userId) {
        await syncPointsFromCloud(userId, email)
      }
      const next = addBonusPoints(email, points)
      setAccount(next)
      setCommunityPoints(getTotalPointsAll())
      if (userId) {
        await upsertGamePoints(userId, next.total)
      }
      return next
    },
    [email, userId, refresh],
  )

  return { account, communityPoints, recordRound, awardBonus, refresh }
}
