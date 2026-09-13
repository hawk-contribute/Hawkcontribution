import { useMemo } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useI18n } from '../i18n'
import {
  SECURITY_AUDIT_FINDINGS,
  SECURITY_AUDIT_META,
  SECURITY_AUDIT_NEXT_EN,
  SECURITY_AUDIT_NEXT_ZH,
  SECURITY_AUDIT_OK_EN,
  SECURITY_AUDIT_OK_ZH,
  type AuditSeverity,
} from '../data/securityAudit'

const SEVERITY_ORDER: AuditSeverity[] = [
  'critical',
  'high',
  'medium',
  'low',
  'info',
]

function severityClass(s: AuditSeverity): string {
  switch (s) {
    case 'critical':
      return 'border-red-500/50 bg-red-500/20 text-red-200'
    case 'high':
      return 'border-orange-400/50 bg-orange-500/20 text-orange-200'
    case 'medium':
      return 'border-amber-400/40 bg-amber-500/15 text-amber-100'
    case 'low':
      return 'border-sky-400/40 bg-sky-500/15 text-sky-100'
    default:
      return 'border-hawk-border bg-hawk-panel/80 text-hawk-muted'
  }
}

export function AuditView() {
  const { t, locale } = useI18n()
  const zh = locale !== 'en'

  const counts = useMemo(() => {
    const c: Record<AuditSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    }
    for (const f of SECURITY_AUDIT_FINDINGS) c[f.severity] += 1
    return c
  }, [])

  const findings = useMemo(
    () =>
      [...SECURITY_AUDIT_FINDINGS].sort(
        (a, b) =>
          SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
      ),
    [],
  )

  const okList = zh ? SECURITY_AUDIT_OK_ZH : SECURITY_AUDIT_OK_EN
  const nextList = zh ? SECURITY_AUDIT_NEXT_ZH : SECURITY_AUDIT_NEXT_EN

  return (
    <section>
      <div className="mb-6">
        <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-hawk-gold">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t('audit.badge')}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-hawk-cream sm:text-3xl">
          {t('audit.title')}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-hawk-muted sm:text-base">
          {t('audit.subtitle')}
        </p>
      </div>

      <div className="hawk-card mb-4 grid gap-3 p-5 sm:grid-cols-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-hawk-muted">
            {t('audit.date')}
          </p>
          <p className="mt-1 font-semibold text-hawk-cream">
            {SECURITY_AUDIT_META.date}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-hawk-muted">
            {t('audit.commit')}
          </p>
          <p className="mt-1 font-mono text-sm text-hawk-cream">
            {SECURITY_AUDIT_META.commit}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-hawk-muted">
            {t('audit.scope')}
          </p>
          <p className="mt-1 text-sm text-hawk-muted">
            {zh ? SECURITY_AUDIT_META.scopeZh : SECURITY_AUDIT_META.scopeEn}
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {SEVERITY_ORDER.map((s) => (
          <span
            key={s}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${severityClass(s)}`}
          >
            {t(`audit.sev.${s}`)}
            <span className="tabular-nums opacity-90">{counts[s]}</span>
          </span>
        ))}
      </div>

      <h2 className="mb-3 text-lg font-bold text-hawk-cream">
        {t('audit.findings')}
      </h2>
      <ul className="mb-8 space-y-3">
        {findings.map((f) => (
          <li key={f.id} className="hawk-card p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${severityClass(f.severity)}`}
              >
                {t(`audit.sev.${f.severity}`)}
              </span>
              <span className="text-xs text-hawk-muted">
                {zh ? f.areaZh : f.areaEn}
              </span>
            </div>
            <h3 className="mt-2 text-base font-semibold text-hawk-cream">
              {zh ? f.titleZh : f.titleEn}
            </h3>
            {!zh && (
              <p className="mt-1 text-xs text-hawk-gold/80">{f.titleZh}</p>
            )}
            {zh && (
              <p className="mt-1 text-xs text-hawk-gold/80">{f.titleEn}</p>
            )}
            <p className="mt-2 text-sm leading-relaxed text-hawk-muted">
              {zh ? f.detailZh : f.detailEn}
            </p>
            <p className="mt-2 font-mono text-[11px] text-hawk-muted/90">
              {f.paths.join(' · ')}
            </p>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="hawk-card p-5">
          <h2 className="text-lg font-bold text-hawk-cream">{t('audit.ok')}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-hawk-muted">
            {okList.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div className="hawk-card border-hawk-gold/30 p-5">
          <h2 className="text-lg font-bold text-hawk-cream">{t('audit.next')}</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-hawk-muted">
            {nextList.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-hawk-muted">{t('audit.fileNote')}</p>
        </div>
      </div>
    </section>
  )
}
