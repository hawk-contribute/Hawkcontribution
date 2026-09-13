import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '../i18n'
import { isValidEmail } from '../lib/storage'

type AuthMode = 'signin' | 'signup'

interface AuthModalProps {
  open: boolean
  onClose: () => void
  onSignIn: (input: {
    email: string
    password: string
  }) => Promise<void>
  onSignUp: (input: {
    email: string
    password: string
    displayName?: string
  }) => Promise<'signed_in' | 'confirm_email'>
}

function mapAuthError(msg: string, t: (k: string) => string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login') || m.includes('invalid_credentials')) {
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
  if (m.includes('rate') || m.includes('security')) {
    return t('auth.rateLimited')
  }
  if (m.includes('email') && m.includes('invalid')) {
    return t('auth.emailRequired')
  }
  if (m === 'WEAK_PASSWORD' || m === 'INVALID_EMAIL') {
    return m === 'WEAK_PASSWORD' ? t('auth.weakPassword') : t('auth.emailRequired')
  }
  return t('auth.authFailed')
}

export function AuthModal({
  open,
  onClose,
  onSignIn,
  onSignUp,
}: AuthModalProps) {
  const { t } = useI18n()
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setMode('signin')
      setEmail('')
      setPassword('')
      setDisplayName('')
      setError('')
      setInfo('')
      setBusy(false)
    }
  }, [open])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidEmail(email)) {
      setError(t('auth.emailRequired'))
      return
    }
    if (password.length < 6) {
      setError(t('auth.weakPassword'))
      return
    }
    setError('')
    setInfo('')
    setBusy(true)
    try {
      if (mode === 'signin') {
        await onSignIn({ email: email.trim(), password })
        onClose()
      } else {
        const result = await onSignUp({
          email: email.trim(),
          password,
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
      setError(mapAuthError(msg, t))
    } finally {
      setBusy(false)
    }
  }

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
            <h2 className="text-lg font-bold text-hawk-cream">
              {mode === 'signin' ? t('auth.titleSignIn') : t('auth.titleSignUp')}
            </h2>
            <p className="mt-1 text-sm text-hawk-muted">{t('auth.hint')}</p>
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

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {error && <p className="text-sm text-red-400">{error}</p>}
          {info && (
            <p className="rounded-xl border border-hawk-gold/30 bg-hawk-gold/10 px-3 py-2 text-sm text-hawk-cream">
              {info}
            </p>
          )}

          <p className="text-xs text-hawk-muted">{t('auth.supabaseNote')}</p>

          <button
            type="submit"
            className="hawk-btn hawk-btn-primary w-full px-4 py-2.5"
            disabled={busy}
          >
            {busy
              ? t('auth.working')
              : mode === 'signin'
                ? t('auth.submitSignIn')
                : t('auth.submitSignUp')}
          </button>
        </form>
      </div>
    </div>
  )
}
