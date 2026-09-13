import { Download, Gift, Lock, Sparkles } from 'lucide-react'
import { NFT_CATALOG } from '../data/nfts'
import type { PointsAccount, Session } from '../types'
import { NFT_REDEEM_POINTS } from '../types'
import { useI18n } from '../i18n'
import { asset } from '../lib/asset'
import { DonationCard } from './DonationCard'

interface RewardsViewProps {
  session: Session | null
  account: PointsAccount
  claims: Record<string, { claimedAt: string }>
  onRequireAuth: () => void
  onClaim: (nftId: string, title: string) => void
  onPlayGame: () => void
}

async function downloadNftImage(path: string, filename: string) {
  const url = asset(path)
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(objectUrl)
  } catch {
    // Fallback: open in new tab / anchor download
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
}

export function RewardsView({
  session,
  account,
  claims,
  onRequireAuth,
  onClaim,
  onPlayGame,
}: RewardsViewProps) {
  const { t } = useI18n()
  const points = account.total
  const eligible = points >= NFT_REDEEM_POINTS
  const progress = Math.min(100, Math.round((points / NFT_REDEEM_POINTS) * 100))

  return (
    <section>
      <DonationCard variant="full" />

      <div className="mb-6">
        <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-hawk-gold">
          <Gift className="h-3.5 w-3.5" />
          {t('rewards.badge')}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-hawk-cream sm:text-3xl">
          {t('rewards.title')}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-hawk-muted sm:text-base">
          {t('rewards.subtitle', { n: NFT_REDEEM_POINTS })}
        </p>
        <p className="mt-2 text-xs text-hawk-muted">{t('rewards.offchainNote')}</p>
      </div>

      {!session ? (
        <div className="hawk-card mb-6 flex flex-col items-center px-6 py-10 text-center">
          <Lock className="mb-3 h-9 w-9 text-hawk-gold" />
          <p className="font-medium text-hawk-cream">{t('rewards.loginRequired')}</p>
          <button
            type="button"
            onClick={onRequireAuth}
            className="hawk-btn hawk-btn-primary mt-4 px-5 py-2.5 text-sm"
          >
            {t('auth.signIn')}
          </button>
        </div>
      ) : (
        <div className="hawk-card mb-6 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs text-hawk-muted">{t('rewards.yourPoints')}</p>
              <p className="text-2xl font-bold text-hawk-gold">
                {points.toLocaleString()}{' '}
                <span className="text-sm font-medium text-hawk-muted">
                  / {NFT_REDEEM_POINTS.toLocaleString()}
                </span>
              </p>
            </div>
            {!eligible && (
              <button
                type="button"
                onClick={onPlayGame}
                className="hawk-btn hawk-btn-primary px-4 py-2 text-sm"
              >
                {t('rewards.earnMore')}
              </button>
            )}
            {eligible && (
              <span className="inline-flex items-center gap-1 rounded-full bg-hawk-gold/15 px-3 py-1 text-xs font-semibold text-hawk-gold">
                <Sparkles className="h-3.5 w-3.5" />
                {t('rewards.eligible')}
              </span>
            )}
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-hawk-ink">
            <div
              className="h-full rounded-full bg-gradient-to-r from-hawk-blue to-hawk-gold transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-hawk-muted">
            {eligible
              ? t('rewards.ready')
              : t('rewards.needMore', {
                  n: Math.max(0, NFT_REDEEM_POINTS - points).toLocaleString(),
                })}
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {NFT_CATALOG.map((nft) => {
          const owned = !!(session && claims[nft.id])
          const canClaim = !!session && eligible && !owned
          const locked = !session || !eligible
          const fileName = nft.image.split('/').pop() || `${nft.id}.jpg`

          return (
            <article
              key={nft.id}
              className={`hawk-card overflow-hidden p-0 ${
                owned ? 'ring-1 ring-hawk-gold/40' : ''
              }`}
            >
              <div className="relative aspect-square bg-hawk-ink">
                <img
                  src={asset(nft.image)}
                  alt=""
                  className={`h-full w-full object-cover ${
                    locked && !owned ? 'opacity-70 grayscale-[30%]' : ''
                  }`}
                  loading="lazy"
                />
                <span className="absolute left-3 top-3 rounded-full bg-hawk-black/75 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-hawk-gold backdrop-blur-sm">
                  {t(`rewards.rarity.${nft.rarityKey}`)}
                </span>
                {owned && (
                  <span className="absolute right-3 top-3 rounded-full bg-hawk-gold px-2.5 py-0.5 text-[10px] font-bold text-hawk-black">
                    {t('rewards.owned')}
                  </span>
                )}
                {locked && !owned && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                    <Lock className="h-8 w-8 text-hawk-cream/80" />
                  </div>
                )}
              </div>
              <div className="p-4 text-left">
                <h3 className="text-base font-bold text-hawk-cream">
                  {t(`rewards.nft.${nft.titleKey}.title`)}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-hawk-muted">
                  {t(`rewards.nft.${nft.blurbKey}.blurb`)}
                </p>
                <p className="mt-2 text-xs text-hawk-muted">
                  {t('rewards.requirement', {
                    n: nft.requiredPoints.toLocaleString(),
                  })}
                </p>

                <div className="mt-3 flex flex-col gap-2">
                  {owned ? (
                    <p className="text-sm font-semibold text-hawk-gold">
                      {t('rewards.owned')}
                    </p>
                  ) : (
                    <button
                      type="button"
                      disabled={!canClaim && !!session}
                      onClick={() => {
                        if (!session) {
                          onRequireAuth()
                          return
                        }
                        if (!eligible) return
                        onClaim(nft.id, t(`rewards.nft.${nft.titleKey}.title`))
                      }}
                      className={`hawk-btn w-full px-4 py-2.5 text-sm ${
                        canClaim
                          ? 'hawk-btn-primary'
                          : 'cursor-not-allowed border border-hawk-border bg-hawk-ink text-hawk-muted opacity-70'
                      }`}
                    >
                      {!session
                        ? t('auth.signIn')
                        : eligible
                          ? t('rewards.claim')
                          : t('rewards.locked')}
                    </button>
                  )}

                  {/* Download available for owned NFTs; also allow preview download when eligible */}
                  {(owned || (session && eligible)) && (
                    <button
                      type="button"
                      className="hawk-btn hawk-btn-ghost w-full px-4 py-2 text-sm"
                      onClick={() => void downloadNftImage(nft.image, fileName)}
                    >
                      <Download className="h-3.5 w-3.5" />
                      {owned ? t('rewards.downloadOwned') : t('rewards.download')}
                    </button>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
