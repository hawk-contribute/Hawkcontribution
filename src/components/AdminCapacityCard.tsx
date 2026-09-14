import { Gauge } from 'lucide-react'
import { useI18n } from '../i18n'
import { isSiteAdmin } from '../lib/admins'

const TRIGGERS = [
  'capacity.trigger.egress',
  'capacity.trigger.db',
  'capacity.trigger.pause',
  'capacity.trigger.backups',
  'capacity.trigger.realtime',
  'capacity.trigger.storage',
] as const

/**
 * Ops checklist for Free → Pro upgrade triggers.
 * Visible only to site admins (client allowlist; same emails as is_site_admin).
 */
export function AdminCapacityCard({ email }: { email?: string | null }) {
  const { t } = useI18n()
  if (!isSiteAdmin(email)) return null

  return (
    <div className="hawk-card mt-6 border border-amber-400/30 bg-amber-500/5 px-5 py-5 text-left sm:px-6">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 inline-flex rounded-full border border-amber-400/40 bg-amber-500/15 p-1.5 text-amber-100">
          <Gauge className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-200/90">
            {t('capacity.adminOnly')}
          </p>
          <h2 className="mt-1 text-base font-bold text-hawk-cream">
            {t('capacity.title')}
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-hawk-muted">
            {t('capacity.intro')}
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-hawk-cream/90">
            {TRIGGERS.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] leading-relaxed text-hawk-muted">
            {t('capacity.note')}
          </p>
        </div>
      </div>
    </div>
  )
}
