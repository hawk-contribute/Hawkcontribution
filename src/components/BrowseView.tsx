import { useMemo, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import type { Opportunity, OpportunityType } from '../types'
import { useI18n } from '../i18n'
import { asset } from '../lib/asset'
import { OpportunityCard } from './OpportunityCard'

type Filter = 'all' | OpportunityType

interface BrowseViewProps {
  opportunities: Opportunity[]
  onJoin: (opportunity: Opportunity) => void
}

export function BrowseView({ opportunities, onJoin }: BrowseViewProps) {
  const { t } = useI18n()
  const [filter, setFilter] = useState<Filter>('all')

  const filters: { id: Filter; labelKey: string }[] = [
    { id: 'all', labelKey: 'filter.all' },
    { id: 'event', labelKey: 'filter.event' },
    { id: 'collab', labelKey: 'filter.collab' },
    { id: 'content', labelKey: 'filter.content' },
  ]

  const filtered = useMemo(() => {
    if (filter === 'all') return opportunities
    return opportunities.filter((o) => o.type === filter)
  }, [opportunities, filter])

  return (
    <section>
      <div className="hawk-card relative mb-8 overflow-hidden p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-6 -top-8 h-40 w-40 rounded-full bg-hawk-blue/20 blur-3xl sm:h-56 sm:w-56" />
        <div className="pointer-events-none absolute -bottom-10 left-1/3 h-32 w-32 rounded-full bg-hawk-gold/10 blur-3xl" />
        <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-hawk-blue/30 bg-hawk-blue/10 px-2.5 py-0.5 text-xs font-semibold text-hawk-blue-bright">
              {t('hero.badge')}
            </p>
            <p className="mb-3 text-sm font-semibold tracking-wide text-hawk-gold sm:text-base">
              {t('brand.slogan')}
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-hawk-cream sm:text-3xl">
              {t('hero.title')}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-hawk-muted sm:text-base">
              {t('hero.body')}
            </p>
            <a
              href="https://hawk.city"
              target="_blank"
              rel="noopener noreferrer"
              className="hawk-btn hawk-btn-primary mt-5 px-4 py-2.5 text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              {t('brand.officialSite')}
            </a>
          </div>
          <img
            src={asset('brand/hawk-token.png')}
            alt="Hawk Token"
            className="mx-auto h-28 w-28 shrink-0 drop-shadow-[0_8px_28px_rgba(0,113,188,0.45)] sm:mx-0 sm:h-36 sm:w-36"
          />
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`hawk-btn rounded-full px-3.5 py-1.5 text-sm ${
              filter === f.id
                ? 'bg-hawk-blue text-white shadow-md shadow-hawk-blue/30'
                : 'hawk-btn-ghost'
            }`}
          >
            {t(f.labelKey)}
          </button>
        ))}
      </div>

      <p className="mb-4 text-xs text-hawk-muted">{t('browse.count', { n: filtered.length })}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((opp) => (
          <OpportunityCard key={opp.id} opportunity={opp} onJoin={onJoin} />
        ))}
      </div>
    </section>
  )
}
