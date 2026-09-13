import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { Identity } from '../types'
import { useI18n } from '../i18n'

interface IdentityModalProps {
  open: boolean
  initial: Identity | null
  onClose: () => void
  onSave: (identity: Identity) => void
  onClear: () => void
}

export function IdentityModal({
  open,
  initial,
  onClose,
  onSave,
  onClear,
}: IdentityModalProps) {
  const { t } = useI18n()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setDisplayName(initial?.displayName ?? '')
      setEmail(initial?.email ?? '')
      setError('')
    }
  }, [open, initial])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) {
      setError(t('identity.nameRequired'))
      return
    }
    onSave({ displayName: displayName.trim(), email: email.trim() || undefined })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={t('identity.close')}
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-hawk-border bg-hawk-panel p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-hawk-cream">{t('identity.title')}</h2>
            <p className="mt-1 text-sm text-hawk-muted">{t('identity.hint')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-hawk-muted hover:bg-white/5 hover:text-hawk-cream"
            aria-label={t('identity.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-hawk-cream">
              {t('identity.name')} <span className="text-hawk-gold">{t('meta.required')}</span>
            </span>
            <input
              className="hawk-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('identity.namePlaceholder')}
              autoFocus
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-hawk-cream">
              {t('identity.email')}
            </span>
            <input
              className="hawk-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('identity.emailPlaceholder')}
            />
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="submit" className="hawk-btn hawk-btn-primary flex-1 px-4 py-2.5">
              {t('identity.save')}
            </button>
            {initial && (
              <button
                type="button"
                className="hawk-btn hawk-btn-ghost px-4 py-2.5"
                onClick={() => {
                  onClear()
                  onClose()
                }}
              >
                {t('identity.clear')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
