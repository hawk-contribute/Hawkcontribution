import { useCallback, useEffect, useState } from 'react'
import type { PointsAccount } from '../types'
import {
  addBonusPoints,
  addRoundPoints,
  getPointsAccount,
  setPointsTotal,
  subtractBonusPoints,
} from '../lib/points'
import { syncPointsFromCloud, upsertGamePoints } from '../lib/cloudSync'
import { subscribeStoreUpdates } from '../lib/sync'

export function usePoints(email: string | undefined, userId?: string) {
  const [account, setAccount] = useState<PointsAccount>(() =>
    email ? getPointsAccount(email) : { total: 0, history: [] },
  )

  const refresh = useCallback(() => {
    // No session → empty account so UI never shows a previous user's local points.
    setAccount(email ? getPointsAccount(email) : { total: 0, history: [] })
  }, [email])

  useEffect(() => {
    refresh()
    return subscribeStoreUpdates(refresh)
  }, [refresh])

  const recordRound = useCallback(
    (score: number, hits: number) => {
      if (!email || score <= 0) {
        refresh()
        return
      }
      void (async () => {
        // Reconcile first so a newer cloud clawback is not overwritten.
        if (userId) {
          await syncPointsFromCloud(userId, email)
        }
        const next = addRoundPoints(email, score, hits)
        setAccount(next)
        if (userId) {
          await upsertGamePoints(userId, next.total)
        }
      })()
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
      if (userId) {
        await upsertGamePoints(userId, next.total)
      }
      return next
    },
    [email, userId, refresh],
  )

  /** Apply a cloud clawback to the current session user's local cache / UI. */
  const applyClawback = useCallback(
    (cloudTotal: number | null, points: number) => {
      if (!email) {
        refresh()
        return
      }
      const next =
        typeof cloudTotal === 'number'
          ? setPointsTotal(email, cloudTotal)
          : subtractBonusPoints(email, points)
      setAccount(next)
      return next
    },
    [email, refresh],
  )

  return {
    account,
    recordRound,
    awardBonus,
    applyClawback,
    refresh,
  }
}
