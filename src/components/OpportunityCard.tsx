import { Calendar, MapPin, Sparkles } from 'lucide-react'
import type { Opportunity } from '../types'
import { useI18n } from '../i18n'

interface OpportunityCardProps {
  opportunity: Opportunity
  onJoin: (opportunity: Opportunity) => void
}

export function OpportunityCard({ opportunity, onJoin }: OpportunityCardProps) {
  const { t, lx, lxList } = useI18n()

  const statusColor =
    opportunity.status === 'closing-soon'
      ? 'text-hawk-gold bg-hawk-gold/15'
      : opportunity.status === 'ongoing'
        ? 'text-emerald-300 bg-emerald-500/15'
        : 'text-hawk-blue-bright bg-hawk-blue/15'

  const tags = lxList(opportunity.tags)

  return (
    <article className="hawk-card flex flex-col overflow-hidden p-0 text-left">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-hawk-ink">
        <img
          src={opportunity.image}
          alt=""
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-hawk-panel via-transparent to-black/20" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-hawk-black/70 px-2.5 py-0.5 text-xs font-semibold text-hawk-cream backdrop-blur-sm">
            {t(`type.${opportunity.type}`)}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold backdrop-blur-sm ${statusColor}`}
          >
            {t(`status.${opportunity.status}`)}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base font-bold leading-snug text-hawk-cream sm:text-lg">
          {lx(opportunity.title)}
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-hawk-muted">
          {lx(opportunity.summary)}
        </p>

        <div className="mt-4 space-y-1.5 text-xs text-hawk-muted">
          <p className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-hawk-gold" />
            {lx(opportunity.host)}
          </p>
          <p className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {lx(opportunity.location)}
          </p>
          <p className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {t('card.deadline')}：{opportunity.deadline}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-hawk-border px-2 py-0.5 text-[11px] text-hawk-muted"
            >
              #{tag}
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onJoin(opportunity)}
          className="hawk-btn hawk-btn-primary mt-5 w-full px-4 py-2.5 text-sm"
        >
          {t('card.join')}
        </button>
      </div>
    </article>
  )
}
