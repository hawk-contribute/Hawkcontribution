import { useCallback, useEffect, useRef, useState } from 'react'
import { ExternalLink, Megaphone, RefreshCw } from 'lucide-react'
import { useI18n } from '../i18n'
import {
  CURATED_NEWS,
  NEWS_SOURCE,
  NEWS_WINDOW_DAYS,
  canLoadEmbedFallback,
  clearNewsSessionAttempt,
  loadNews,
  markEmbedAttempt,
  type NewsLoadResult,
  type NewsPost,
} from '../lib/news'

declare global {
  interface Window {
    twttr?: {
      ready: (cb: () => void) => void
      widgets: {
        load: (el?: HTMLElement | null) => Promise<unknown[]>
        createTimeline?: (
          source: { sourceType: string; screenName: string },
          el: HTMLElement,
          opts?: Record<string, unknown>,
        ) => Promise<unknown>
      }
    }
  }
}

function loadTwitterWidgets(): Promise<void> {
  if (window.twttr?.widgets) {
    return new Promise((resolve) => window.twttr!.ready(() => resolve()))
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${NEWS_SOURCE.widgetsScript}"]`,
    )
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () =>
        reject(new Error('widgets script failed')),
      )
      if (window.twttr?.widgets) window.twttr.ready(() => resolve())
      return
    }
    const s = document.createElement('script')
    s.src = NEWS_SOURCE.widgetsScript
    s.async = true
    s.charset = 'utf-8'
    s.onload = () => {
      if (window.twttr) window.twttr.ready(() => resolve())
      else resolve()
    }
    s.onerror = () => reject(new Error('Failed to load X widgets.js'))
    document.body.appendChild(s)
  })
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

export function NewsView() {
  const { t, locale } = useI18n()
  const embedRef = useRef<HTMLDivElement>(null)
  const embedRanForFetch = useRef<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<NewsLoadResult | null>(null)
  const [embedStatus, setEmbedStatus] = useState<
    'idle' | 'loading' | 'ready' | 'skipped' | 'failed'
  >('idle')
  const [forceTick, setForceTick] = useState(0)

  const runLoad = useCallback(async (force: boolean) => {
    setLoading(true)
    setEmbedStatus('idle')
    if (embedRef.current) embedRef.current.innerHTML = ''
    embedRanForFetch.current = null
    const next = await loadNews({ force })
    setResult(next)
    setLoading(false)
  }, [])

  // Initial load once — no interval, no focus polling
  useEffect(() => {
    void runLoad(false)
  }, [runLoad])

  // Manual reload
  useEffect(() => {
    if (forceTick === 0) return
    clearNewsSessionAttempt()
    void runLoad(true)
  }, [forceTick, runLoad])

  // Embed fallback only when dated fetch unavailable; at most once per fetch id / cooldown
  useEffect(() => {
    if (loading || !result) return
    if (result.status === 'posts' && result.posts.length > 0) {
      setEmbedStatus('skipped')
      return
    }
    if (result.status === 'empty') {
      setEmbedStatus('skipped')
      return
    }
    // unavailable
    const fetchId = result.fetchedAt
    if (embedRanForFetch.current === fetchId) return

    const force = forceTick > 0
    if (!canLoadEmbedFallback(force)) {
      setEmbedStatus('skipped')
      return
    }

    embedRanForFetch.current = fetchId
    const host = embedRef.current
    if (!host) {
      setEmbedStatus('failed')
      return
    }

    let cancelled = false
    setEmbedStatus('loading')
    ;(async () => {
      try {
        await loadTwitterWidgets()
        if (cancelled || !embedRef.current) return
        const el = embedRef.current
        el.innerHTML = ''
        if (window.twttr?.widgets?.createTimeline) {
          await window.twttr.widgets.createTimeline(
            { sourceType: 'profile', screenName: NEWS_SOURCE.handle },
            el,
            {
              height: 560,
              theme: 'dark',
              chrome: 'noheader nofooter transparent',
              dnt: true,
            },
          )
        } else {
          const a = document.createElement('a')
          a.className = 'twitter-timeline'
          a.href = NEWS_SOURCE.embedProfileUrl
          a.setAttribute('data-theme', 'dark')
          a.setAttribute('data-chrome', 'noheader nofooter transparent')
          a.setAttribute('data-height', '560')
          a.setAttribute('data-dnt', 'true')
          a.textContent = NEWS_SOURCE.handleAt
          el.appendChild(a)
          await window.twttr?.widgets?.load(el)
        }
        if (cancelled) return
        const ok = !!el.querySelector('iframe')
        markEmbedAttempt(ok)
        setEmbedStatus(ok ? 'ready' : 'failed')
      } catch {
        if (!cancelled) {
          markEmbedAttempt(false)
          setEmbedStatus('failed')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [loading, result, forceTick])

  const posts: NewsPost[] = result?.posts ?? []
  const showPosts = !loading && posts.length > 0
  const showEmpty = !loading && result?.status === 'empty'
  const showUnavailableBlock =
    !loading &&
    result?.status === 'unavailable' &&
    (embedStatus === 'failed' || embedStatus === 'skipped')

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
              {t('news.updated', {
                time: formatWhen(result.fetchedAt, locale),
              })}
              {result.fromCache ? ` · ${t('news.fromCache')}` : ''}
            </p>
          )}
          {result?.cooldownUntil &&
            (result.status === 'empty' || result.status === 'unavailable') && (
              <p className="mt-1 text-[11px] text-hawk-gold/90">
                {t('news.cooldownNote', {
                  time: formatWhen(result.cooldownUntil, locale),
                })}
              </p>
            )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setForceTick((n) => n + 1)}
            className="hawk-btn hawk-btn-ghost px-3 py-2 text-sm"
            disabled={loading}
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

      <div className="hawk-card overflow-hidden p-4 sm:p-5">
        {loading && (
          <p className="py-8 text-center text-sm text-hawk-muted">
            {t('news.loading')}
          </p>
        )}

        {showPosts && (
          <ul className="divide-y divide-hawk-border/60">
            {posts.map((p) => (
              <li key={p.id} className="py-3 first:pt-0 last:pb-0">
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg px-1 py-1 transition hover:bg-hawk-ink/50"
                >
                  <p className="text-sm leading-relaxed text-hawk-cream">{p.text}</p>
                  <p className="mt-1.5 text-[11px] text-hawk-muted">
                    {formatWhen(p.publishedAt, locale)} · {t('news.openPost')}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        )}

        {showEmpty && (
          <div className="px-2 py-8 text-center">
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

        {showUnavailableBlock && (
          <div className="px-2 py-8 text-center">
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

        {(embedStatus === 'loading' || embedStatus === 'ready') && (
          <div className="mt-2">
            {embedStatus === 'loading' && (
              <p className="mb-3 text-center text-xs text-hawk-muted">
                {t('news.embedLoading')}
              </p>
            )}
            {embedStatus === 'ready' && (
              <p className="mb-3 text-xs text-hawk-muted">
                {t('news.embedFallbackNote', { days: NEWS_WINDOW_DAYS })}
              </p>
            )}
          </div>
        )}
        <div
          ref={embedRef}
          className={
            embedStatus === 'loading' || embedStatus === 'ready'
              ? 'min-h-[8rem] overflow-hidden rounded-xl'
              : 'hidden'
          }
        />
      </div>

      {CURATED_NEWS.length > 0 && (
        <div className="hawk-card mt-4 p-4">
          <h2 className="text-sm font-semibold text-hawk-cream">
            {t('news.curatedTitle')}
          </h2>
          <ul className="mt-3 space-y-2">
            {CURATED_NEWS.map((item) => (
              <li key={item.id}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-hawk-blue-bright hover:underline"
                >
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-center text-[11px] text-hawk-muted">
        {t('news.embedNote')}
      </p>
    </section>
  )
}
