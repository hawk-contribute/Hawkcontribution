import { useI18n } from '../i18n'

export interface CommunityStats {
  total: number
  byCategory: { event: number; collab: number; content: number }
  likes: number
  comments: number
  quotes: number
  members: number
}

export function StatsBar({ stats }: { stats: CommunityStats }) {
  const { t } = useI18n()
  const cells = [
    { label: t('stats.total'), value: stats.total },
    { label: t('stats.event'), value: stats.byCategory.event },
    { label: t('stats.collab'), value: stats.byCategory.collab },
    { label: t('stats.content'), value: stats.byCategory.content },
    { label: t('stats.likes'), value: stats.likes },
    { label: t('stats.comments'), value: stats.comments },
    { label: t('stats.quotes'), value: stats.quotes },
    { label: t('stats.members'), value: stats.members },
  ]

  return (
    <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {cells.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-hawk-border bg-hawk-panel/80 px-3 py-2 text-center"
          >
            <p className="text-lg font-bold text-hawk-gold sm:text-xl">{c.value}</p>
            <p className="truncate text-[10px] font-medium uppercase tracking-wide text-hawk-muted sm:text-xs">
              {c.label}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-hawk-muted">{t('feed.localNote')}</p>
    </div>
  )
}
