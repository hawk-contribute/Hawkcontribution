import { useCallback, useState } from 'react'
import type { Session } from '../types'
import { clearSession, isValidEmail, loadSession, saveSession } from '../lib/storage'

export function useSession() {
  const [session, setSessionState] = useState<Session | null>(() => loadSession())

  const signIn = useCallback((input: { email: string; displayName?: string }) => {
    const email = input.email.trim()
    if (!isValidEmail(email)) {
      throw new Error('INVALID_EMAIL')
    }
    const displayName =
      input.displayName?.trim() || email.split('@')[0] || 'Hawk Member'
    const next: Session = {
      email,
      displayName,
      signedInAt: new Date().toISOString(),
    }
    saveSession(next)
    setSessionState(next)
    return next
  }, [])

  const signOut = useCallback(() => {
    clearSession()
    setSessionState(null)
  }, [])

  return { session, signIn, signOut, isSignedIn: !!session }
}
