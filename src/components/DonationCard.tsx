import { useCallback, useState } from 'react'
import { Check, Copy, ExternalLink, HeartHandshake, Wallet } from 'lucide-react'
import { useI18n } from '../i18n'
import {
  DONATION,
  HAWK_TOKEN,
  shortDonationAddress,
  shortHawkToken,
} from '../lib/donation'

interface DonationCardProps {
  /** Full card for Rewards; compact strip for footer / hero. */
  variant?: 'full' | 'compact'
  className?: string
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}

export function DonationCard({ variant = 'full', className = '' }: DonationCardProps) {
  const { t } = useI18n()
  const [copiedWallet, setCopiedWallet] = useState(false)
  const [copiedToken, setCopiedToken] = useState(false)

  const handleCopyWallet = useCallback(async () => {
    const ok = await copyText(DONATION.address)
    if (ok) {
      setCopiedWallet(true)
      window.setTimeout(() => setCopiedWallet(false), 1800)
    }
  }, [])

  const handleCopyToken = useCallback(async () => {
    const ok = await copyText(HAWK_TOKEN.address)
    if (ok) {
      setCopiedToken(true)
      window.setTimeout(() => setCopiedToken(false), 1800)
    }
  }, [])

  if (variant === 'compact') {
    return (
      <div
        className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 rounded-xl border border-hawk-gold/25 bg-hawk-panel/70 px-3 py-2 text-xs text-hawk-muted ${className}`}
      >
        <span className="inline-flex items-center gap-1 font-semibold text-hawk-gold">
          <Wallet className="h-3.5 w-3.5" />
          {t('donation.stripLabel')}
        </span>
        <span className="rounded-md border border-hawk-gold/40 bg-hawk-gold/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-hawk-gold">
          {HAWK_TOKEN.symbol}
        </span>
        <span className="rounded-md border border-hawk-blue/40 bg-hawk-blue/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-hawk-blue-bright">
          {DONATION.chainLabel}
        </span>
        <code className="font-mono text-[11px] text-hawk-cream/90">
          {shortDonationAddress()}
        </code>
        <button
          type="button"
          onClick={() => void handleCopyWallet()}
          className="inline-flex items-center gap-1 rounded-md border border-hawk-border px-2 py-0.5 text-[11px] font-medium text-hawk-cream transition hover:border-hawk-gold/50 hover:text-hawk-gold"
        >
          {copiedWallet ? (
            <Check className="h-3 w-3 text-hawk-gold" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          {copiedWallet ? t('donation.copied') : t('donation.copy')}
        </button>
        <a
          href={HAWK_TOKEN.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-hawk-blue-bright hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          {t('donation.tokenLink')}
        </a>
      </div>
    )
  }

  return (
    <div
      className={`hawk-card relative mb-6 overflow-hidden border-hawk-gold/35 p-5 sm:p-6 ${className}`}
    >
      <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-hawk-gold/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 left-1/4 h-28 w-28 rounded-full bg-hawk-blue/20 blur-3xl" />

      <div className="relative">
        <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-hawk-gold">
          <HeartHandshake className="h-3.5 w-3.5" />
          {t('donation.badge')}
        </p>
        <h2 className="text-lg font-bold text-hawk-cream sm:text-xl">{t('donation.title')}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-hawk-muted">
          {t('donation.body')}
        </p>
        <p className="mt-2 rounded-lg border border-hawk-gold/30 bg-hawk-gold/10 px-3 py-2 text-sm text-hawk-cream">
          {t('donation.preferHawk')}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-hawk-blue/40 bg-hawk-blue/15 px-2.5 py-1 text-xs font-bold tracking-wide text-hawk-blue-bright">
            {t('donation.chain', { chain: DONATION.chainLabel })}
          </span>
          <span className="text-xs text-hawk-muted">{DONATION.chainName}</span>
        </div>

        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-hawk-gold">
            {t('donation.tokenLabel')}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <code className="flex-1 break-all rounded-xl border border-hawk-border bg-hawk-ink/80 px-3 py-2.5 font-mono text-xs text-hawk-cream sm:text-sm">
              {HAWK_TOKEN.symbol} · {HAWK_TOKEN.address}
            </code>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => void handleCopyToken()}
                className="hawk-btn hawk-btn-primary inline-flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-sm sm:flex-none"
              >
                {copiedToken ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedToken ? t('donation.copied') : t('donation.copyToken')}
              </button>
              <a
                href={HAWK_TOKEN.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hawk-btn hawk-btn-ghost inline-flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-sm sm:flex-none"
              >
                <ExternalLink className="h-4 w-4 text-hawk-gold" />
                {t('donation.tokenLink')}
              </a>
            </div>
          </div>
          <p className="mt-1.5 text-[11px] text-hawk-muted">
            {t('donation.tokenShort', { short: shortHawkToken() })}
          </p>
        </div>

        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-hawk-muted">
            {t('donation.walletLabel')}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <code className="flex-1 break-all rounded-xl border border-hawk-border bg-hawk-ink/80 px-3 py-2.5 font-mono text-xs text-hawk-cream sm:text-sm">
              {DONATION.address}
            </code>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => void handleCopyWallet()}
                className="hawk-btn hawk-btn-ghost inline-flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-sm sm:flex-none"
              >
                {copiedWallet ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedWallet ? t('donation.copied') : t('donation.copy')}
              </button>
              <a
                href={DONATION.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hawk-btn hawk-btn-ghost inline-flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-sm sm:flex-none"
              >
                <ExternalLink className="h-4 w-4 text-hawk-gold" />
                {t('donation.explorer')}
              </a>
            </div>
          </div>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-hawk-muted sm:text-xs">
          {t('donation.disclaimer')}
        </p>
      </div>
    </div>
  )
}
