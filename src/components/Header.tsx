import { BookOpen, ExternalLink, UserRound } from 'lucide-react'
import type { Identity } from '../types'
import { useI18n } from '../i18n'
import { asset } from '../lib/asset'
import { LanguageSwitcher } from './LanguageSwitcher'

type Tab = 'browse' | 'ledger'

interface HeaderProps {
  tab: Tab
  onTabChange: (tab: Tab) => void
  identity: Identity | null
  onOpenIdentity: () => void
  contributionCount: number
}

export function Header({
  tab,
  onTabChange,
  identity,
  onOpenIdentity,
  contributionCount,
}: HeaderProps) {
  const { t } = useI18n()

  return (
    <header className="sticky top-0 z-40 border-b border-hawk-border/80 bg-hawk-black/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={asset('brand/hawk-mark.png')}
            alt="Hawk"
            className="h-11 w-11 shrink-0 rounded-full object-contain shadow-md shadow-hawk-blue/30 ring-2 ring-hawk-blue/40"
          />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-bold tracking-wide text-hawk-cream sm:text-base">
              Hawk Contribute
            </p>
            <p className="truncate text-xs text-hawk-gold/90">{t('brand.slogan')}</p>
          </div>
        </div>

        <nav className="flex items-center gap-1 rounded-xl border border-hawk-border bg-hawk-panel/80 p-1">
          <button
            type="button"
            onClick={() => onTabChange('browse')}
            className={`hawk-btn rounded-lg px-3 py-1.5 text-sm ${
              tab === 'browse'
                ? 'bg-hawk-blue/20 text-hawk-blue-bright'
                : 'text-hawk-muted hover:text-hawk-cream'
            }`}
          >
            {t('nav.opportunities')}
          </button>
          <button
            type="button"
            onClick={() => onTabChange('ledger')}
            className={`hawk-btn rounded-lg px-3 py-1.5 text-sm ${
              tab === 'ledger'
                ? 'bg-hawk-blue/20 text-hawk-blue-bright'
                : 'text-hawk-muted hover:text-hawk-cream'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            {t('nav.ledger')}
            {contributionCount > 0 && (
              <span className="ml-0.5 rounded-full bg-hawk-gold px-1.5 text-[10px] font-bold text-hawk-black">
                {contributionCount}
              </span>
            )}
          </button>
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="https://hawk.city"
            target="_blank"
            rel="noopener noreferrer"
            className="hawk-btn hawk-btn-ghost hidden px-3 py-2 text-sm sm:inline-flex"
          >
            <ExternalLink className="h-3.5 w-3.5 text-hawk-gold" />
            {t('brand.officialSite')}
          </a>
          <LanguageSwitcher />
          <button
            type="button"
            onClick={onOpenIdentity}
            className="hawk-btn hawk-btn-ghost px-3 py-2 text-sm"
          >
            <UserRound className="h-4 w-4" />
            <span className="max-w-[8rem] truncate">
              {identity ? identity.displayName : t('nav.setIdentity')}
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}
