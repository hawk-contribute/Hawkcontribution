import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '../i18n'
import { isValidEmail } from '../lib/storage'

interface AuthModalProps {
  open: boolean
  onClose: () => void
  onSignIn: (input: { email: string; displayName?: string }) => void
}

export function AuthModal({ open, onClose, onSignIn }: AuthModalProps) {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setEmail('')
      setDisplayName('')
      setError('')
    }
  }, [open])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidEmail(email)) {
      setError(t('auth.emailRequired'))
      return
    }
    onSignIn({ email: email.trim(), displayName: displayName.trim() || undefined })
    onClose()
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
            <h2 className="text-lg font-bold text-hawk-cream">{t('auth.title')}</h2>
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
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-hawk-cream">
              {t('auth.name')}
            </span>
            <input
              className="hawk-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('auth.namePlaceholder')}
            />
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" className="hawk-btn hawk-btn-primary w-full px-4 py-2.5">
            {t('auth.submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
