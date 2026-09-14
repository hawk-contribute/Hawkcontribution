import { useEffect, useState } from 'react'
import {
  Download,
  Gift,
  Lock,
  Plus,
  Save,
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
import { useHumanVerify } from '../hooks/useHumanVerify'
import { DonationCard } from './DonationCard'
import { HumanVerify } from './HumanVerify'

interface RewardsViewProps {
  session: Session | null
  account: PointsAccount
  claims: Record<string, { claimedAt: string }>
  catalog: NftDefinition[]
  redeemPoints: number
  onRequireAuth: () => void
  onClaim: (nftId: string, title: string, requiredPoints: number) => Promise<boolean>
  onPlayGame: () => void
  onSaveRedeemPoints?: (points: number) => Promise<void>
  onSaveNft?: (input: NftUpsertInput) => Promise<void>
  onSaveNftPoints?: (id: string, points: number) => Promise<void>
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
  onSaveNftPoints,
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
  /** Inline per-NFT points drafts keyed by nft id */
  const [pointsDrafts, setPointsDrafts] = useState<Record<string, string>>({})
  const {
    verified,
    remainingMs,
    markPassed,
    consume: consumeVerify,
    reset: resetVerify,
  } = useHumanVerify()

  // Keep draft in sync when cloud threshold loads/changes
  useEffect(() => {
    setThresholdDraft(String(redeemPoints))
  }, [redeemPoints])

  // Sync inline drafts when catalog refreshes
  useEffect(() => {
    const next: Record<string, string> = {}
    for (const nft of catalog) {
      next[nft.id] = String(nft.requiredPoints)
    }
    setPointsDrafts(next)
  }, [catalog])

  // Default add-form points to current global / default when empty
  useEffect(() => {
    setForm((prev) =>
      prev.requiredPoints.trim() === ''
        ? { ...prev, requiredPoints: String(redeemPoints) }
        : prev,
    )
  }, [redeemPoints])

  const minRequired =
    catalog.length > 0
      ? Math.min(...catalog.map((n) => n.requiredPoints))
      : redeemPoints
  const anyEligible = catalog.some((n) => points >= n.requiredPoints)
  const progressTarget = minRequired

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
          {t('rewards.subtitle')}
        </p>
        <p className="mt-2 text-xs text-hawk-muted">{t('rewards.offchainNote')}</p>
      </div>

      {admin && onSaveRedeemPoints && onSaveNft && onSaveNftPoints && onDeleteNft && (
        <div className="hawk-card mb-6 border border-hawk-gold/30 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-hawk-gold">
            {t('rewards.admin.title')}
          </h2>
          <p className="mt-1 text-xs text-hawk-muted">{t('rewards.admin.hint')}</p>
          <p className="mt-1 text-xs text-hawk-muted">{t('rewards.admin.perNftHint')}</p>

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
                required
                className="hawk-input mt-1 w-full"
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
              const req = Number(form.requiredPoints)
              if (!Number.isFinite(req) || req < 1) {
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
                  requiredPoints: Math.floor(req),
                  sortOrder: Number(form.sortOrder) || 0,
                })
                setForm({ ...emptyForm, requiredPoints: String(redeemPoints) })
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
                  } else if (code === 'INVALID_POINTS') {
                    setAdminMsg(t('rewards.admin.invalidPoints'))
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
          <p className="mt-1 text-[11px] text-hawk-muted">
            {t('rewards.admin.editPointsHint')}
          </p>
          <ul className="mt-2 max-h-72 space-y-2 overflow-y-auto text-xs">
            {catalog.map((nft) => {
              const draft = pointsDrafts[nft.id] ?? String(nft.requiredPoints)
              const dirty = Number(draft) !== nft.requiredPoints
              return (
                <li
                  key={nft.id}
                  className="flex flex-wrap items-center gap-2 rounded-md bg-hawk-panel/50 px-2 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-hawk-cream">
                    <span className="font-mono text-hawk-muted">{nft.id}</span>
                    {' · '}
                    {resolveNftTitle(nft, t)}
                  </span>
                  <label className="flex items-center gap-1 text-hawk-muted">
                    <span className="whitespace-nowrap">
                      {t('rewards.admin.pointsLabel')}
                    </span>
                    <input
                      type="number"
                      min={1}
                      className="hawk-input w-24 py-1 text-sm"
                      value={draft}
                      disabled={adminBusy}
                      onChange={(e) =>
                        setPointsDrafts((prev) => ({
                          ...prev,
                          [nft.id]: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <button
                    type="button"
                    disabled={adminBusy || !dirty}
                    className="hawk-btn hawk-btn-primary shrink-0 px-2 py-1 text-[11px] disabled:opacity-40"
                    title={t('rewards.admin.savePoints')}
                    onClick={() => {
                      const n = Number(draft)
                      if (!Number.isFinite(n) || n < 1) {
                        setAdminMsg(t('rewards.admin.invalidPoints'))
                        return
                      }
                      setAdminBusy(true)
                      setAdminMsg(null)
                      void onSaveNftPoints(nft.id, Math.floor(n))
                        .then(() => setAdminMsg(t('rewards.admin.pointsSaved')))
                        .catch(() => setAdminMsg(t('rewards.admin.saveFailed')))
                        .finally(() => setAdminBusy(false))
                    }}
                  >
                    <Save className="h-3 w-3" />
                    {t('rewards.admin.savePoints')}
                  </button>
                  <button
                    type="button"
                    className="shrink-0 text-red-300 hover:text-red-200"
                    title={t('rewards.admin.delete')}
                    disabled={adminBusy}
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
              )
            })}
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
                  {t('rewards.pointsToward', {
                    n: progressTarget.toLocaleString(),
                  })}
                </span>
              </p>
            </div>
            {!anyEligible && (
              <button
                type="button"
                onClick={onPlayGame}
                className="hawk-btn hawk-btn-primary px-4 py-2 text-sm"
              >
                {t('rewards.earnMore')}
              </button>
            )}
            {anyEligible && (
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
                width: `${Math.min(100, Math.round((points / Math.max(1, progressTarget)) * 100))}%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-hawk-muted">
            {anyEligible
              ? t('rewards.ready')
              : t('rewards.needMore', {
                  n: Math.max(0, progressTarget - points).toLocaleString(),
                })}
          </p>
        </div>
      )}

      {session && (
        <HumanVerify
          verified={verified}
          remainingMs={remainingMs}
          onPassed={markPassed}
          onReset={resetVerify}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {catalog.map((nft) => {
          const owned = !!(session && claims[nft.id])
          const need = nft.requiredPoints
          const eligible = points >= need
          const canClaim = !!session && eligible && !owned && verified
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
                      disabled={!!session && (!eligible || (!verified && eligible) || owned)}
                      onClick={() => {
                        if (!session) {
                          onRequireAuth()
                          return
                        }
                        if (!eligible || !verified) return
                        void onClaim(nft.id, title, need).then((ok) => {
                          if (ok) consumeVerify()
                        })
                      }}
                      className={`hawk-btn w-full px-4 py-2.5 text-sm ${
                        canClaim
                          ? 'hawk-btn-primary'
                          : 'cursor-not-allowed border border-hawk-border bg-hawk-ink text-hawk-muted opacity-70'
                      }`}
                    >
                      {!session
                        ? t('auth.signIn')
                        : !eligible
                          ? t('rewards.locked')
                          : !verified
                            ? t('verify.required')
                            : t('rewards.claim')}
                    </button>
                  )}

                  {(owned || (session && eligible)) && (
                    <button
                      type="button"
                      disabled={!verified}
                      className={`hawk-btn hawk-btn-ghost w-full px-4 py-2 text-sm ${
                        !verified ? 'cursor-not-allowed opacity-50' : ''
                      }`}
                      title={!verified ? t('verify.required') : undefined}
                      onClick={() => {
                        if (!verified) return
                        void downloadNftImage(nft.image, fileName)
                      }}
                    >
                      <Download className="h-3.5 w-3.5" />
                      {!verified
                        ? t('verify.required')
                        : owned
                          ? t('rewards.downloadOwned')
                          : t('rewards.download')}
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
