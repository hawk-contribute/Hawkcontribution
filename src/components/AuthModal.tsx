import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '../i18n'
import { isValidEmail } from '../lib/storage'

interface AuthModalProps {
  open: boolean
  onClose: () => void
  onRequestLink: (input: {
    email: string
    displayName?: string
  }) => Promise<void>
}

export function AuthModal({ open, onClose, onRequestLink }: AuthModalProps) {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setEmail('')
      setDisplayName('')
      setError('')
      setSending(false)
      setSentTo(null)
    }
  }, [open])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidEmail(email)) {
      setError(t('auth.emailRequired'))
      return
    }
    setError('')
    setSending(true)
    try {
      await onRequestLink({
        email: email.trim(),
        displayName: displayName.trim() || undefined,
      })
      setSentTo(email.trim())
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('rate') || msg.includes('Rate') || msg.includes('security')) {
        setError(t('auth.rateLimited'))
      } else {
        setError(t('auth.sendFailed'))
      }
    } finally {
      setSending(false)
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

        {sentTo ? (
          <div className="space-y-4">
            <p className="rounded-xl border border-hawk-gold/30 bg-hawk-gold/10 px-4 py-3 text-sm text-hawk-cream">
              {t('auth.checkInbox', { email: sentTo })}
            </p>
            <p className="text-xs text-hawk-muted">{t('auth.rateNote')}</p>
            <button type="button" className="hawk-btn hawk-btn-primary w-full px-4 py-2.5" onClick={onClose}>
              {t('auth.close')}
            </button>
          </div>
        ) : (
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
                disabled={sending}
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
                disabled={sending}
              />
            </label>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <p className="text-xs text-hawk-muted">{t('auth.rateNote')}</p>
            <button
              type="submit"
              className="hawk-btn hawk-btn-primary w-full px-4 py-2.5"
              disabled={sending}
            >
              {sending ? t('auth.sending') : t('auth.submit')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
