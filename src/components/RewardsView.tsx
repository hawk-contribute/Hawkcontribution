import { useEffect, useState } from 'react'
import {
  Download,
  Gift,
  Lock,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react'
import type { NftDefinition, PointsAccount, Session } from '../types'
import { useI18n } from '../i18n'
import { asset } from '../lib/asset'
import { isSiteAdmin } from '../lib/admins'
import {
  resolveNftBlurb,
  resolveNftTitle,
  uploadNftRewardImage,
  type NftUpsertInput,
} from '../lib/nftCatalog'
import { DonationCard } from './DonationCard'

interface RewardsViewProps {
  session: Session | null
  account: PointsAccount
  claims: Record<string, { claimedAt: string }>
  catalog: NftDefinition[]
  redeemPoints: number
  onRequireAuth: () => void
  onClaim: (nftId: string, title: string, requiredPoints: number) => void
  onPlayGame: () => void
  onSaveRedeemPoints?: (points: number) => Promise<void>
  onSaveNft?: (input: NftUpsertInput) => Promise<void>
  onDeleteNft?: (id: string) => Promise<void>
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

const emptyForm = {
  id: '',
  title: '',
  blurb: '',
  rarity: 'rare',
  imagePath: 'rewards/nft/',
  requiredPoints: '',
  sortOrder: '0',
}

export function RewardsView({
  session,
  account,
  claims,
  catalog,
  redeemPoints,
  onRequireAuth,
  onClaim,
  onPlayGame,
  onSaveRedeemPoints,
  onSaveNft,
  onDeleteNft,
}: RewardsViewProps) {
  const { t } = useI18n()
  const admin = isSiteAdmin(session?.email)
  const points = account.total

  const [thresholdDraft, setThresholdDraft] = useState(String(redeemPoints))
  const [adminMsg, setAdminMsg] = useState<string | null>(null)
  const [adminBusy, setAdminBusy] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [imageFile, setImageFile] = useState<File | null>(null)

  // Keep draft in sync when cloud threshold loads/changes
  useEffect(() => {
    setThresholdDraft(String(redeemPoints))
  }, [redeemPoints])

  const globalEligible = points >= redeemPoints

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
          {t('rewards.subtitle', { n: redeemPoints })}
        </p>
        <p className="mt-2 text-xs text-hawk-muted">{t('rewards.offchainNote')}</p>
      </div>

      {admin && onSaveRedeemPoints && onSaveNft && onDeleteNft && (
        <div className="hawk-card mb-6 border border-hawk-gold/30 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-hawk-gold">
            {t('rewards.admin.title')}
          </h2>
          <p className="mt-1 text-xs text-hawk-muted">{t('rewards.admin.hint')}</p>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="block min-w-[10rem] flex-1 text-left text-xs text-hawk-muted">
              {t('rewards.admin.threshold')}
              <input
                type="number"
                min={1}
                className="hawk-input mt-1 w-full"
                value={thresholdDraft}
                onChange={(e) => setThresholdDraft(e.target.value)}
              />
            </label>
            <button
              type="button"
              disabled={adminBusy}
              className="hawk-btn hawk-btn-primary px-4 py-2 text-sm"
              onClick={() => {
                const n = Number(thresholdDraft)
                if (!Number.isFinite(n) || n < 1) {
                  setAdminMsg(t('rewards.admin.invalidThreshold'))
                  return
                }
                setAdminBusy(true)
                setAdminMsg(null)
                void onSaveRedeemPoints(n)
                  .then(() => setAdminMsg(t('rewards.admin.saved')))
                  .catch(() => setAdminMsg(t('rewards.admin.saveFailed')))
                  .finally(() => setAdminBusy(false))
              }}
            >
              {t('rewards.admin.saveThreshold')}
            </button>
          </div>

          <h3 className="mt-6 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-hawk-cream">
            <Plus className="h-3.5 w-3.5" />
            {t('rewards.admin.addNft')}
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-left text-xs text-hawk-muted">
              {t('rewards.admin.id')}
              <input
                className="hawk-input mt-1 w-full font-mono text-sm"
                placeholder="nft-my-item"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
              />
            </label>
            <label className="text-left text-xs text-hawk-muted">
              {t('rewards.admin.titleField')}
              <input
                className="hawk-input mt-1 w-full"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label className="text-left text-xs text-hawk-muted sm:col-span-2">
              {t('rewards.admin.blurb')}
              <textarea
                className="hawk-input mt-1 min-h-[4rem] w-full"
                value={form.blurb}
                onChange={(e) => setForm({ ...form, blurb: e.target.value })}
              />
            </label>
            <label className="text-left text-xs text-hawk-muted">
              {t('rewards.admin.rarity')}
              <select
                className="hawk-input mt-1 w-full"
                value={form.rarity}
                onChange={(e) => setForm({ ...form, rarity: e.target.value })}
              >
                <option value="legendary">{t('rewards.rarity.legendary')}</option>
                <option value="epic">{t('rewards.rarity.epic')}</option>
                <option value="rare">{t('rewards.rarity.rare')}</option>
                <option value="common">{t('rewards.rarity.common')}</option>
              </select>
            </label>
            <label className="text-left text-xs text-hawk-muted sm:col-span-2">
              {t('rewards.admin.imageUpload')}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hawk-input mt-1 w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-hawk-gold/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-hawk-gold"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null
                  setImageFile(f)
                }}
              />
              {imageFile && (
                <span className="mt-1 block text-[11px] text-hawk-muted">
                  {imageFile.name} ({Math.round(imageFile.size / 1024)} KB)
                </span>
              )}
            </label>
            <label className="text-left text-xs text-hawk-muted sm:col-span-2">
              {t('rewards.admin.imagePath')}
              <input
                className="hawk-input mt-1 w-full font-mono text-sm"
                placeholder="rewards/nft/….jpg or https://…"
                value={form.imagePath}
                onChange={(e) =>
                  setForm({ ...form, imagePath: e.target.value })
                }
              />
              <span className="mt-1 block text-[11px] text-hawk-muted">
                {t('rewards.admin.imagePathHint')}
              </span>
            </label>
            <label className="text-left text-xs text-hawk-muted">
              {t('rewards.admin.perNftPoints')}
              <input
                type="number"
                min={1}
                className="hawk-input mt-1 w-full"
                placeholder={t('rewards.admin.useGlobal')}
                value={form.requiredPoints}
                onChange={(e) =>
                  setForm({ ...form, requiredPoints: e.target.value })
                }
              />
            </label>
            <label className="text-left text-xs text-hawk-muted">
              {t('rewards.admin.sortOrder')}
              <input
                type="number"
                className="hawk-input mt-1 w-full"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              />
            </label>
          </div>
          <button
            type="button"
            disabled={adminBusy}
            className="hawk-btn hawk-btn-primary mt-3 px-4 py-2 text-sm"
            onClick={() => {
              const req =
                form.requiredPoints.trim() === ''
                  ? null
                  : Number(form.requiredPoints)
              if (req != null && (!Number.isFinite(req) || req < 1)) {
                setAdminMsg(t('rewards.admin.invalidPoints'))
                return
              }
              if (!imageFile && !form.imagePath.trim()) {
                setAdminMsg(t('rewards.admin.needImage'))
                return
              }
              setAdminBusy(true)
              setAdminMsg(null)
              void (async () => {
                let imagePath = form.imagePath.trim()
                if (imageFile) {
                  imagePath = await uploadNftRewardImage(form.id, imageFile)
                }
                await onSaveNft({
                  id: form.id,
                  title: form.title,
                  blurb: form.blurb,
                  rarity: form.rarity,
                  imagePath,
                  requiredPoints: req,
                  sortOrder: Number(form.sortOrder) || 0,
                })
                setForm(emptyForm)
                setImageFile(null)
                setAdminMsg(t('rewards.admin.saved'))
              })()
                .catch((e: unknown) => {
                  const code = e instanceof Error ? e.message : ''
                  if (code === 'INVALID_ID') {
                    setAdminMsg(t('rewards.admin.invalidId'))
                  } else if (code === 'INVALID_IMAGE') {
                    setAdminMsg(t('rewards.admin.invalidImage'))
                  } else if (code === 'INVALID_TITLE') {
                    setAdminMsg(t('rewards.admin.invalidTitle'))
                  } else if (code === 'INVALID_FILE_TYPE') {
                    setAdminMsg(t('rewards.admin.invalidFileType'))
                  } else if (code === 'INVALID_FILE_SIZE') {
                    setAdminMsg(t('rewards.admin.invalidFileSize'))
                  } else if (code === 'UPLOAD_FAILED' || /storage|bucket|policy|row-level/i.test(code)) {
                    setAdminMsg(t('rewards.admin.uploadFailed'))
                  } else {
                    setAdminMsg(t('rewards.admin.saveFailed'))
                  }
                })
                .finally(() => setAdminBusy(false))
            }}
          >
            {t('rewards.admin.saveNft')}
          </button>
          {adminMsg && (
            <p className="mt-2 text-xs text-hawk-gold">{adminMsg}</p>
          )}

          <h3 className="mt-6 text-xs font-bold uppercase tracking-wide text-hawk-cream">
            {t('rewards.admin.manageList')}
          </h3>
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs">
            {catalog.map((nft) => (
              <li
                key={nft.id}
                className="flex items-center justify-between gap-2 rounded-md bg-hawk-panel/50 px-2 py-1.5"
              >
                <span className="min-w-0 truncate text-hawk-cream">
                  <span className="font-mono text-hawk-muted">{nft.id}</span>
                  {' · '}
                  {resolveNftTitle(nft, t)}
                  {' · '}
                  {nft.requiredPoints.toLocaleString()}
                </span>
                <button
                  type="button"
                  className="shrink-0 text-red-300 hover:text-red-200"
                  title={t('rewards.admin.delete')}
                  onClick={() => {
                    if (!window.confirm(t('rewards.admin.confirmDelete'))) return
                    setAdminBusy(true)
                    void onDeleteNft(nft.id)
                      .then(() => setAdminMsg(t('rewards.admin.deleted')))
                      .catch(() => setAdminMsg(t('rewards.admin.saveFailed')))
                      .finally(() => setAdminBusy(false))
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

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
                  / {redeemPoints.toLocaleString()}
                </span>
              </p>
            </div>
            {!globalEligible && (
              <button
                type="button"
                onClick={onPlayGame}
                className="hawk-btn hawk-btn-primary px-4 py-2 text-sm"
              >
                {t('rewards.earnMore')}
              </button>
            )}
            {globalEligible && (
              <span className="inline-flex items-center gap-1 rounded-full bg-hawk-gold/15 px-3 py-1 text-xs font-semibold text-hawk-gold">
                <Sparkles className="h-3.5 w-3.5" />
                {t('rewards.eligible')}
              </span>
            )}
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-hawk-ink">
            <div
              className="h-full rounded-full bg-gradient-to-r from-hawk-blue to-hawk-gold transition-all"
              style={{
                width: `${Math.min(100, Math.round((points / Math.max(1, redeemPoints)) * 100))}%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-hawk-muted">
            {globalEligible
              ? t('rewards.ready')
              : t('rewards.needMore', {
                  n: Math.max(0, redeemPoints - points).toLocaleString(),
                })}
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {catalog.map((nft) => {
          const owned = !!(session && claims[nft.id])
          const need = nft.requiredPoints
          const eligible = points >= need
          const canClaim = !!session && eligible && !owned
          const locked = !session || !eligible
          const fileName = nft.image.split('/').pop() || `${nft.id}.jpg`
          const title = resolveNftTitle(nft, t)
          const blurb = resolveNftBlurb(nft, t)
          const rarityLabel = t(`rewards.rarity.${nft.rarityKey}`)

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
                  {rarityLabel === `rewards.rarity.${nft.rarityKey}`
                    ? nft.rarityKey
                    : rarityLabel}
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
                <h3 className="text-base font-bold text-hawk-cream">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-hawk-muted">
                  {blurb}
                </p>
                <p className="mt-2 text-xs text-hawk-muted">
                  {t('rewards.requirement', {
                    n: need.toLocaleString(),
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
                        onClaim(nft.id, title, need)
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
