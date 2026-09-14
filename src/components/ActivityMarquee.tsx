import { useMemo } from 'react'
import { Trash2 } from 'lucide-react'
import type { ActivityEvent } from '../types'
import { useI18n } from '../i18n'
import { isSiteAdmin } from '../lib/admins'
import { isWithinActivityWindow } from '../lib/communityCloud'

interface ActivityMarqueeProps {
  activities: ActivityEvent[]
  sessionEmail?: string | null
  onAdminDeleteActivity?: (id: string) => void | Promise<void>
}

function formatTime(iso: string, locale: string): string {
  const tag = locale === 'en' ? 'en-US' : locale === 'zh-CN' ? 'zh-CN' : 'zh-TW'
  try {
    return new Intl.DateTimeFormat(tag, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso.slice(11, 16)
  }
}

export function ActivityMarquee({
  activities,
  sessionEmail,
  onAdminDeleteActivity,
}: ActivityMarqueeProps) {
  const { t, locale } = useI18n()
  const admin = isSiteAdmin(sessionEmail)

  // Community activities only (skip donate-*); already ≤24h from App, filter again for safety
  const community = useMemo(
    () =>
      activities.filter(
        (a) => !a.id.startsWith('donate-') && isWithinActivityWindow(a.at),
      ),
    [activities],
  )

  const recent = useMemo(
    () => activities.filter((a) => isWithinActivityWindow(a.at)),
    [activities],
  )

  const items = useMemo(() => {
    return recent.map((a) =>
      t(`activity.${a.kind}`, {
        name: a.actorName,
        title: a.contributionTitle,
        time: formatTime(a.at, locale),
      }),
    )
  }, [recent, t, locale])

  if (!items.length && !(admin && community.length)) return null

  const loop = items.length ? [...items, ...items] : []

  return (
    <div className="border-b border-hawk-border/80 bg-hawk-ink/90">
      {items.length > 0 && (
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2 sm:px-6">
          <span className="shrink-0 rounded-full bg-hawk-gold/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-hawk-gold">
            {t('marquee.label')}
          </span>
          <span className="hidden shrink-0 text-[10px] text-hawk-muted sm:inline">
            {t('marquee.windowNote')}
          </span>
          <div className="relative min-w-0 flex-1 overflow-hidden">
            <div className="hawk-marquee flex w-max gap-10 whitespace-nowrap text-sm text-hawk-cream/90">
              {loop.map((text, i) => (
                <span key={`${i}-${text.slice(0, 12)}`} className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-hawk-blue-bright" />
                  {text}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {admin && onAdminDeleteActivity && community.length > 0 && (
        <div className="mx-auto max-w-5xl border-t border-hawk-border/40 px-4 py-2 sm:px-6">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-hawk-gold">
            {t('admin.activityModeration')}
          </p>
          <ul className="flex max-h-28 flex-col gap-1 overflow-y-auto text-xs text-hawk-muted">
            {community.slice(0, 20).map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-2 rounded-md bg-hawk-panel/40 px-2 py-1"
              >
                <span className="min-w-0 truncate text-hawk-cream/90">
                  {t(`activity.${a.kind}`, {
                    name: a.actorName,
                    title: a.contributionTitle,
                    time: formatTime(a.at, locale),
                  })}
                </span>
                <button
                  type="button"
                  className="shrink-0 text-red-300 hover:text-red-200"
                  title={t('admin.deleteActivity')}
                  onClick={() => {
                    if (window.confirm(t('admin.confirmActivity'))) {
                      void onAdminDeleteActivity(a.id)
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
