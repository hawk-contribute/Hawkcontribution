import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Circle,
  Download,
  Gift,
  Hash,
  Lock,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react'
import type {
  Contribution,
  NftClaimEntry,
  NftDefinition,
  PointsAccount,
  Session,
} from '../types'
import { useI18n } from '../i18n'
import { asset } from '../lib/asset'
import { isSiteAdmin } from '../lib/admins'
import {
  evaluateContributeEligibility,
  type ContributeClaimSettings,
} from '../lib/contributeEligibility'
import {
  resolveNftBlurb,
  resolveNftTitle,
  uploadNftRewardImage,
  type NftUpsertInput,
} from '../lib/nftCatalog'
import { useHumanVerify } from '../hooks/useHumanVerify'
import { formatClaimSerial, isValidClaimSerial } from '../lib/nftClaimSerial'
import { downloadNftImage, stampedDownloadName } from '../lib/nftStamp'
import { DonationCard } from './DonationCard'
import { HumanVerify } from './HumanVerify'

interface RewardsViewProps {
  session: Session | null
  account: PointsAccount
  claims: Record<string, NftClaimEntry>
  catalog: NftDefinition[]
  redeemPoints: number
  /** All feed contributions; eligibility filters to this signed-in user only */
  contributions: Contribution[]
  contributeSettings: ContributeClaimSettings
  /** Claim-cycle epoch: posts at/before this no longer count for this user */
  eligibilityResetAt: string | null
  onRequireAuth: () => void
  onClaim: (
    nftId: string,
    title: string,
    requiredPoints: number,
  ) => Promise<NftClaimEntry | null>
  onPlayGame: () => void
  onProvide?: () => void
  onSaveRedeemPoints?: (points: number) => Promise<void>
  onSaveContributeClaimSettings?: (input: ContributeClaimSettings) => Promise<void>
  onSaveNft?: (input: NftUpsertInput) => Promise<void>
  onSaveNftPoints?: (id: string, points: number) => Promise<void>
  onDeleteNft?: (id: string) => Promise<void>
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
  contributions,
  contributeSettings,
  eligibilityResetAt,
  onRequireAuth,
  onClaim,
  onPlayGame,
  onProvide,
  onSaveRedeemPoints,
  onSaveContributeClaimSettings,
  onSaveNft,
  onSaveNftPoints,
  onDeleteNft,
}: RewardsViewProps) {
  const { t } = useI18n()
  const admin = isSiteAdmin(session?.email)
  const points = account.total

  const [thresholdDraft, setThresholdDraft] = useState(String(redeemPoints))
  const [perItemDraft, setPerItemDraft] = useState(
    String(contributeSettings.contributeValuePerItem),
  )
  const [valueThresholdDraft, setValueThresholdDraft] = useState(
    String(contributeSettings.contributeValueThreshold),
  )
  const [minTypesDraft, setMinTypesDraft] = useState(
    String(contributeSettings.minContributeTypes),
  )
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

  useEffect(() => {
    setPerItemDraft(String(contributeSettings.contributeValuePerItem))
    setValueThresholdDraft(String(contributeSettings.contributeValueThreshold))
    setMinTypesDraft(String(contributeSettings.minContributeTypes))
  }, [contributeSettings])

  const eligibility = useMemo(
    () =>
      evaluateContributeEligibility(
        contributions,
        session,
        contributeSettings,
        eligibilityResetAt,
      ),
    [contributions, session, contributeSettings, eligibilityResetAt],
  )
  const contributeReady = eligibility.meetsContributeGate

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
        <p className="mt-1 text-xs text-hawk-muted">{t('rewards.serialHint')}</p>
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

          {onSaveContributeClaimSettings && (
            <div className="mt-5 border-t border-hawk-border/60 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-hawk-cream">
                {t('rewards.admin.contributeTitle')}
              </h3>
              <p className="mt-1 text-[11px] text-hawk-muted">
                {t('rewards.admin.contributeHint')}
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <label className="block min-w-[8rem] flex-1 text-left text-xs text-hawk-muted">
                  {t('rewards.admin.perItemValue')}
                  <input
                    type="number"
                    min={1}
                    className="hawk-input mt-1 w-full"
                    value={perItemDraft}
                    onChange={(e) => setPerItemDraft(e.target.value)}
                  />
                </label>
                <label className="block min-w-[8rem] flex-1 text-left text-xs text-hawk-muted">
                  {t('rewards.admin.valueThreshold')}
                  <input
                    type="number"
                    min={0}
                    className="hawk-input mt-1 w-full"
                    value={valueThresholdDraft}
                    onChange={(e) => setValueThresholdDraft(e.target.value)}
                  />
                </label>
                <label className="block min-w-[8rem] flex-1 text-left text-xs text-hawk-muted">
                  {t('rewards.admin.minTypes')}
                  <input
                    type="number"
                    min={1}
                    className="hawk-input mt-1 w-full"
                    value={minTypesDraft}
                    onChange={(e) => setMinTypesDraft(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  disabled={adminBusy}
                  className="hawk-btn hawk-btn-primary px-4 py-2 text-sm"
                  onClick={() => {
                    const perItem = Number(perItemDraft)
                    const thr = Number(valueThresholdDraft)
                    const minT = Number(minTypesDraft)
                    if (
                      !Number.isFinite(perItem) ||
                      perItem < 1 ||
                      !Number.isFinite(thr) ||
                      thr < 0 ||
                      !Number.isFinite(minT) ||
                      minT < 1
                    ) {
                      setAdminMsg(t('rewards.admin.invalidContribute'))
                      return
                    }
                    setAdminBusy(true)
                    setAdminMsg(null)
                    void onSaveContributeClaimSettings({
                      contributeValuePerItem: Math.floor(perItem),
                      contributeValueThreshold: Math.floor(thr),
                      minContributeTypes: Math.floor(minT),
                    })
                      .then(() => setAdminMsg(t('rewards.admin.saved')))
                      .catch(() => setAdminMsg(t('rewards.admin.saveFailed')))
                      .finally(() => setAdminBusy(false))
                  }}
                >
                  {t('rewards.admin.saveContribute')}
                </button>
              </div>
            </div>
          )}

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
        <div className="hawk-card mb-6 border border-hawk-gold/25 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-hawk-gold">
            {t('rewards.criteria.title')}
          </h2>
          <p className="mt-1 text-xs text-hawk-muted">{t('rewards.criteria.hint')}</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li className="flex items-start gap-2">
              {eligibility.meetsValue ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-hawk-gold" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-hawk-muted" />
              )}
              <span className={eligibility.meetsValue ? 'text-hawk-cream' : 'text-hawk-muted'}>
                {eligibility.meetsValue
                  ? t('rewards.criteria.valueOk', {
                      sum: eligibility.sum.toLocaleString(),
                      threshold: eligibility.threshold.toLocaleString(),
                    })
                  : t('rewards.criteria.value', {
                      sum: eligibility.sum.toLocaleString(),
                      threshold: eligibility.threshold.toLocaleString(),
                    })}
              </span>
            </li>
            <li className="flex items-start gap-2">
              {eligibility.meetsTypes ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-hawk-gold" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-hawk-muted" />
              )}
              <div>
                <span className={eligibility.meetsTypes ? 'text-hawk-cream' : 'text-hawk-muted'}>
                  {eligibility.meetsTypes
                    ? t('rewards.criteria.typesOk', {
                        count: String(eligibility.typeCount),
                        min: String(eligibility.minTypes),
                      })
                    : t('rewards.criteria.types', {
                        count: String(eligibility.typeCount),
                        min: String(eligibility.minTypes),
                      })}
                </span>
                <p className="mt-0.5 text-xs text-hawk-muted">
                  {eligibility.types.length
                    ? t('rewards.criteria.typesList', {
                        list: eligibility.types
                          .map((k) => t(`type.${k}`))
                          .join(' · '),
                      })
                    : t('rewards.criteria.typesNone')}
                </p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              {anyEligible ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-hawk-gold" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-hawk-muted" />
              )}
              <span className={anyEligible ? 'text-hawk-cream' : 'text-hawk-muted'}>
                {t('rewards.criteria.points', {
                  have: points.toLocaleString(),
                  need: progressTarget.toLocaleString(),
                })}
              </span>
            </li>
            <li className="flex items-start gap-2">
              {verified ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-hawk-gold" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-hawk-muted" />
              )}
              <span className={verified ? 'text-hawk-cream' : 'text-hawk-muted'}>
                {verified
                  ? t('rewards.criteria.verifyOk')
                  : t('rewards.criteria.verifyNeed')}
              </span>
            </li>
          </ul>
          {!contributeReady && (
            <div className="mt-3 space-y-1 text-xs text-amber-200/90">
              {!eligibility.meetsValue && (
                <p>
                  {t('rewards.criteria.blockedValue', {
                    threshold: eligibility.threshold.toLocaleString(),
                    sum: eligibility.sum.toLocaleString(),
                  })}
                </p>
              )}
              {!eligibility.meetsTypes && (
                <p>
                  {t('rewards.criteria.blockedTypes', {
                    min: String(eligibility.minTypes),
                    count: String(eligibility.typeCount),
                  })}
                </p>
              )}
              {onProvide && (
                <button
                  type="button"
                  className="hawk-btn hawk-btn-ghost mt-2 px-3 py-1.5 text-xs"
                  onClick={onProvide}
                >
                  {t('nav.provide') !== 'nav.provide'
                    ? t('nav.provide')
                    : t('contribute.title')}
                </button>
              )}
            </div>
          )}
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
          const claim = session ? claims[nft.id] : undefined
          const need = nft.requiredPoints
          const eligible = points >= need
          const canClaim =
            !!session &&
            eligible &&
            !owned &&
            verified &&
            contributeReady
          const locked = !session || !eligible || !contributeReady
          const title = resolveNftTitle(nft, t)
          const blurb = resolveNftBlurb(nft, t)
          const rarityRaw = t(`rewards.rarity.${nft.rarityKey}`)
          const rarityLabel =
            rarityRaw === `rewards.rarity.${nft.rarityKey}`
              ? nft.rarityKey
              : rarityRaw
          const serialDisplay = isValidClaimSerial(claim?.claimSerial)
            ? formatClaimSerial(claim.claimSerial)
            : t('rewards.claimSerialNone')
          const stampCopy = {
            serialText: t('rewards.stamp.serial', { n: serialDisplay }),
            voucherText: t('rewards.stamp.voucher'),
            levelText: t('rewards.stamp.level', { level: rarityLabel }),
          }

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
                  {rarityLabel}
                </span>
                {owned && (
                  <span className="absolute right-3 top-3 rounded-full bg-hawk-gold px-2.5 py-0.5 text-[10px] font-bold text-hawk-black">
                    {t('rewards.owned')}
                  </span>
                )}
                {owned && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/75 to-transparent px-3 pb-2.5 pt-10">
                    <p className="font-mono text-[11px] font-bold tracking-wide text-hawk-gold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                      {t('rewards.stamp.serial', { n: serialDisplay })}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-hawk-cream drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                      {t('rewards.stamp.voucher')}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-hawk-gold/90">
                      {t('rewards.stamp.level', { level: rarityLabel })}
                    </p>
                  </div>
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

                {owned && (
                  <div className="mt-3 space-y-1.5 rounded-lg border border-hawk-gold/25 bg-hawk-ink/70 px-3 py-2.5">
                    <p className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-hawk-gold">
                      <Hash className="h-3.5 w-3.5" />
                      {t('rewards.claimSerial', { n: serialDisplay })}
                    </p>
                    <p className="text-xs leading-relaxed text-hawk-cream">
                      {t('rewards.voucherNote')}
                    </p>
                    <p className="text-xs font-medium text-hawk-muted">
                      {t('rewards.level', { level: rarityLabel })}
                    </p>
                  </div>
                )}

                <div className="mt-3 flex flex-col gap-2">
                  {owned ? (
                    <p className="text-sm font-semibold text-hawk-gold">
                      {t('rewards.owned')}
                    </p>
                  ) : (
                    <button
                      type="button"
                      disabled={
                        !!session &&
                        (!eligible ||
                          !contributeReady ||
                          (!verified && eligible && contributeReady) ||
                          owned)
                      }
                      onClick={() => {
                        if (!session) {
                          onRequireAuth()
                          return
                        }
                        if (!eligible || !contributeReady || !verified) return
                        void onClaim(nft.id, title, need).then((entry) => {
                          if (!entry) return
                          consumeVerify()
                          const serial = entry.claimSerial
                          void downloadNftImage(
                            nft.image,
                            stampedDownloadName(nft.image, nft.id, serial),
                            {
                              serialText: t('rewards.stamp.serial', {
                                n: formatClaimSerial(serial),
                              }),
                              voucherText: t('rewards.stamp.voucher'),
                              levelText: t('rewards.stamp.level', {
                                level: rarityLabel,
                              }),
                            },
                          )
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
                        : !contributeReady
                          ? t('rewards.criteria.blockedContribute')
                          : !eligible
                            ? t('rewards.locked')
                            : !verified
                              ? t('verify.required')
                              : t('rewards.claim')}
                    </button>
                  )}

                  {(owned || (session && eligible && contributeReady)) && (
                    <button
                      type="button"
                      disabled={!verified}
                      className={`hawk-btn hawk-btn-ghost w-full px-4 py-2 text-sm ${
                        !verified ? 'cursor-not-allowed opacity-50' : ''
                      }`}
                      title={!verified ? t('verify.required') : undefined}
                      onClick={() => {
                        if (!verified) return
                        if (owned) {
                          void downloadNftImage(
                            nft.image,
                            stampedDownloadName(
                              nft.image,
                              nft.id,
                              claim?.claimSerial,
                            ),
                            stampCopy,
                          )
                        } else {
                          const fileName =
                            nft.image.split('/').pop() || `${nft.id}.jpg`
                          void downloadNftImage(nft.image, fileName)
                        }
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
