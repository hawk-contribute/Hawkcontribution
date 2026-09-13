import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Megaphone, RefreshCw } from 'lucide-react'
import { useI18n } from '../i18n'
import { CURATED_NEWS, NEWS_SOURCE } from '../lib/news'

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
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.twttr?.widgets) {
    return new Promise((resolve) => {
      window.twttr!.ready(() => resolve())
    })
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
      // If already loaded
      if (window.twttr?.widgets) {
        window.twttr.ready(() => resolve())
      }
      return
    }
    const s = document.createElement('script')
    s.src = NEWS_SOURCE.widgetsScript
    s.async = true
    s.charset = 'utf-8'
    s.onload = () => {
      if (window.twttr) {
        window.twttr.ready(() => resolve())
      } else {
        resolve()
      }
    }
    s.onerror = () => reject(new Error('Failed to load X widgets.js'))
    document.body.appendChild(s)
  })
}

export function NewsView() {
  const { t } = useI18n()
  const mountRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>(
    'loading',
  )
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const el = mountRef.current
    if (!el) return

    el.innerHTML = ''
    setStatus('loading')

    const run = async () => {
      try {
        await loadTwitterWidgets()
        if (cancelled || !mountRef.current) return

        const host = mountRef.current
        host.innerHTML = ''

        // Prefer createTimeline when available (cleaner SPA remount).
        if (window.twttr?.widgets?.createTimeline) {
          await window.twttr.widgets.createTimeline(
            {
              sourceType: 'profile',
              screenName: NEWS_SOURCE.handle,
            },
            host,
            {
              height: 640,
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
          a.setAttribute('data-height', '640')
          a.setAttribute('data-dnt', 'true')
          a.textContent = NEWS_SOURCE.handleAt
          host.appendChild(a)
          await window.twttr?.widgets?.load(host)
        }

        if (cancelled) return
        // Heuristic: if no iframe after load, treat as unavailable
        const hasEmbed = !!host.querySelector('iframe')
        if (hasEmbed) {
          setStatus('ready')
          setUpdatedAt(new Date().toISOString())
        } else {
          setStatus('unavailable')
        }
      } catch {
        if (!cancelled) setStatus('unavailable')
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const formatUpdated = (iso: string) => {
    try {
      return new Date(iso).toLocaleString()
    } catch {
      return iso
    }
  }

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
          {t('news.subtitle', { handle: NEWS_SOURCE.handleAt })}
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
          {updatedAt && status === 'ready' && (
            <p className="mt-1 text-[11px]">
              {t('news.updated', { time: formatUpdated(updatedAt) })}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="hawk-btn hawk-btn-ghost px-3 py-2 text-sm"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${status === 'loading' ? 'animate-spin' : ''}`}
            />
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

      <div className="hawk-card overflow-hidden p-3 sm:p-4">
        {status === 'loading' && (
          <p className="px-2 py-6 text-center text-sm text-hawk-muted">
            {t('news.loading')}
          </p>
        )}
        {status === 'unavailable' && (
          <div className="px-3 py-8 text-center">
            <p className="text-sm text-hawk-muted">{t('news.unavailable')}</p>
            <a
              href={NEWS_SOURCE.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hawk-btn hawk-btn-primary mt-4 inline-flex px-4 py-2.5 text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              {t('news.openOnX')}
            </a>
          </div>
        )}
        <div
          ref={mountRef}
          className={`min-h-[12rem] overflow-hidden rounded-xl ${
            status === 'unavailable' ? 'hidden' : ''
          }`}
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
                  {item.summary}
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
