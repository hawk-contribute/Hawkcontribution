import { useEffect, useState, type ChangeEvent } from 'react'
import { X } from 'lucide-react'
import type { LocalizedString, LocalizedStringList } from '../i18n'
import { useI18n } from '../i18n'
import type { Opportunity, OpportunityType } from '../types'
import {
  opportunityImagePath,
  parseTagsInput,
  tagsToInput,
  type OpportunityUpsertInput,
} from '../lib/opportunitiesCloud'

type FormState = {
  id: string
  type: OpportunityType
  status: Opportunity['status']
  deadline: string
  imagePath: string
  sortOrder: string
  titleEn: string
  titleZhCN: string
  titleZhTW: string
  locationEn: string
  locationZhCN: string
  locationZhTW: string
  summaryEn: string
  summaryZhCN: string
  summaryZhTW: string
  hostEn: string
  hostZhCN: string
  hostZhTW: string
  tagsEn: string
  tagsZhCN: string
  tagsZhTW: string
}

function emptyForm(): FormState {
  return {
    id: '',
    type: 'event',
    status: 'open',
    deadline: '',
    imagePath: 'photos/event-meetup.jpg',
    sortOrder: '100',
    titleEn: '',
    titleZhCN: '',
    titleZhTW: '',
    locationEn: '',
    locationZhCN: '',
    locationZhTW: '',
    summaryEn: '',
    summaryZhCN: '',
    summaryZhTW: '',
    hostEn: 'Hawk Community',
    hostZhCN: 'Hawk Community',
    hostZhTW: 'Hawk Community',
    tagsEn: '',
    tagsZhCN: '',
    tagsZhTW: '',
  }
}

function fromOpportunity(opp: Opportunity, sortOrder = 0): FormState {
  return {
    id: opp.id,
    type: opp.type,
    status: opp.status,
    deadline: opp.deadline,
    imagePath: opportunityImagePath(opp),
    sortOrder: String(sortOrder),
    titleEn: opp.title.en,
    titleZhCN: opp.title['zh-CN'],
    titleZhTW: opp.title['zh-TW'],
    locationEn: opp.location.en,
    locationZhCN: opp.location['zh-CN'],
    locationZhTW: opp.location['zh-TW'],
    summaryEn: opp.summary.en,
    summaryZhCN: opp.summary['zh-CN'],
    summaryZhTW: opp.summary['zh-TW'],
    hostEn: opp.host.en,
    hostZhCN: opp.host['zh-CN'],
    hostZhTW: opp.host['zh-TW'],
    tagsEn: tagsToInput(opp.tags.en),
    tagsZhCN: tagsToInput(opp.tags['zh-CN']),
    tagsZhTW: tagsToInput(opp.tags['zh-TW']),
  }
}

function toLocalized(
  en: string,
  zhCN: string,
  zhTW: string,
): LocalizedString {
  return {
    en: en.trim(),
    'zh-CN': zhCN.trim(),
    'zh-TW': zhTW.trim(),
  }
}

function toLocalizedList(
  en: string,
  zhCN: string,
  zhTW: string,
): LocalizedStringList {
  return {
    en: parseTagsInput(en),
    'zh-CN': parseTagsInput(zhCN),
    'zh-TW': parseTagsInput(zhTW),
  }
}

interface OpportunityEditModalProps {
  open: boolean
  mode: 'edit' | 'create'
  opportunity: Opportunity | null
  busy?: boolean
  onClose: () => void
  onSave: (input: OpportunityUpsertInput) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

export function OpportunityEditModal({
  open,
  mode,
  opportunity,
  busy = false,
  onClose,
  onSave,
  onDelete,
}: OpportunityEditModalProps) {
  const { t } = useI18n()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [msg, setMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setMsg(null)
    if (mode === 'edit' && opportunity) {
      setForm(fromOpportunity(opportunity))
    } else {
      setForm(emptyForm())
    }
  }, [open, mode, opportunity])

  if (!open) return null

  const set =
    (key: keyof FormState) =>
    (
      e: ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }))
    }

  const handleSave = async () => {
    setSaving(true)
    setMsg(null)
    try {
      const input: OpportunityUpsertInput = {
        id: form.id.trim(),
        type: form.type,
        status: form.status,
        deadline: form.deadline,
        imagePath: form.imagePath,
        sortOrder: Number(form.sortOrder) || 0,
        title: toLocalized(form.titleEn, form.titleZhCN, form.titleZhTW),
        location: toLocalized(
          form.locationEn,
          form.locationZhCN,
          form.locationZhTW,
        ),
        summary: toLocalized(
          form.summaryEn,
          form.summaryZhCN,
          form.summaryZhTW,
        ),
        host: toLocalized(form.hostEn, form.hostZhCN, form.hostZhTW),
        tags: toLocalizedList(form.tagsEn, form.tagsZhCN, form.tagsZhTW),
      }
      await onSave(input)
      setMsg(t('opp.admin.saved'))
      onClose()
    } catch (e) {
      const code = e instanceof Error ? e.message : ''
      if (code === 'INVALID_ID') setMsg(t('opp.admin.invalidId'))
      else if (code === 'INVALID_TITLE') setMsg(t('opp.admin.invalidTitle'))
      else if (code === 'INVALID_IMAGE') setMsg(t('opp.admin.invalidImage'))
      else setMsg(t('opp.admin.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete || !opportunity) return
    if (!window.confirm(t('opp.admin.confirmDelete'))) return
    setSaving(true)
    setMsg(null)
    try {
      await onDelete(opportunity.id)
      setMsg(t('opp.admin.deleted'))
      onClose()
    } catch {
      setMsg(t('opp.admin.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const disabled = busy || saving

  const field = (
    label: string,
    key: keyof FormState,
    opts?: { textarea?: boolean; disabled?: boolean },
  ) => (
    <label className="block text-xs text-hawk-muted">
      <span className="mb-1 block font-medium text-hawk-cream/90">{label}</span>
      {opts?.textarea ? (
        <textarea
          value={form[key]}
          onChange={set(key)}
          disabled={disabled || opts.disabled}
          rows={3}
          className="w-full rounded-lg border border-hawk-border bg-hawk-ink/60 px-3 py-2 text-sm text-hawk-cream outline-none focus:border-hawk-blue"
        />
      ) : (
        <input
          type="text"
          value={form[key]}
          onChange={set(key)}
          disabled={disabled || opts?.disabled}
          className="w-full rounded-lg border border-hawk-border bg-hawk-ink/60 px-3 py-2 text-sm text-hawk-cream outline-none focus:border-hawk-blue"
        />
      )}
    </label>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        className="hawk-card relative max-h-[92vh] w-full max-w-2xl overflow-y-auto p-5 sm:p-6"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={disabled}
          className="absolute right-3 top-3 rounded-full p-1.5 text-hawk-muted hover:bg-hawk-ink hover:text-hawk-cream"
          aria-label={t('opp.admin.close')}
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="pr-8 text-lg font-bold text-hawk-cream">
          {mode === 'create' ? t('opp.admin.createTitle') : t('opp.admin.editTitle')}
        </h2>
        <p className="mt-1 text-xs text-hawk-muted">{t('opp.admin.hint')}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {field(t('opp.admin.id'), 'id', { disabled: mode === 'edit' })}
          <label className="block text-xs text-hawk-muted">
            <span className="mb-1 block font-medium text-hawk-cream/90">
              {t('opp.admin.type')}
            </span>
            <select
              value={form.type}
              onChange={set('type')}
              disabled={disabled}
              className="w-full rounded-lg border border-hawk-border bg-hawk-ink/60 px-3 py-2 text-sm text-hawk-cream outline-none focus:border-hawk-blue"
            >
              <option value="event">{t('type.event')}</option>
              <option value="collab">{t('type.collab')}</option>
              <option value="content">{t('type.content')}</option>
            </select>
          </label>
          <label className="block text-xs text-hawk-muted">
            <span className="mb-1 block font-medium text-hawk-cream/90">
              {t('opp.admin.status')}
            </span>
            <select
              value={form.status}
              onChange={set('status')}
              disabled={disabled}
              className="w-full rounded-lg border border-hawk-border bg-hawk-ink/60 px-3 py-2 text-sm text-hawk-cream outline-none focus:border-hawk-blue"
            >
              <option value="open">{t('status.open')}</option>
              <option value="closing-soon">{t('status.closing-soon')}</option>
              <option value="ongoing">{t('status.ongoing')}</option>
            </select>
          </label>
          {field(t('opp.admin.deadline'), 'deadline')}
          {field(t('opp.admin.imagePath'), 'imagePath')}
          {field(t('opp.admin.sortOrder'), 'sortOrder')}
        </div>

        <div className="mt-5 space-y-3 border-t border-hawk-border/60 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-hawk-gold">
            {t('opp.admin.titles')}
          </p>
          {field(`${t('opp.admin.title')} (EN)`, 'titleEn')}
          {field(`${t('opp.admin.title')} (简)`, 'titleZhCN')}
          {field(`${t('opp.admin.title')} (繁)`, 'titleZhTW')}
        </div>

        <div className="mt-5 space-y-3 border-t border-hawk-border/60 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-hawk-gold">
            {t('opp.admin.location')}
          </p>
          {field(`${t('opp.admin.location')} (EN)`, 'locationEn')}
          {field(`${t('opp.admin.location')} (简)`, 'locationZhCN')}
          {field(`${t('opp.admin.location')} (繁)`, 'locationZhTW')}
        </div>

        <div className="mt-5 space-y-3 border-t border-hawk-border/60 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-hawk-gold">
            {t('opp.admin.summary')}
          </p>
          {field(`${t('opp.admin.summary')} (EN)`, 'summaryEn', {
            textarea: true,
          })}
          {field(`${t('opp.admin.summary')} (简)`, 'summaryZhCN', {
            textarea: true,
          })}
          {field(`${t('opp.admin.summary')} (繁)`, 'summaryZhTW', {
            textarea: true,
          })}
        </div>

        <div className="mt-5 space-y-3 border-t border-hawk-border/60 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-hawk-gold">
            {t('opp.admin.host')}
          </p>
          {field(`${t('opp.admin.host')} (EN)`, 'hostEn')}
          {field(`${t('opp.admin.host')} (简)`, 'hostZhCN')}
          {field(`${t('opp.admin.host')} (繁)`, 'hostZhTW')}
        </div>

        <div className="mt-5 space-y-3 border-t border-hawk-border/60 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-hawk-gold">
            {t('opp.admin.tags')}
          </p>
          <p className="text-[11px] text-hawk-muted">{t('opp.admin.tagsHint')}</p>
          {field(`${t('opp.admin.tags')} (EN)`, 'tagsEn')}
          {field(`${t('opp.admin.tags')} (简)`, 'tagsZhCN')}
          {field(`${t('opp.admin.tags')} (繁)`, 'tagsZhTW')}
        </div>

        {msg && (
          <p className="mt-4 text-sm text-hawk-gold" role="status">
            {msg}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => void handleSave()}
            className="hawk-btn hawk-btn-primary px-4 py-2 text-sm"
          >
            {t('opp.admin.save')}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onClose}
            className="hawk-btn hawk-btn-ghost px-4 py-2 text-sm"
          >
            {t('opp.admin.close')}
          </button>
          {mode === 'edit' && onDelete && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => void handleDelete()}
              className="hawk-btn ml-auto border border-red-500/40 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10"
            >
              {t('opp.admin.delete')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
