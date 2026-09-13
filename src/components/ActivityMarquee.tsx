import { useMemo } from 'react'
import type { ActivityEvent } from '../types'
import { useI18n } from '../i18n'

interface ActivityMarqueeProps {
  activities: ActivityEvent[]
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

export function ActivityMarquee({ activities }: ActivityMarqueeProps) {
  const { t, locale } = useI18n()

  const items = useMemo(() => {
    const list = activities.length ? activities : []
    return list.map((a) =>
      t(`activity.${a.kind}`, {
        name: a.actorName,
        title: a.contributionTitle,
        time: formatTime(a.at, locale),
      }),
    )
  }, [activities, t, locale])

  if (!items.length) return null

  // Duplicate for seamless loop
  const loop = [...items, ...items]

  return (
    <div className="border-b border-hawk-border/80 bg-hawk-ink/90">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2 sm:px-6">
        <span className="shrink-0 rounded-full bg-hawk-gold/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-hawk-gold">
          {t('marquee.label')}
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
    </div>
  )
}
