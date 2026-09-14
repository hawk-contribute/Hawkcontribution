import { useCallback, useEffect, useState } from 'react'
import {
  claimTokenRemainingMs,
  clearClaimToken,
  consumeClaimToken,
  hasValidClaimToken,
  issueClaimToken,
} from '../lib/humanVerify'

/**
 * React binding for the client-side claim/download verification gate.
 */
export function useHumanVerify() {
  const [verified, setVerified] = useState(() => hasValidClaimToken())
  const [remainingMs, setRemainingMs] = useState(() => claimTokenRemainingMs())

  const refresh = useCallback(() => {
    const ok = hasValidClaimToken()
    setVerified(ok)
    setRemainingMs(ok ? claimTokenRemainingMs() : 0)
  }, [])

  useEffect(() => {
    refresh()
    const id = window.setInterval(refresh, 5_000)
    return () => window.clearInterval(id)
  }, [refresh])

  const markPassed = useCallback(() => {
    issueClaimToken()
    refresh()
  }, [refresh])

  const consume = useCallback(() => {
    consumeClaimToken()
    refresh()
  }, [refresh])

  const reset = useCallback(() => {
    clearClaimToken()
    refresh()
  }, [refresh])

  return { verified, remainingMs, markPassed, consume, reset, refresh }
}
