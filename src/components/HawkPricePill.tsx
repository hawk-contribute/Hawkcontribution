import { useEffect, useState } from 'react'
import { HAWK_TOKEN } from '../lib/donation'
import {
  cachedHawkPrice,
  fetchHawkPrice,
  HAWK_PRICE_POLL_MS,
  type HawkPriceResult,
} from '../lib/hawkPrice'
import { useI18n } from '../i18n'

export function HawkPricePill() {
  const { t } = useI18n()
  const [quote, setQuote] = useState<HawkPriceResult | null>(() =>
    typeof window !== 'undefined' ? cachedHawkPrice() : null,
  )

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const next = await fetchHawkPrice()
      if (!cancelled) setQuote(next)
    }
    void load()
    const id = window.setInterval(() => void load(), HAWK_PRICE_POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  const href = quote?.ok
    ? quote.pairUrl
    : quote && !quote.ok
      ? quote.pairUrl
      : `https://dexscreener.com/bsc/${HAWK_TOKEN.address}`

  const change =
    quote?.ok && quote.change24h != null ? quote.change24h : null
  const changeCls =
    change == null
      ? 'text-hawk-muted'
      : change >= 0
        ? 'text-emerald-400'
        : 'text-red-300'

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={t('price.hawkTitle')}
      className="inline-flex max-w-[11rem] items-center gap-1.5 rounded-full border border-hawk-gold/35 bg-hawk-gold/10 px-2.5 py-1 text-[11px] font-semibold text-hawk-cream transition hover:border-hawk-gold/60 hover:bg-hawk-gold/15 sm:max-w-none sm:text-xs"
    >
      <span className="text-hawk-gold">{HAWK_TOKEN.symbol}</span>
      <span className="font-mono tabular-nums">
        {quote?.ok ? `$${quote.priceText}` : '—'}
      </span>
      {change != null && (
        <span className={`font-mono tabular-nums ${changeCls}`}>
          {change >= 0 ? '+' : ''}
          {change.toFixed(1)}%
        </span>
      )}
    </a>
  )
}
