import { useEffect, useState } from 'react'
import { Link2, X } from 'lucide-react'
import type { Opportunity } from '../types'
import { useI18n } from '../i18n'

interface ContributeModalProps {
  opportunity: Opportunity | null
  participantName: string
  onClose: () => void
  onSubmit: (data: {
    title: string
    description: string
    proofUrl?: string
  }) => void
}

export function ContributeModal({
  opportunity,
  participantName,
  onClose,
  onSubmit,
}: ContributeModalProps) {
  const { t, lx } = useI18n()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (opportunity) {
      setTitle('')
      setDescription('')
      setProofUrl('')
      setError('')
    }
  }, [opportunity])

  if (!opportunity) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) {
      setError(t('contribute.required'))
      return
    }
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      proofUrl: proofUrl.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={t('identity.close')}
        onClick={onClose}
      />
      <div className="relative max-h-[90svh] w-full max-w-lg overflow-y-auto rounded-2xl border border-hawk-border bg-hawk-panel p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <span className="inline-block rounded-full bg-hawk-blue/15 px-2.5 py-0.5 text-xs font-semibold text-hawk-blue-bright">
              {t(`type.${opportunity.type}`)}
            </span>
            <h2 className="mt-2 text-lg font-bold text-hawk-cream">{t('contribute.title')}</h2>
            <p className="mt-1 text-sm text-hawk-muted">{lx(opportunity.title)}</p>
            <p className="mt-2 text-xs text-hawk-muted">
              {t('contribute.as')}{' '}
              <span className="text-hawk-cream">{participantName}</span>
            </p>
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

        {opportunity.image && (
          <img
            src={opportunity.image}
            alt=""
            className="mb-4 h-28 w-full rounded-xl object-cover"
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              {t('contribute.fieldTitle')} <span className="text-hawk-gold">*</span>
            </span>
            <input
              className="hawk-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('contribute.titlePlaceholder')}
              autoFocus
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              {t('contribute.fieldDesc')} <span className="text-hawk-gold">*</span>
            </span>
            <textarea
              className="hawk-input min-h-[100px] resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('contribute.descPlaceholder')}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
              <Link2 className="h-3.5 w-3.5" />
              {t('contribute.fieldProof')}
            </span>
            <input
              className="hawk-input"
              type="url"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              placeholder="https://…"
            />
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              className="hawk-btn hawk-btn-ghost flex-1 px-4 py-2.5"
              onClick={onClose}
            >
              {t('contribute.cancel')}
            </button>
            <button type="submit" className="hawk-btn hawk-btn-primary flex-1 px-4 py-2.5">
              {t('contribute.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
