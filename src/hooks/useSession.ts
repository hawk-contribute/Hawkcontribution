import { useCallback, useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Session } from '../types'
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

export function useSession() {
  const [session, setSessionState] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
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

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      applyUser(data.session?.user ?? null, true)
      setAuthReady(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, sbSession) => {
      const sync =
        event === 'SIGNED_IN' ||
        event === 'USER_UPDATED' ||
        event === 'INITIAL_SESSION'
      applyUser(sbSession?.user ?? null, sync)
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
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: authRedirectTo(),
          data: displayName ? { display_name: displayName } : undefined,
        },
      })
      if (error) throw error
    },
    [],
  )

  const signOut = useCallback(async () => {
    syncedUserRef.current = null
    await supabase.auth.signOut()
    setSessionState(null)
  }, [])

  return {
    session,
    authReady,
    requestMagicLink,
    signOut,
    isSignedIn: !!session,
  }
}
