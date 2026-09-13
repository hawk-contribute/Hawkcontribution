import { useCallback, useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Session } from '../types'
import { consumeAuthCallback } from '../lib/authCallback'
import { isValidEmail, registerMemberEmail } from '../lib/storage'
import { authRedirectTo, supabase } from '../lib/supabase'
import {
  peekPendingDisplayName,
  savePendingDisplayName,
  syncNftClaimsFromCloud,
  syncPointsFromCloud,
  takePendingDisplayName,
  upsertProfile,
} from '../lib/cloudSync'

const PENDING_EMAIL_KEY = 'hawk-contribute:pending-auth-email'

export function savePendingAuthEmail(email: string): void {
  localStorage.setItem(PENDING_EMAIL_KEY, email.trim())
}

export function loadPendingAuthEmail(): string | null {
  return localStorage.getItem(PENDING_EMAIL_KEY)
}

function sessionFromUser(user: User): Session {
  const email = (user.email ?? '').trim()
  const metaName =
    (typeof user.user_metadata?.display_name === 'string' &&
      user.user_metadata.display_name.trim()) ||
    (typeof user.user_metadata?.full_name === 'string' &&
      user.user_metadata.full_name.trim()) ||
    ''
  const pending = peekPendingDisplayName()
  const displayName =
    metaName || pending || email.split('@')[0] || 'Hawk Member'
  return {
    email,
    displayName,
    signedInAt: user.last_sign_in_at ?? new Date().toISOString(),
    userId: user.id,
  }
}

async function afterSignedIn(user: User, appSession: Session): Promise<void> {
  registerMemberEmail(appSession.email)
  takePendingDisplayName()
  localStorage.removeItem(PENDING_EMAIL_KEY)
  await upsertProfile({
    userId: user.id,
    email: appSession.email,
    displayName: appSession.displayName,
  })
  if (appSession.displayName) {
    try {
      await supabase.auth.updateUser({
        data: { display_name: appSession.displayName },
      })
    } catch {
      /* ignore */
    }
  }
  await syncPointsFromCloud(user.id, appSession.email)
  await syncNftClaimsFromCloud(user.id, appSession.email)
}

export function useSession() {
  const [session, setSessionState] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const syncedUserRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const applyUser = (user: User | null, shouldSync: boolean) => {
      if (!user?.email) {
        syncedUserRef.current = null
        if (!cancelled) setSessionState(null)
        return
      }
      const next = sessionFromUser(user)
      if (!cancelled) setSessionState(next)
      if (shouldSync && syncedUserRef.current !== user.id) {
        syncedUserRef.current = user.id
        void afterSignedIn(user, next)
      }
    }

    const boot = async () => {
      // 1) Explicitly consume redirect params before treating getSession as source of truth
      try {
        const result = await consumeAuthCallback()
        if (cancelled) return
        if (result.status === 'error') {
          setAuthError(result.message)
        }
      } catch (e) {
        if (!cancelled) {
          setAuthError(
            e instanceof Error ? e.message : 'Sign-in callback failed unexpectedly',
          )
        }
      }

      // 2) Read session (awaits SDK initialize / any remaining URL detection)
      const { data, error } = await supabase.auth.getSession()
      if (cancelled) return
      if (error) {
        setAuthError((prev) => prev ?? error.message)
      }
      applyUser(data.session?.user ?? null, true)
      setAuthReady(true)
    }

    void boot()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, sbSession) => {
      const sync =
        event === 'SIGNED_IN' ||
        event === 'USER_UPDATED' ||
        event === 'INITIAL_SESSION'
      applyUser(sbSession?.user ?? null, sync)
      if (event === 'SIGNED_IN' && !cancelled) {
        setAuthError(null)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const requestMagicLink = useCallback(
    async (input: { email: string; displayName?: string }) => {
      const email = input.email.trim()
      if (!isValidEmail(email)) {
        throw new Error('INVALID_EMAIL')
      }
      const displayName = input.displayName?.trim()
      savePendingDisplayName(displayName)
      savePendingAuthEmail(email)
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: authRedirectTo(),
          data: displayName ? { display_name: displayName } : undefined,
          shouldCreateUser: true,
        },
      })
      if (error) throw error
    },
    [],
  )

  const verifyEmailOtp = useCallback(async (input: { email: string; token: string }) => {
    const email = input.email.trim()
    const token = input.token.replace(/\D/g, '').trim()
    if (!isValidEmail(email)) throw new Error('INVALID_EMAIL')
    if (!/^\d{6,8}$/.test(token)) throw new Error('INVALID_OTP')

    const tryTypes = ['email', 'magiclink'] as const
    let lastError: Error | null = null
    for (const type of tryTypes) {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type,
      })
      if (!error && data.session) {
        localStorage.removeItem(PENDING_EMAIL_KEY)
        return data.session
      }
      if (error) lastError = error
    }
    if (lastError) throw lastError
    throw new Error('NO_SESSION')
  }, [])

  const clearAuthError = useCallback(() => setAuthError(null), [])

  const signOut = useCallback(async () => {
    syncedUserRef.current = null
    await supabase.auth.signOut()
    setSessionState(null)
  }, [])

  return {
    session,
    authReady,
    authError,
    clearAuthError,
    requestMagicLink,
    verifyEmailOtp,
    signOut,
    isSignedIn: !!session,
  }
}
