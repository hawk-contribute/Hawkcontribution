import { useState } from 'react'
import { Gamepad2, Lock, Swords, Target } from 'lucide-react'
import type { PointsAccount, Session } from '../types'
import { useI18n } from '../i18n'
import { asset } from '../lib/asset'
import { GameView } from './GameView'
import { FruitSliceView } from './FruitSliceView'

type GameId = 'hub' | 'whack' | 'fruit'

interface GameHubProps {
  session: Session | null
  account: PointsAccount
  onRequireAuth: () => void
  onRoundComplete: (score: number, hits: number) => void
}

export function GameHub({
  session,
  account,
  onRequireAuth,
  onRoundComplete,
}: GameHubProps) {
  const { t } = useI18n()
  const [game, setGame] = useState<GameId>('hub')

  if (game === 'whack') {
    return (
      <GameView
        session={session}
        account={account}
        onRequireAuth={onRequireAuth}
        onRoundComplete={onRoundComplete}
        onBack={() => setGame('hub')}
      />
    )
  }

  if (game === 'fruit') {
    return (
      <FruitSliceView
        session={session}
        account={account}
        onRequireAuth={onRequireAuth}
        onRoundComplete={onRoundComplete}
        onBack={() => setGame('hub')}
      />
    )
  }

  if (!session) {
    return (
      <section className="hawk-card mx-auto max-w-lg px-6 py-14 text-center">
        <Lock className="mx-auto mb-3 h-10 w-10 text-hawk-gold" />
        <h1 className="text-2xl font-bold text-hawk-cream">{t('gameHub.title')}</h1>
        <p className="mt-2 text-sm text-hawk-muted">{t('game.locked')}</p>
        <button
          type="button"
          onClick={onRequireAuth}
          className="hawk-btn hawk-btn-primary mt-6 px-5 py-2.5 text-sm"
        >
          {t('auth.signIn')}
        </button>
      </section>
    )
  }

  return (
    <section>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-hawk-gold">
            <Gamepad2 className="h-3.5 w-3.5" />
            {t('gameHub.badge')}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-hawk-cream sm:text-3xl">
            {t('gameHub.title')}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-hawk-muted sm:text-base">
            {t('gameHub.subtitle')}
          </p>
        </div>
        <div className="rounded-xl border border-hawk-gold/30 bg-hawk-gold/10 px-4 py-3 text-right">
          <p className="text-xs text-hawk-muted">{t('game.totalPoints')}</p>
          <p className="text-2xl font-bold text-hawk-gold">{account.total}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setGame('whack')}
          className="hawk-card group flex flex-col overflow-hidden p-0 text-left transition hover:border-hawk-gold/50"
        >
          <div className="relative h-36 overflow-hidden bg-black/30">
            <img
              src={asset('game/eagle-mascot.jpg')}
              alt=""
              className="h-full w-full object-cover opacity-90 transition group-hover:scale-105"
            />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-hawk-gold">
              <Target className="h-3.5 w-3.5" />
              {t('gameHub.whackTag')}
            </span>
          </div>
          <div className="p-5">
            <h2 className="text-lg font-bold text-hawk-cream">{t('game.title')}</h2>
            <p className="mt-1.5 text-sm text-hawk-muted">{t('gameHub.whackBlurb')}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setGame('fruit')}
          className="hawk-card group flex flex-col overflow-hidden p-0 text-left transition hover:border-hawk-gold/50"
        >
          <div className="relative h-36 overflow-hidden bg-black/30">
            <img
              src={asset('game/hawk-dance.gif')}
              alt=""
              className="h-full w-full object-cover opacity-90 transition group-hover:scale-105"
            />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-hawk-gold">
              <Swords className="h-3.5 w-3.5" />
              {t('gameHub.fruitTag')}
            </span>
          </div>
          <div className="p-5">
            <h2 className="text-lg font-bold text-hawk-cream">{t('fruit.title')}</h2>
            <p className="mt-1.5 text-sm text-hawk-muted">{t('gameHub.fruitBlurb')}</p>
          </div>
        </button>
      </div>
    </section>
  )
}
