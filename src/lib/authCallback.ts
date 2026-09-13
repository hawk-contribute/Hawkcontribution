import { supabase } from './supabase'

export type AuthCallbackResult =
  | { status: 'none' }
  | { status: 'signed_in' }
  | { status: 'error'; message: string }

function cleanAuthParamsFromUrl(): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  const keys = [
    'code',
    'token_hash',
    'type',
    'error',
    'error_description',
    'error_code',
  ]
  let changed = false
  for (const k of keys) {
    if (url.searchParams.has(k)) {
      url.searchParams.delete(k)
      changed = true
    }
  }
  for (const k of [...url.searchParams.keys()]) {
    const lower = k.toLowerCase()
    if (lower.includes('flow') && lower.includes('id')) {
      url.searchParams.delete(k)
      changed = true
    }
  }
  if (url.hash && /access_token|refresh_token|token_hash|error|type=/.test(url.hash)) {
    url.hash = ''
    changed = true
  }
  if (changed) {
    window.history.replaceState(window.history.state, '', url.toString())
  }
}

function paramsFromLocation(): URLSearchParams {
  const url = new URL(window.location.href)
  const merged = new URLSearchParams(url.search)
  if (url.hash && url.hash.length > 1) {
    const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash
    const hashParams = new URLSearchParams(hash)
    hashParams.forEach((v, k) => {
      if (!merged.has(k)) merged.set(k, v)
    })
  }
  return merged
}

function hasAuthCallbackParams(params: URLSearchParams): boolean {
  return Boolean(
    params.get('code') ||
      params.get('token_hash') ||
      params.get('error') ||
      params.get('error_description') ||
      params.get('access_token'),
  )
}

/**
 * Consume magic-link / OTP redirect params BEFORE relying on getSession().
 * Handles PKCE `code`, email `token_hash`+`type`, and surfaces exchange errors.
 */
export async function consumeAuthCallback(): Promise<AuthCallbackResult> {
  if (typeof window === 'undefined') return { status: 'none' }

  const params = paramsFromLocation()
  if (!hasAuthCallbackParams(params)) return { status: 'none' }

  // If a session already exists (e.g. SDK recovered it), just clean the URL.
  const existing = await supabase.auth.getSession()
  if (existing.data.session) {
    cleanAuthParamsFromUrl()
    return { status: 'signed_in' }
  }

  const errorDesc =
    params.get('error_description') || params.get('error') || params.get('error_code')
  if (errorDesc) {
    cleanAuthParamsFromUrl()
    return { status: 'error', message: decodeURIComponent(errorDesc.replace(/\+/g, ' ')) }
  }

  const code = params.get('code')
  const tokenHash = params.get('token_hash')
  const type = params.get('type')
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    cleanAuthParamsFromUrl()
    if (error) {
      return {
        status: 'error',
        message:
          error.message ||
          'Could not complete sign-in from the email link. Open the link in this same browser, or enter the 6-digit code from the email.',
      }
    }
    if (data.session) return { status: 'signed_in' }
    return {
      status: 'error',
      message: 'Sign-in link did not return a session. Try the 6-digit email code.',
    }
  }

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as
        | 'email'
        | 'signup'
        | 'magiclink'
        | 'recovery'
        | 'invite'
        | 'email_change',
    })
    cleanAuthParamsFromUrl()
    if (error) {
      return {
        status: 'error',
        message: error.message || 'Could not verify the email link. Request a new one.',
      }
    }
    if (data.session) return { status: 'signed_in' }
    return {
      status: 'error',
      message: 'Email link verification returned no session.',
    }
  }

  // Implicit hash tokens (legacy / some email templates)
  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    cleanAuthParamsFromUrl()
    if (error) {
      return { status: 'error', message: error.message }
    }
    if (data.session) return { status: 'signed_in' }
  }

  cleanAuthParamsFromUrl()
  return { status: 'none' }
}
