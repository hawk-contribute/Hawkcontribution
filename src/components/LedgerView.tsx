import { ExternalLink } from 'lucide-react'
import type { Contribution } from '../types'
import { useI18n } from '../i18n'

interface LedgerViewProps {
  contributions: Contribution[]
  onBrowse: () => void
}

function formatDate(iso: string, locale: string): string {
  const tag = locale === 'en' ? 'en-US' : locale === 'zh-CN' ? 'zh-CN' : 'zh-TW'
  try {
    return new Intl.DateTimeFormat(tag, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function LedgerView({ contributions, onBrowse }: LedgerViewProps) {
  const { t, locale } = useI18n()

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-hawk-cream sm:text-3xl">
            {t('ledger.title')}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-hawk-muted sm:text-base">
            {t('ledger.subtitle')}
          </p>
        </div>
        {contributions.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-hawk-gold/25 bg-hawk-gold/10 px-3 py-2">
            <img src="/brand/hawk-token.png" alt="" className="h-8 w-8" aria-hidden />
            <span className="text-sm font-semibold text-hawk-gold">
              {t('ledger.count', { n: contributions.length })}
            </span>
          </div>
        )}
      </div>

      {contributions.length === 0 ? (
        <div className="hawk-card flex flex-col items-center px-6 py-14 text-center">
          <img
            src="/brand/hawk-token.png"
            alt="Hawk Token"
            className="mb-4 h-24 w-24 opacity-90 drop-shadow-[0_6px_20px_rgba(254,186,69,0.25)]"
          />
          <p className="font-medium text-hawk-cream">{t('ledger.emptyTitle')}</p>
          <p className="mt-1 max-w-sm text-sm text-hawk-muted">{t('ledger.emptyBody')}</p>
          <button
            type="button"
            onClick={onBrowse}
            className="hawk-btn hawk-btn-primary mt-5 px-5 py-2.5 text-sm"
          >
            {t('ledger.browse')}
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {contributions.map((c) => (
            <li key={c.id} className="hawk-card p-5 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-hawk-blue/15 px-2.5 py-0.5 text-xs font-semibold text-hawk-blue-bright">
                  {t(`type.${c.opportunityType}`)}
                </span>
                <span className="text-xs text-hawk-muted">
                  {formatDate(c.createdAt, locale)}
                </span>
              </div>
              <h3 className="mt-2 text-base font-bold text-hawk-cream">{c.title}</h3>
              <p className="mt-1 text-sm text-hawk-muted">{c.description}</p>
              <p className="mt-3 text-xs text-hawk-muted">
                {t('ledger.forOpportunity')}：
                <span className="text-hawk-cream/90">{c.opportunityTitle}</span>
              </p>
              <p className="mt-1 text-xs text-hawk-muted">
                {t('ledger.participant')}：{c.participantName}
              </p>
              {c.proofUrl && (
                <a
                  href={c.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-hawk-blue-bright hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t('ledger.proof')}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
