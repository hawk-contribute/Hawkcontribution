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

function applySessionNow(
  user: User,
  setSessionState: (s: Session | null) => void,
  syncedUserRef: { current: string | null },
  shouldSync: boolean,
): Session {
  const next = sessionFromUser(user)
  setSessionState(next)
  if (shouldSync || syncedUserRef.current !== user.id) {
    const first = syncedUserRef.current !== user.id
    syncedUserRef.current = user.id
    if (shouldSync || first) void afterSignedIn(user, next)
  }
  return next
}

export function useSession() {
  const [session, setSessionState] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const syncedUserRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const applyUser = (user: User | null, shouldSync: boolean) => {
      if (!user?.email) {
        syncedUserRef.current = null
        if (!cancelled) setSessionState(null)
        return
      }
      if (!cancelled) {
        applySessionNow(user, setSessionState, syncedUserRef, shouldSync)
      }
    }

    const boot = async () => {
      try {
        const result = await consumeAuthCallback()
        if (cancelled) return
        if (result.status === 'recovery') {
          setPasswordRecovery(true)
        } else if (result.status === 'error') {
          console.warn('[auth] leftover callback:', result.message)
          setAuthError(result.message)
        }
      } catch (e) {
        console.warn('[auth] callback consume failed', e)
      }

      const { data, error } = await supabase.auth.getSession()
      if (cancelled) return
      if (error) setAuthError((prev) => prev ?? error.message)
      applyUser(data.session?.user ?? null, true)
      setAuthReady(true)
    }

    void boot()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, sbSession) => {
      if (event === 'PASSWORD_RECOVERY' && !cancelled) {
        setPasswordRecovery(true)
        applyUser(sbSession?.user ?? null, false)
        return
      }
      const sync =
        event === 'SIGNED_IN' ||
        event === 'USER_UPDATED' ||
        event === 'INITIAL_SESSION'
      applyUser(sbSession?.user ?? null, sync)
      if (event === 'SIGNED_IN' && !cancelled) setAuthError(null)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const signInWithPassword = useCallback(
    async (input: { email: string; password: string }) => {
      const email = input.email.trim()
      const password = input.password.trim()
      if (!isValidEmail(email)) throw new Error('INVALID_EMAIL')
      if (password.length < 10) throw new Error('WEAK_PASSWORD')
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        console.error('[auth] signInWithPassword failed', {
          message: error.message,
          status: (error as { status?: number }).status,
          name: error.name,
          email,
        })
        throw error
      }
      if (!data.session?.user) {
        console.error('[auth] signInWithPassword: no session/user in response', data)
        throw new Error('NO_SESSION')
      }
      // Explicitly apply session — do not wait only on onAuthStateChange
      applySessionNow(data.session.user, setSessionState, syncedUserRef, true)
      setPasswordRecovery(false)
      setAuthError(null)
      return data.session
    },
    [],
  )

  const signUpWithPassword = useCallback(
    async (input: {
      email: string
      password: string
      displayName?: string
    }): Promise<'signed_in' | 'confirm_email'> => {
      const email = input.email.trim()
      const password = input.password.trim()
      if (!isValidEmail(email)) throw new Error('INVALID_EMAIL')
      if (password.length < 10) throw new Error('WEAK_PASSWORD')
      const displayName = input.displayName?.trim()
      if (displayName) savePendingDisplayName(displayName)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: authRedirectTo(),
          data: displayName ? { display_name: displayName } : undefined,
        },
      })
      if (error) {
        console.error('[auth] signUpWithPassword failed', {
          message: error.message,
          status: (error as { status?: number }).status,
          name: error.name,
          email,
        })
        throw error
      }
      if (data.session?.user) {
        applySessionNow(data.session.user, setSessionState, syncedUserRef, true)
        setPasswordRecovery(false)
        setAuthError(null)
        return 'signed_in'
      }
      return 'confirm_email'
    },
    [],
  )

  const requestPasswordReset = useCallback(async (emailRaw: string) => {
    const email = emailRaw.trim()
    if (!isValidEmail(email)) throw new Error('INVALID_EMAIL')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: authRedirectTo(),
    })
    if (error) {
      console.error('[auth] resetPasswordForEmail failed', error)
      throw error
    }
  }, [])

  const updatePassword = useCallback(async (passwordRaw: string) => {
    const password = passwordRaw.trim()
    if (password.length < 10) throw new Error('WEAK_PASSWORD')
    const { data, error } = await supabase.auth.updateUser({ password })
    if (error) {
      console.error('[auth] updateUser password failed', error)
      throw error
    }
    setPasswordRecovery(false)
    return data.user
  }, [])

  const clearPasswordRecovery = useCallback(() => setPasswordRecovery(false), [])
  const clearAuthError = useCallback(() => setAuthError(null), [])

  const signOut = useCallback(async () => {
    syncedUserRef.current = null
    setPasswordRecovery(false)
    await supabase.auth.signOut()
    setSessionState(null)
  }, [])

  return {
    session,
    authReady,
    authError,
    passwordRecovery,
    clearAuthError,
    clearPasswordRecovery,
    signInWithPassword,
    signUpWithPassword,
    requestPasswordReset,
    updatePassword,
    signOut,
    isSignedIn: !!session?.userId,
  }
}
