import { ShieldCheck } from 'lucide-react'
import { useI18n } from '../i18n'

const REVIEW_DATE = '2026-09-13'

export function AuditView() {
  const { t } = useI18n()

  return (
    <section className="mx-auto max-w-xl">
      <div className="hawk-card flex flex-col items-center px-6 py-10 text-center sm:px-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-100">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          {t('audit.badge')}
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-hawk-cream sm:text-3xl">
          {t('audit.title')}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-hawk-muted sm:text-base">
          {t('audit.statement')}
        </p>
        <p className="mt-5 text-xs text-hawk-muted/80">
          {t('audit.reviewedOn', { date: REVIEW_DATE })}
        </p>
      </div>
    </section>
  )
}
