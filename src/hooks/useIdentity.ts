import { useCallback, useState } from 'react'
import type { Identity } from '../types'
import { clearIdentity, loadIdentity, saveIdentity } from '../lib/storage'

export function useIdentity() {
  const [identity, setIdentity] = useState<Identity | null>(() => loadIdentity())

  const set = useCallback((next: Identity) => {
    const cleaned: Identity = {
      displayName: next.displayName.trim(),
      email: next.email?.trim() || undefined,
    }
    saveIdentity(cleaned)
    setIdentity(cleaned)
  }, [])

  const clear = useCallback(() => {
    clearIdentity()
    setIdentity(null)
  }, [])

  return { identity, setIdentity: set, clearIdentity: clear }
}
