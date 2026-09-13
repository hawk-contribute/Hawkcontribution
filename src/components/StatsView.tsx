import {
  Activity,
  ExternalLink,
  RefreshCw,
  Wallet,
  BarChart3,
} from 'lucide-react'
import { useI18n } from '../i18n'
import { DONATION, shortDonationAddress } from '../lib/donation'
import { txUrl, truncateAddress, type IncomingDonation } from '../lib/bscDonation'
import type { BnbBalanceResult } from '../lib/bscDonation'
import type { CountsResult } from '../lib/communityCounts'
import { DonationCard } from './DonationCard'

interface StatsViewProps {
  community: CountsResult | null
  communityLoading: boolean
  onRefreshCommunity: () => void
  balance: BnbBalanceResult | null
  donations: IncomingDonation[]
  donationLoading: boolean
  donationError: string | null
  onRefreshDonation: () => void
}

function formatWhen(iso: string, locale: string): string {
  const tag = locale === 'en' ? 'en-US' : locale === 'zh-CN' ? 'zh-CN' : 'zh-TW'
  try {
    return new Intl.DateTimeFormat(tag, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function StatsView({
  community,
  communityLoading,
  onRefreshCommunity,
  balance,
  donations,
  donationLoading,
  donationError,
  onRefreshDonation,
}: StatsViewProps) {
  const { t, locale } = useI18n()

  const communityCells =
    community?.ok === true
      ? [
          { label: t('liveStats.contributions'), value: community.counts.contributions },
          { label: t('liveStats.likes'), value: community.counts.likes },
          { label: t('liveStats.comments'), value: community.counts.comments },
          { label: t('liveStats.quotes'), value: community.counts.quotes },
          { label: t('liveStats.activities'), value: community.counts.activities },
        ]
      : null

  return (
    <section>
      <div className="mb-6">
        <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-hawk-gold">
          <BarChart3 className="h-3.5 w-3.5" />
          {t('liveStats.badge')}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-hawk-cream sm:text-3xl">
          {t('liveStats.title')}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-hawk-muted sm:text-base">
          {t('liveStats.subtitle')}
        </p>
      </div>

      {/* Community */}
      <div className="hawk-card mb-6 p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="inline-flex items-center gap-2 text-lg font-bold text-hawk-cream">
              <Activity className="h-5 w-5 text-hawk-blue-bright" />
              {t('liveStats.communityTitle')}
            </h2>
            <p className="mt-1 text-xs text-hawk-muted">{t('liveStats.communityHint')}</p>
          </div>
          <button
            type="button"
            onClick={() => onRefreshCommunity()}
            className="hawk-btn hawk-btn-ghost px-3 py-2 text-sm"
            disabled={communityLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${communityLoading ? 'animate-spin' : ''}`} />
            {t('liveStats.refresh')}
          </button>
        </div>

        {communityLoading && !community ? (
          <p className="text-sm text-hawk-muted">{t('liveStats.loading')}</p>
        ) : communityCells ? (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {communityCells.map((c) => (
                <div
                  key={c.label}
                  className="rounded-xl border border-hawk-border bg-hawk-ink/60 px-3 py-3 text-center"
                >
                  <p className="text-xl font-bold text-hawk-gold sm:text-2xl">
                    {c.value.toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-hawk-muted sm:text-xs">
                    {c.label}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-hawk-muted">
              {t('liveStats.updated', {
                time: formatWhen(community!.ok ? community!.counts.fetchedAt : '', locale),
              })}
            </p>
          </>
        ) : (
          <p className="rounded-xl border border-hawk-border/80 bg-hawk-ink/40 px-4 py-3 text-sm text-hawk-muted">
            {t('liveStats.unavailable')}
            {community && !community.ok ? ` — ${community.error}` : ''}
          </p>
        )}
      </div>

      {/* Donation wallet */}
      <div className="hawk-card mb-6 border-hawk-gold/30 p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="inline-flex items-center gap-2 text-lg font-bold text-hawk-cream">
              <Wallet className="h-5 w-5 text-hawk-gold" />
              {t('liveStats.walletTitle')}
            </h2>
            <p className="mt-1 text-xs text-hawk-muted">{t('liveStats.walletHint')}</p>
          </div>
          <button
            type="button"
            onClick={() => onRefreshDonation()}
            className="hawk-btn hawk-btn-ghost px-3 py-2 text-sm"
            disabled={donationLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${donationLoading ? 'animate-spin' : ''}`} />
            {t('liveStats.refresh')}
          </button>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-hawk-blue/40 bg-hawk-blue/15 px-2.5 py-1 font-bold text-hawk-blue-bright">
            {DONATION.chainLabel}
          </span>
          <code className="font-mono text-hawk-cream/90">{shortDonationAddress()}</code>
          <a
            href={DONATION.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-hawk-blue-bright hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            BscScan
          </a>
        </div>

        {balance?.ok ? (
          <div className="rounded-xl border border-hawk-gold/25 bg-hawk-gold/10 px-4 py-4">
            <p className="text-xs text-hawk-muted">{t('liveStats.bnbBalance')}</p>
            <p className="mt-1 text-3xl font-bold text-hawk-gold">
              {balance.bnb}{' '}
              <span className="text-base font-semibold text-hawk-muted">BNB</span>
            </p>
            <p className="mt-2 text-[11px] text-hawk-muted">
              {t('liveStats.updated', { time: formatWhen(balance.updatedAt, locale) })}
            </p>
          </div>
        ) : (
          <p className="rounded-xl border border-hawk-border/80 bg-hawk-ink/40 px-4 py-3 text-sm text-hawk-muted">
            {t('liveStats.balanceUnavailable')}
            {balance && !balance.ok ? ` — ${balance.error}` : ''}
            {donationError && !balance ? ` — ${donationError}` : ''}
          </p>
        )}

        <div className="mt-5">
          <h3 className="text-sm font-semibold text-hawk-cream">
            {t('liveStats.recentDonations')}
          </h3>
          <p className="mt-1 text-[11px] text-hawk-muted">{t('liveStats.recentHint')}</p>
          {donations.length === 0 ? (
            <p className="mt-3 text-sm text-hawk-muted">{t('liveStats.noDonations')}</p>
          ) : (
            <ul className="mt-3 divide-y divide-hawk-border/60 overflow-hidden rounded-xl border border-hawk-border">
              {donations.slice(0, 12).map((d) => (
                <li
                  key={d.hash}
                  className="flex flex-wrap items-center justify-between gap-2 bg-hawk-ink/40 px-3 py-2.5 text-sm"
                >
                  <div>
                    <p className="font-medium text-hawk-cream">
                      +{d.amountBnb} BNB
                      <span className="ml-2 text-xs font-normal text-hawk-muted">
                        {t('liveStats.from', { name: truncateAddress(d.from) })}
                      </span>
                    </p>
                    <p className="text-[11px] text-hawk-muted">
                      {formatWhen(d.at, locale)}
                    </p>
                  </div>
                  <a
                    href={txUrl(d.hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-hawk-blue-bright hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Tx
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <DonationCard variant="full" />
    </section>
  )
}
