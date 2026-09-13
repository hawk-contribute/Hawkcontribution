import { useCallback, useEffect, useState } from 'react'
import {
  claimNft,
  getClaimsForEmail,
} from '../lib/nftClaims'
import { subscribeStoreUpdates } from '../lib/sync'

export function useNftClaims(email: string | undefined) {
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
    (nftId: string) => {
      if (!email) return null
      const entry = claimNft(email, nftId)
      refresh()
      return entry
    },
    [email, refresh],
  )

  return { claims, claim, refresh }
}
