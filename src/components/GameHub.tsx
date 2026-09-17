import { useState } from 'react'
import { Baby, Bird, CloudSun, Egg, Feather, Gamepad2, Grid2x2, Lock, Swords, Target, Wind } from 'lucide-react'
import type { MiniGameId, PointsAccount, Session } from '../types'
import { useI18n } from '../i18n'
import { asset } from '../lib/asset'
import { GameView } from './GameView'
import { FruitSliceView } from './FruitSliceView'
import { EagleCatchView } from './EagleCatchView'
import { FlappyEagleView } from './FlappyEagleView'
import { MemoryMatchView } from './MemoryMatchView'
import { WingSoarView } from './WingSoarView'
import { HatchDayView } from './HatchDayView'
import { HatchDayCover } from './HatchDayArt'
import { FluffySoarView } from './FluffySoarView'
import { FluffySoarCover } from './FluffySoarArt'
import { BabyTouchView } from './BabyTouchView'
import { BabyTouchCover } from './BabyTouchArt'

type GameId = 'hub' | MiniGameId

interface GameHubProps {
  session: Session | null
  account: PointsAccount
  onRequireAuth: () => void
  onRoundComplete: (score: number, hits: number, gameId: MiniGameId) => void
}

export function GameHub({
  session,
  account,
  onRequireAuth,
  onRoundComplete,
}: GameHubProps) {
  const { t } = useI18n()
  const [game, setGame] = useState<GameId>('hub')

  const openGame = (id: MiniGameId) => {
    window.scrollTo(0, 0)
    setGame(id)
  }

  if (game === 'whack') {
    return (
      <GameView
        session={session}
        account={account}
        onRequireAuth={onRequireAuth}
        onRoundComplete={(score, hits) => onRoundComplete(score, hits, 'whack')}
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
        onRoundComplete={(score, hits) => onRoundComplete(score, hits, 'fruit')}
        onBack={() => setGame('hub')}
      />
    )
  }

  if (game === 'catch') {
    return (
      <EagleCatchView
        session={session}
        account={account}
        onRequireAuth={onRequireAuth}
        onRoundComplete={(score, hits) => onRoundComplete(score, hits, 'catch')}
        onBack={() => setGame('hub')}
      />
    )
  }

  if (game === 'flappy') {
    return (
      <FlappyEagleView
        session={session}
        account={account}
        onRequireAuth={onRequireAuth}
        onRoundComplete={(score, hits) => onRoundComplete(score, hits, 'flappy')}
        onBack={() => setGame('hub')}
      />
    )
  }

  if (game === 'memory') {
    return (
      <MemoryMatchView
        session={session}
        account={account}
        onRequireAuth={onRequireAuth}
        onRoundComplete={(score, hits) => onRoundComplete(score, hits, 'memory')}
        onBack={() => setGame('hub')}
      />
    )
  }


  if (game === 'wingSoar') {
    return (
      <WingSoarView
        session={session}
        account={account}
        onRequireAuth={onRequireAuth}
        onRoundComplete={(score, hits) => onRoundComplete(score, hits, 'wingSoar')}
        onBack={() => setGame('hub')}
      />
    )
  }

  if (game === 'hatchDay') {
    return (
      <HatchDayView
        session={session}
        account={account}
        onRequireAuth={onRequireAuth}
        onRoundComplete={(score, hits) => onRoundComplete(score, hits, 'hatchDay')}
        onBack={() => setGame('hub')}
      />
    )
  }

  if (game === 'fluffySoar') {
    return (
      <FluffySoarView
        session={session}
        account={account}
        onRequireAuth={onRequireAuth}
        onRoundComplete={(score, hits) => onRoundComplete(score, hits, 'fluffySoar')}
        onBack={() => setGame('hub')}
      />
    )
  }

  if (game === 'babyTouch') {
    return (
      <BabyTouchView
        session={session}
        account={account}
        onRequireAuth={onRequireAuth}
        onRoundComplete={(score, hits) => onRoundComplete(score, hits, 'babyTouch')}
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        <button
          type="button"
          onClick={() => openGame('whack')}
          className="hawk-card group flex flex-col overflow-hidden p-0 text-left transition hover:border-hawk-gold/50"
        >
          <div className="relative h-40 overflow-hidden bg-hawk-navy/80 sm:h-44">
            <img
              src={asset('game/covers/cover-whack.png')}
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
          onClick={() => openGame('fruit')}
          className="hawk-card group flex flex-col overflow-hidden p-0 text-left transition hover:border-hawk-gold/50"
        >
          <div className="relative h-40 overflow-hidden bg-hawk-navy/80 sm:h-44">
            <img
              src={asset('game/covers/cover-fruit.png')}
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

        <button
          type="button"
          onClick={() => openGame('catch')}
          className="hawk-card group flex flex-col overflow-hidden p-0 text-left transition hover:border-hawk-gold/50"
        >
          <div className="relative h-40 overflow-hidden bg-hawk-navy/80 sm:h-44">
            <img
              src={asset('game/covers/cover-catch.png')}
              alt=""
              className="h-full w-full object-cover opacity-90 transition group-hover:scale-105"
            />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-hawk-gold">
              <Bird className="h-3.5 w-3.5" />
              {t('gameHub.catchTag')}
            </span>
          </div>
          <div className="p-5">
            <h2 className="text-lg font-bold text-hawk-cream">{t('catch.title')}</h2>
            <p className="mt-1.5 text-sm text-hawk-muted">{t('gameHub.catchBlurb')}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => openGame('flappy')}
          className="hawk-card group flex flex-col overflow-hidden p-0 text-left transition hover:border-hawk-gold/50"
        >
          <div className="relative h-40 overflow-hidden bg-hawk-navy/80 sm:h-44">
            <img
              src={asset('game/covers/cover-flappy.png')}
              alt=""
              className="h-full w-full object-cover opacity-90 transition group-hover:scale-105"
            />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-hawk-gold">
              <Wind className="h-3.5 w-3.5" />
              {t('gameHub.flappyTag')}
            </span>
          </div>
          <div className="p-5">
            <h2 className="text-lg font-bold text-hawk-cream">{t('flappy.title')}</h2>
            <p className="mt-1.5 text-sm text-hawk-muted">{t('gameHub.flappyBlurb')}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => openGame('memory')}
          className="hawk-card group flex flex-col overflow-hidden p-0 text-left transition hover:border-hawk-gold/50"
        >
          <div className="relative h-40 overflow-hidden bg-hawk-navy/80 sm:h-44">
            <img
              src={asset('game/covers/cover-memory.png')}
              alt=""
              className="h-full w-full object-cover opacity-90 transition group-hover:scale-105"
            />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-hawk-gold">
              <Grid2x2 className="h-3.5 w-3.5" />
              {t('gameHub.memoryTag')}
            </span>
          </div>
          <div className="p-5">
            <h2 className="text-lg font-bold text-hawk-cream">{t('memory.title')}</h2>
            <p className="mt-1.5 text-sm text-hawk-muted">{t('gameHub.memoryBlurb')}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => openGame('wingSoar')}
          className="hawk-card group flex flex-col overflow-hidden p-0 text-left transition hover:border-hawk-gold/50"
        >
          <div className="relative h-40 overflow-hidden bg-hawk-navy/80 sm:h-44">
            <img
              src={asset('game/covers/cover-wing-soar.png')}
              alt=""
              className="h-full w-full object-cover opacity-90 transition group-hover:scale-105"
            />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-hawk-gold">
              <Feather className="h-3.5 w-3.5" />
              {t('gameHub.wingSoarTag')}
            </span>
          </div>
          <div className="p-5">
            <h2 className="text-lg font-bold text-hawk-cream">{t('wingSoar.title')}</h2>
            <p className="mt-1.5 text-sm text-hawk-muted">{t('gameHub.wingSoarBlurb')}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => openGame('hatchDay')}
          className="hawk-card group flex flex-col overflow-hidden p-0 text-left transition hover:border-hawk-gold/50"
        >
          <div className="relative h-40 overflow-hidden bg-hawk-navy/80 sm:h-44">
            <HatchDayCover />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-hawk-gold">
              <Egg className="h-3.5 w-3.5" />
              {t('gameHub.hatchDayTag')}
            </span>
          </div>
          <div className="p-5">
            <h2 className="text-lg font-bold text-hawk-cream">{t('hatchDay.title')}</h2>
            <p className="mt-1.5 text-sm text-hawk-muted">{t('gameHub.hatchDayBlurb')}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => openGame('fluffySoar')}
          className="hawk-card group flex flex-col overflow-hidden p-0 text-left transition hover:border-hawk-gold/50"
        >
          <div className="relative h-40 overflow-hidden bg-hawk-navy/80 sm:h-44">
            <FluffySoarCover />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-hawk-gold">
              <CloudSun className="h-3.5 w-3.5" />
              {t('gameHub.fluffySoarTag')}
            </span>
          </div>
          <div className="p-5">
            <h2 className="text-lg font-bold text-hawk-cream">{t('fluffySoar.title')}</h2>
            <p className="mt-1.5 text-sm text-hawk-muted">{t('gameHub.fluffySoarBlurb')}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => openGame('babyTouch')}
          className="hawk-card group flex flex-col overflow-hidden p-0 text-left transition hover:border-hawk-gold/50"
        >
          <div className="relative h-40 overflow-hidden bg-hawk-navy/80 sm:h-44">
            <BabyTouchCover />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-hawk-gold">
              <Baby className="h-3.5 w-3.5" />
              {t('gameHub.babyTouchTag')}
            </span>
          </div>
          <div className="p-5">
            <h2 className="text-lg font-bold text-hawk-cream">{t('babyTouch.title')}</h2>
            <p className="mt-1.5 text-sm text-hawk-muted">{t('gameHub.babyTouchBlurb')}</p>
          </div>
        </button>

      </div>
    </section>
  )
}
