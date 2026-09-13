import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, Megaphone, RefreshCw, Trash2, Upload } from 'lucide-react'
import type { Session } from '../types'
import { useI18n } from '../i18n'
import { isSiteAdmin } from '../lib/admins'
import {
  NEWS_SOURCE,
  NEWS_WINDOW_DAYS,
  clearNewsSessionAttempt,
  deleteNewsPost,
  loadNews,
  parseNewsImportJson,
  upsertNewsPost,
  upsertNewsPostsBatch,
  type NewsLoadResult,
  type NewsPost,
} from '../lib/news'

interface NewsViewProps {
  session: Session | null
}

function formatWhen(iso: string, locale: string): string {
  const tag = locale === 'en' ? 'en-US' : locale === 'zh-CN' ? 'zh-CN' : 'zh-TW'
  try {
    return new Intl.DateTimeFormat(tag, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function NewsView({ session }: NewsViewProps) {
  const { t, locale } = useI18n()
  const admin = isSiteAdmin(session?.email)

  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<NewsLoadResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [formId, setFormId] = useState('')
  const [formUrl, setFormUrl] = useState('')
  const [formBody, setFormBody] = useState('')
  const [formAt, setFormAt] = useState(() => new Date().toISOString().slice(0, 16))
  const [toast, setToast] = useState<string | null>(null)

  const refresh = useCallback(
    async (force: boolean) => {
      setLoading(true)
      if (force) clearNewsSessionAttempt()
      const next = await loadNews({
        force,
        allowScrape: admin && force,
      })
      setResult(next)
      setLoading(false)
    },
    [admin],
  )

  useEffect(() => {
    void refresh(false)
  }, [refresh])

  const flash = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2500)
  }

  const onPasteSave = async () => {
    if (!admin) return
    setBusy(true)
    try {
      const local = formAt.includes('T') ? new Date(formAt) : new Date(formAt)
      await upsertNewsPost({
        id: formId.trim(),
        url: formUrl.trim(),
        body: formBody,
        publishedAt: Number.isNaN(local.getTime())
          ? new Date().toISOString()
          : local.toISOString(),
        authorHandle: NEWS_SOURCE.handle,
        source: 'admin-paste',
      })
      setFormId('')
      setFormUrl('')
      setFormBody('')
      flash(t('news.adminSaved'))
      await refresh(true)
    } catch {
      flash(t('news.adminSaveFailed'))
    } finally {
      setBusy(false)
    }
  }

  const onDelete = async (id: string) => {
    if (!admin) return
    if (!window.confirm(t('news.adminConfirmDelete'))) return
    setBusy(true)
    try {
      await deleteNewsPost(id)
      flash(t('news.adminDeleted'))
      await refresh(true)
    } catch {
      flash(t('news.adminDeleteFailed'))
    } finally {
      setBusy(false)
    }
  }

  const onImportFile = async (file: File) => {
    if (!admin) return
    setBusy(true)
    try {
      const raw = await file.text()
      const items = parseNewsImportJson(raw)
      if (!items.length) throw new Error('empty')
      const n = await upsertNewsPostsBatch(items)
      flash(t('news.adminImported', { n }))
      await refresh(true)
    } catch {
      flash(t('news.adminImportFailed'))
    } finally {
      setBusy(false)
    }
  }

  const posts: NewsPost[] = result?.posts ?? []

  return (
    <section>
      <div className="mb-6">
        <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-hawk-gold">
          <Megaphone className="h-3.5 w-3.5" />
          {t('news.badge')}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-hawk-cream sm:text-3xl">
          {t('news.title')}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-hawk-muted sm:text-base">
          {t('news.subtitle', {
            handle: NEWS_SOURCE.handleAt,
            days: NEWS_WINDOW_DAYS,
          })}
        </p>
        <p className="mt-1 text-xs text-hawk-muted">
          {t('news.windowNote', { days: NEWS_WINDOW_DAYS })}
        </p>
      </div>

      <div className="hawk-card mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-sm text-hawk-muted">
          <p>
            {t('news.source')}:{' '}
            <span className="font-semibold text-hawk-cream">
              {NEWS_SOURCE.platform} {NEWS_SOURCE.handleAt}
            </span>
          </p>
          {result?.fetchedAt && (
            <p className="mt-1 text-[11px]">
              {t('news.updated', { time: formatWhen(result.fetchedAt, locale) })}
              {result.fromCache ? ` · ${t('news.fromCache')}` : ''}
              {result.source === 'supabase' ? ` · ${t('news.sourceCloud')}` : ''}
            </p>
          )}
          {result?.cooldownUntil && result.status !== 'posts' && (
            <p className="mt-1 text-[11px] text-hawk-gold/90">
              {t('news.cooldownNote', {
                time: formatWhen(result.cooldownUntil, locale),
              })}
            </p>
          )}
          {toast && (
            <p className="mt-1 text-[11px] font-medium text-hawk-gold">{toast}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void refresh(true)}
            className="hawk-btn hawk-btn-ghost px-3 py-2 text-sm"
            disabled={loading || busy}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t('news.reload')}
          </button>
          <a
            href={NEWS_SOURCE.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hawk-btn hawk-btn-primary px-3 py-2 text-sm"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t('news.openOnX')}
          </a>
        </div>
      </div>

      {admin && (
        <div className="hawk-card mb-4 border-hawk-gold/30 p-4 sm:p-5">
          <h2 className="text-sm font-bold text-hawk-gold">{t('news.adminTitle')}</h2>
          <p className="mt-1 text-xs text-hawk-muted">{t('news.adminHint')}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-hawk-muted">
              {t('news.adminId')}
              <input
                className="hawk-input mt-1"
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
                placeholder="2091542826987425844"
              />
            </label>
            <label className="block text-xs text-hawk-muted">
              {t('news.adminUrl')}
              <input
                className="hawk-input mt-1"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://x.com/Hawk_killshib/status/…"
              />
            </label>
            <label className="block text-xs text-hawk-muted sm:col-span-2">
              {t('news.adminPublished')}
              <input
                type="datetime-local"
                className="hawk-input mt-1"
                value={formAt}
                onChange={(e) => setFormAt(e.target.value)}
              />
            </label>
            <label className="block text-xs text-hawk-muted sm:col-span-2">
              {t('news.adminBody')}
              <textarea
                className="hawk-input mt-1 min-h-[120px]"
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                placeholder={t('news.adminBodyPlaceholder')}
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="hawk-btn hawk-btn-primary px-4 py-2 text-sm"
              disabled={busy || !formBody.trim()}
              onClick={() => void onPasteSave()}
            >
              {t('news.adminSave')}
            </button>
            <label className="hawk-btn hawk-btn-ghost cursor-pointer px-4 py-2 text-sm">
              <Upload className="h-3.5 w-3.5" />
              {t('news.adminImport')}
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void onImportFile(f)
                  e.target.value = ''
                }}
              />
            </label>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading && (
          <div className="hawk-card px-6 py-10 text-center text-sm text-hawk-muted">
            {t('news.loading')}
          </div>
        )}

        {!loading && posts.length === 0 && result?.status === 'empty' && (
          <div className="hawk-card px-6 py-10 text-center">
            <p className="text-sm font-medium text-hawk-cream">
              {t('news.empty30', { days: NEWS_WINDOW_DAYS })}
            </p>
            <p className="mt-2 text-xs text-hawk-muted">{t('news.noRepeatSearch')}</p>
            <a
              href={NEWS_SOURCE.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hawk-btn hawk-btn-primary mt-5 inline-flex px-4 py-2.5 text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              {t('news.openOnX')}
            </a>
          </div>
        )}

        {!loading && posts.length === 0 && result?.status === 'unavailable' && (
          <div className="hawk-card px-6 py-10 text-center">
            <p className="text-sm text-hawk-muted">{t('news.unavailable')}</p>
            <p className="mt-2 text-xs text-hawk-muted">{t('news.noRepeatSearch')}</p>
            <a
              href={NEWS_SOURCE.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hawk-btn hawk-btn-primary mt-5 inline-flex px-4 py-2.5 text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              {t('news.openOnX')}
            </a>
          </div>
        )}

        {!loading &&
          posts.map((p) => (
            <article key={p.id} className="hawk-card p-5 text-left">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-hawk-gold">
                    {p.authorHandle || NEWS_SOURCE.handleAt}
                  </p>
                  <p className="mt-0.5 text-[11px] text-hawk-muted">
                    {formatWhen(p.publishedAt, locale)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hawk-btn hawk-btn-ghost px-2.5 py-1 text-xs"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {t('news.openPost')}
                  </a>
                  {admin && (
                    <button
                      type="button"
                      className="hawk-btn hawk-btn-ghost px-2.5 py-1 text-xs text-red-300 hover:text-red-200"
                      onClick={() => void onDelete(p.id)}
                      disabled={busy}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t('news.adminDelete')}
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-hawk-cream">
                {p.text}
              </p>
            </article>
          ))}
      </div>

      <p className="mt-4 text-center text-[11px] text-hawk-muted">
        {t('news.pasteNote')}
      </p>
    </section>
  )
}
