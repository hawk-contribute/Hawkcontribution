import {
  BookOpen,
  ExternalLink,
  Gamepad2,
  Gift,
  LogOut,
  Newspaper,
  Upload,
  UserRound,
} from 'lucide-react'
import type { Session } from '../types'
import { useI18n } from '../i18n'
import { asset } from '../lib/asset'
import { LanguageSwitcher } from './LanguageSwitcher'

type Tab = 'game' | 'browse' | 'feed' | 'ledger' | 'rewards'

interface HeaderProps {
  tab: Tab
  onTabChange: (tab: Tab) => void
  session: Session | null
  onSignIn: () => void
  onSignOut: () => void
  onProvide: () => void
  contributionCount: number
}

export function Header({
  tab,
  onTabChange,
  session,
  onSignIn,
  onSignOut,
  onProvide,
  contributionCount,
}: HeaderProps) {
  const { t } = useI18n()

  const tabBtn = (id: Tab, label: string, icon?: React.ReactNode) => (
    <button
      type="button"
      onClick={() => onTabChange(id)}
      className={`hawk-btn rounded-lg px-3 py-1.5 text-sm ${
        tab === id
          ? 'bg-hawk-blue/20 text-hawk-blue-bright'
          : 'text-hawk-muted hover:text-hawk-cream'
      }`}
    >
      {icon}
      {label}
      {id === 'ledger' && contributionCount > 0 && (
        <span className="ml-0.5 rounded-full bg-hawk-gold px-1.5 text-[10px] font-bold text-hawk-black">
          {contributionCount}
        </span>
      )}
    </button>
  )

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

        <nav className="flex flex-wrap items-center gap-1 rounded-xl border border-hawk-border bg-hawk-panel/80 p-1">
          {tabBtn('game', t('nav.game'), <Gamepad2 className="h-3.5 w-3.5" />)}
          {tabBtn('browse', t('nav.opportunities'))}
          {tabBtn('feed', t('nav.feed'), <Newspaper className="h-3.5 w-3.5" />)}
          {tabBtn('ledger', t('nav.ledger'), <BookOpen className="h-3.5 w-3.5" />)}
          {tabBtn('rewards', t('nav.rewards'), <Gift className="h-3.5 w-3.5" />)}
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="https://hawk.city"
            target="_blank"
            rel="noopener noreferrer"
            className="hawk-btn hawk-btn-ghost hidden px-3 py-2 text-sm lg:inline-flex"
          >
            <ExternalLink className="h-3.5 w-3.5 text-hawk-gold" />
            {t('brand.officialSite')}
          </a>
          <LanguageSwitcher />
          {session ? (
            <>
              <button
                type="button"
                onClick={onProvide}
                className="hawk-btn hawk-btn-primary px-3 py-2 text-sm"
              >
                <Upload className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('nav.provide')}</span>
              </button>
              <div className="hidden items-center gap-1.5 rounded-xl border border-hawk-border bg-hawk-panel/80 px-2.5 py-1.5 md:flex">
                <UserRound className="h-3.5 w-3.5 text-hawk-blue-bright" />
                <span className="max-w-[7rem] truncate text-xs text-hawk-cream">
                  {session.displayName}
                </span>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="hawk-btn hawk-btn-ghost px-3 py-2 text-sm"
                title={t('auth.signOut')}
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('auth.signOut')}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="hawk-btn hawk-btn-primary px-3 py-2 text-sm"
            >
              <UserRound className="h-4 w-4" />
              {t('auth.signIn')}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
