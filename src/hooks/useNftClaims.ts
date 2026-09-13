import { useCallback, useEffect, useState } from 'react'
import {
  claimNft,
  getClaimsForEmail,
} from '../lib/nftClaims'
import { claimNftCloud } from '../lib/cloudSync'
import { subscribeStoreUpdates } from '../lib/sync'

export function useNftClaims(email: string | undefined, userId?: string) {
  const [claims, setClaims] = useState<Record<string, { claimedAt: string }>>(
    () => (email ? getClaimsForEmail(email) : {}),
  )

  const refresh = useCallback(() => {
    setClaims(email ? getClaimsForEmail(email) : {})
  }, [email])

  useEffect(() => {
    refresh()
    return subscribeStoreUpdates(refresh)
  }, [refresh])

  const claim = useCallback(
    async (nftId: string) => {
      if (!email) return null
      if (userId) {
        const entry = await claimNftCloud(userId, email, nftId)
        refresh()
        return entry
      }
      const entry = claimNft(email, nftId)
      refresh()
      return entry
    },
    [email, userId, refresh],
  )

  return { claims, claim, refresh }
}
