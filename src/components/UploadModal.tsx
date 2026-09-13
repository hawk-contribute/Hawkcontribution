import { useEffect, useMemo, useState } from 'react'
import { FileUp, Link2, X } from 'lucide-react'
import type {
  ContributionCategory,
  Opportunity,
  Session,
  UploadedFileMeta,
} from '../types'
import { MAX_UPLOAD_BYTES } from '../types'
import { useI18n } from '../i18n'
import { readFileAsDataUrl } from '../lib/storage'

interface UploadModalProps {
  open: boolean
  session: Session
  opportunities: Opportunity[]
  /** Prefill when joining a specific opportunity */
  presetOpportunity?: Opportunity | null
  onClose: () => void
  onSubmit: (data: {
    category: ContributionCategory
    opportunityId?: string
    opportunityTitle: string
    title: string
    description: string
    proofUrl?: string
    files: UploadedFileMeta[]
  }) => void
}

const CATEGORIES: ContributionCategory[] = ['event', 'collab', 'content']
const MAX_MB = Math.round((MAX_UPLOAD_BYTES / (1024 * 1024)) * 10) / 10

export function UploadModal({
  open,
  session,
  opportunities,
  presetOpportunity,
  onClose,
  onSubmit,
}: UploadModalProps) {
  const { t, lx } = useI18n()
  const [category, setCategory] = useState<ContributionCategory>('content')
  const [opportunityId, setOpportunityId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [files, setFiles] = useState<UploadedFileMeta[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle('')
    setDescription('')
    setProofUrl('')
    setFiles([])
    setError('')
    setBusy(false)
    if (presetOpportunity) {
      setCategory(presetOpportunity.type)
      setOpportunityId(presetOpportunity.id)
    } else {
      setCategory('content')
      setOpportunityId('')
    }
  }, [open, presetOpportunity])

  const filteredOpps = useMemo(
    () => opportunities.filter((o) => o.type === category),
    [opportunities, category],
  )

  if (!open) return null

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0)

  const handleFiles = async (list: FileList | null) => {
    if (!list?.length) return
    setError('')
    setBusy(true)
    try {
      const next = [...files]
      for (const file of Array.from(list)) {
        const dataUrl = await readFileAsDataUrl(file)
        next.push({
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          dataUrl,
        })
      }
      const bytes = next.reduce((s, f) => s + f.size, 0)
      if (bytes > MAX_UPLOAD_BYTES) {
        setError(t('upload.filesTooLarge', { mb: MAX_MB }))
        return
      }
      setFiles(next)
    } catch {
      setError(t('upload.filesTooLarge', { mb: MAX_MB }))
    } finally {
      setBusy(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim() || !category) {
      setError(t('upload.required'))
      return
    }
    if (totalBytes > MAX_UPLOAD_BYTES) {
      setError(t('upload.filesTooLarge', { mb: MAX_MB }))
      return
    }
    const opp = opportunities.find((o) => o.id === opportunityId)
    onSubmit({
      category,
      opportunityId: opp?.id,
      opportunityTitle: opp ? lx(opp.title) : t('upload.free'),
      title: title.trim(),
      description: description.trim(),
      proofUrl: proofUrl.trim() || undefined,
      files,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={t('auth.close')}
        onClick={onClose}
      />
      <div className="relative max-h-[92svh] w-full max-w-lg overflow-y-auto rounded-2xl border border-hawk-border bg-hawk-panel p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-hawk-cream">{t('upload.title')}</h2>
            <p className="mt-1 text-xs text-hawk-muted">
              {t('contribute.as')}{' '}
              <span className="text-hawk-cream">{session.displayName}</span>
              <span className="text-hawk-muted"> · {session.email}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-hawk-muted hover:bg-white/5 hover:text-hawk-cream"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t('upload.category')} *</legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCategory(c)
                    setOpportunityId('')
                  }}
                  className={`hawk-btn rounded-full px-3 py-1.5 text-sm ${
                    category === c
                      ? 'bg-hawk-blue text-white'
                      : 'hawk-btn-ghost'
                  }`}
                >
                  {t(`type.${c}`)}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              {t('upload.pickOpportunity')}
            </span>
            <select
              className="hawk-input"
              value={opportunityId}
              onChange={(e) => setOpportunityId(e.target.value)}
            >
              <option value="">{t('upload.noneOpportunity')}</option>
              {filteredOpps.map((o) => (
                <option key={o.id} value={o.id}>
                  {lx(o.title)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              {t('upload.fieldTitle')} <span className="text-hawk-gold">*</span>
            </span>
            <input
              className="hawk-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('upload.titlePlaceholder')}
              autoFocus
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              {t('upload.fieldDesc')} <span className="text-hawk-gold">*</span>
            </span>
            <textarea
              className="hawk-input min-h-[100px] resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('upload.descPlaceholder')}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
              <Link2 className="h-3.5 w-3.5" />
              {t('upload.fieldProof')}
            </span>
            <input
              className="hawk-input"
              type="url"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              placeholder="https://…"
            />
          </label>

          <div>
            <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
              <FileUp className="h-3.5 w-3.5" />
              {t('upload.files')}
            </span>
            <p className="mb-2 text-xs text-hawk-muted">
              {t('upload.filesHint', { mb: MAX_MB })}
            </p>
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.md,.zip"
              className="block w-full text-sm text-hawk-muted file:mr-3 file:rounded-lg file:border-0 file:bg-hawk-blue file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:brightness-110"
              onChange={(e) => {
                void handleFiles(e.target.files)
                e.target.value = ''
              }}
              disabled={busy}
            />
            {files.length > 0 && (
              <ul className="mt-3 space-y-2">
                {files.map((f, idx) => (
                  <li
                    key={`${f.name}-${idx}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-hawk-border bg-hawk-ink px-3 py-2 text-xs"
                  >
                    <span className="min-w-0 truncate text-hawk-cream">
                      {f.name}{' '}
                      <span className="text-hawk-muted">
                        ({(f.size / 1024).toFixed(0)} KB)
                      </span>
                    </span>
                    <button
                      type="button"
                      className="shrink-0 text-hawk-gold hover:underline"
                      onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      {t('upload.removeFile')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              className="hawk-btn hawk-btn-ghost flex-1 px-4 py-2.5"
              onClick={onClose}
            >
              {t('upload.cancel')}
            </button>
            <button
              type="submit"
              className="hawk-btn hawk-btn-primary flex-1 px-4 py-2.5"
              disabled={busy}
            >
              {t('upload.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
