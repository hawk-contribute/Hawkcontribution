import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '../i18n'
import { isValidEmail } from '../lib/storage'

type AuthMode = 'signin' | 'signup' | 'forgot' | 'recovery' | 'change'

interface AuthModalProps {
  open: boolean
  onClose: () => void
  /** When true, force the set-new-password UI (recovery link landed). */
  passwordRecovery?: boolean
  /** Open directly in change-password mode (must already be signed in). */
  changePassword?: boolean
  onSignIn: (input: {
    email: string
    password: string
  }) => Promise<void>
  onSignUp: (input: {
    email: string
    password: string
    displayName?: string
  }) => Promise<'signed_in' | 'confirm_email'>
  onRequestReset: (email: string) => Promise<void>
  onUpdatePassword: (password: string) => Promise<void>
}

function mapAuthError(msg: string, t: (k: string) => string): string {
  const m = msg.toLowerCase()
  if (
    m.includes('invalid login') ||
    m.includes('invalid_credentials') ||
    m.includes('invalid email or password')
  ) {
    return t('auth.wrongPassword')
  }
  if (
    m.includes('user already') ||
    m.includes('already registered') ||
    m.includes('already been registered')
  ) {
    return t('auth.userExists')
  }
  if (
    m.includes('password') &&
    (m.includes('weak') ||
      m.includes('least') ||
      m.includes('short') ||
      m.includes('6'))
  ) {
    return t('auth.weakPassword')
  }
  if (m.includes('rate') || m.includes('security') || m.includes('over_email')) {
    return t('auth.rateLimited')
  }
  if (m.includes('email') && m.includes('invalid')) {
    return t('auth.emailRequired')
  }
  if (m === 'weak_password' || m === 'invalid_email') {
    return m === 'weak_password' ? t('auth.weakPassword') : t('auth.emailRequired')
  }
  if (m === 'password_mismatch') return t('auth.passwordMismatch')
  if (m === 'no_session') return t('auth.noSession')
  return t('auth.authFailed')
}

function formatError(msg: string, t: (k: string) => string): string {
  const mapped = mapAuthError(msg, t)
  const raw = msg.trim()
  if (
    !raw ||
    raw === 'INVALID_EMAIL' ||
    raw === 'WEAK_PASSWORD' ||
    raw === 'PASSWORD_MISMATCH' ||
    raw === 'NO_SESSION'
  ) {
    return mapped
  }
  // Avoid duplicating the same text
  if (mapped.toLowerCase() === raw.toLowerCase()) return mapped
  return `${mapped} — ${raw}`
}

export function AuthModal({
  open,
  onClose,
  passwordRecovery = false,
  changePassword = false,
  onSignIn,
  onSignUp,
  onRequestReset,
  onUpdatePassword,
}: AuthModalProps) {
  const { t } = useI18n()
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    if (passwordRecovery) {
      setMode('recovery')
      setPassword('')
      setConfirmPassword('')
      setError('')
      setInfo('')
      setBusy(false)
      return
    }
    if (changePassword) {
      setMode('change')
      setPassword('')
      setConfirmPassword('')
      setError('')
      setInfo('')
      setBusy(false)
      return
    }
    setMode('signin')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setDisplayName('')
    setError('')
    setInfo('')
    setBusy(false)
  }, [open, passwordRecovery, changePassword])

  useEffect(() => {
    if (!open) return
    if (passwordRecovery) setMode('recovery')
    else if (changePassword) setMode('change')
  }, [passwordRecovery, changePassword, open])

  if (!open) return null

  const title =
    mode === 'signup'
      ? t('auth.titleSignUp')
      : mode === 'forgot'
        ? t('auth.titleForgot')
        : mode === 'recovery' || mode === 'change'
          ? mode === 'change'
            ? t('auth.titleChangePassword')
            : t('auth.titleRecovery')
          : t('auth.titleSignIn')

  const hint =
    mode === 'forgot'
      ? t('auth.forgotHint')
      : mode === 'recovery'
        ? t('auth.recoveryHint')
        : mode === 'change'
          ? t('auth.changeHint')
          : t('auth.hint')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    const emailTrim = email.trim()
    const passwordTrim = password.trim()
    const confirmTrim = confirmPassword.trim()
    try {
      if (mode === 'forgot') {
        if (!isValidEmail(emailTrim)) {
          setError(t('auth.emailRequired'))
          return
        }
        await onRequestReset(emailTrim)
        setInfo(t('auth.resetEmailSent', { email: emailTrim }))
        return
      }

      if (mode === 'recovery' || mode === 'change') {
        if (passwordTrim.length < 6) {
          setError(t('auth.weakPassword'))
          return
        }
        if (passwordTrim !== confirmTrim) {
          setError(t('auth.passwordMismatch'))
          return
        }
        await onUpdatePassword(passwordTrim)
        onClose()
        return
      }

      if (!isValidEmail(emailTrim)) {
        setError(t('auth.emailRequired'))
        return
      }
      if (passwordTrim.length < 6) {
        setError(t('auth.weakPassword'))
        return
      }

      if (mode === 'signin') {
        await onSignIn({ email: emailTrim, password: passwordTrim })
        onClose()
      } else {
        const result = await onSignUp({
          email: emailTrim,
          password: passwordTrim,
          displayName: displayName.trim() || undefined,
        })
        if (result === 'confirm_email') {
          setInfo(t('auth.confirmEmail'))
          setMode('signin')
          setPassword('')
        } else {
          onClose()
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[auth] AuthModal submit error', err)
      setError(formatError(msg, t))
    } finally {
      setBusy(false)
    }
  }

  const showTabs = mode === 'signin' || mode === 'signup'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={t('auth.close')}
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-hawk-border bg-hawk-panel p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-hawk-cream">{title}</h2>
            <p className="mt-1 text-sm text-hawk-muted">{hint}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-hawk-muted hover:bg-white/5 hover:text-hawk-cream"
            aria-label={t('auth.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {showTabs && (
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-hawk-border/70 bg-black/20 p-1">
            <button
              type="button"
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                mode === 'signin'
                  ? 'bg-hawk-gold/20 text-hawk-gold'
                  : 'text-hawk-muted hover:text-hawk-cream'
              }`}
              onClick={() => {
                setMode('signin')
                setError('')
                setInfo('')
              }}
            >
              {t('auth.modeSignIn')}
            </button>
            <button
              type="button"
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                mode === 'signup'
                  ? 'bg-hawk-gold/20 text-hawk-gold'
                  : 'text-hawk-muted hover:text-hawk-cream'
              }`}
              onClick={() => {
                setMode('signup')
                setError('')
                setInfo('')
              }}
            >
              {t('auth.modeSignUp')}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
          {(mode === 'signin' || mode === 'signup' || mode === 'forgot') && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-hawk-cream">
                {t('auth.email')} <span className="text-hawk-gold">*</span>
              </span>
              <input
                className="hawk-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                autoFocus
                disabled={busy}
              />
            </label>
          )}

          {(mode === 'signin' || mode === 'signup') && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-hawk-cream">
                {t('auth.password')} <span className="text-hawk-gold">*</span>
              </span>
              <input
                className="hawk-input"
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.passwordPlaceholder')}
                disabled={busy}
                minLength={6}
              />
            </label>
          )}

          {mode === 'signin' && (
            <div className="flex justify-end">
              <button
                type="button"
                className="text-xs font-medium text-hawk-gold underline-offset-2 hover:underline"
                onClick={() => {
                  setMode('forgot')
                  setPassword('')
                  setError('')
                  setInfo('')
                }}
              >
                {t('auth.forgotLink')}
              </button>
            </div>
          )}

          {mode === 'signup' && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-hawk-cream">
                {t('auth.name')}
              </span>
              <input
                className="hawk-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('auth.namePlaceholder')}
                disabled={busy}
              />
            </label>
          )}

          {(mode === 'recovery' || mode === 'change') && (
            <>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-hawk-cream">
                  {t('auth.newPassword')} <span className="text-hawk-gold">*</span>
                </span>
                <input
                  className="hawk-input"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder')}
                  autoFocus
                  disabled={busy}
                  minLength={6}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-hawk-cream">
                  {t('auth.confirmPassword')} <span className="text-hawk-gold">*</span>
                </span>
                <input
                  className="hawk-input"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                  disabled={busy}
                  minLength={6}
                />
              </label>
            </>
          )}

          {error && (
            <p className="whitespace-pre-wrap break-words text-sm text-red-400">{error}</p>
          )}
          {info && (
            <p className="rounded-xl border border-hawk-gold/30 bg-hawk-gold/10 px-3 py-2 text-sm text-hawk-cream">
              {info}
            </p>
          )}

          {(mode === 'signin' || mode === 'signup') && (
            <p className="text-xs text-hawk-muted">{t('auth.supabaseNote')}</p>
          )}
          {mode === 'forgot' && (
            <p className="text-xs text-hawk-muted">{t('auth.resetNote')}</p>
          )}

          <button
            type="submit"
            className="hawk-btn hawk-btn-primary w-full px-4 py-2.5"
            disabled={busy}
          >
            {busy
              ? t('auth.working')
              : mode === 'signin'
                ? t('auth.submitSignIn')
                : mode === 'signup'
                  ? t('auth.submitSignUp')
                  : mode === 'forgot'
                    ? t('auth.submitForgot')
                    : mode === 'change'
                      ? t('auth.submitChangePassword')
                      : t('auth.submitRecovery')}
          </button>

          {(mode === 'forgot' || (mode === 'recovery' && !passwordRecovery)) && (
            <button
              type="button"
              className="w-full text-center text-xs text-hawk-muted underline-offset-2 hover:text-hawk-cream hover:underline"
              onClick={() => {
                setMode('signin')
                setError('')
                setInfo('')
                setPassword('')
                setConfirmPassword('')
              }}
            >
              {t('auth.backToSignIn')}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
