import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SEEDED_OPPORTUNITIES } from './data/opportunities'
import { useCommunity } from './hooks/useCommunity'
import { useNftClaims } from './hooks/useNftClaims'
import { usePoints } from './hooks/usePoints'
import { useSession } from './hooks/useSession'
import { useI18n } from './i18n'
import { recordGameActivity, recordNftActivity } from './lib/storage'
import { NFT_REDEEM_POINTS } from './types'
import type { Contribution, Opportunity } from './types'
import { ActivityMarquee } from './components/ActivityMarquee'
import { AuthModal } from './components/AuthModal'
import { BrowseView } from './components/BrowseView'
import { FeedView } from './components/FeedView'
import { GameHub } from './components/GameHub'
import { Header } from './components/Header'
import { LedgerView } from './components/LedgerView'
import { RewardsView } from './components/RewardsView'
import { StatsBar } from './components/StatsBar'
import { Toast } from './components/Toast'
import { UploadModal } from './components/UploadModal'

type Tab = 'game' | 'browse' | 'feed' | 'ledger' | 'rewards'

export default function App() {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('browse')
  const [authOpen, setAuthOpen] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [presetOpp, setPresetOpp] = useState<Opportunity | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<
    'upload' | 'join' | 'game' | 'rewards' | null
  >(null)
  const [pendingOpp, setPendingOpp] = useState<Opportunity | null>(null)
  const welcomedRef = useRef<string | null>(null)

  const {
    session,
    authError,
    passwordRecovery,
    clearAuthError,
    signInWithPassword,
    signUpWithPassword,
    requestPasswordReset,
    updatePassword,
    signOut,
  } = useSession()
  const {
    contributions,
    social,
    stats,
    addContribution,
    toggleLike,
    addComment,
    addQuote,
    refresh,
  } = useCommunity({ live: tab === 'feed' || tab === 'browse' || tab === 'ledger' })
  const { account, communityPoints, recordRound } = usePoints(
    session?.email,
    session?.userId,
  )
  const { claims, claim } = useNftClaims(session?.email, session?.userId)

  const statsWithPoints = useMemo(
    () => ({ ...stats, points: communityPoints }),
    [stats, communityPoints],
  )

  const openUpload = useCallback(
    (opp?: Opportunity | null) => {
      if (!session) {
        setPendingAction(opp ? 'join' : 'upload')
        setPendingOpp(opp ?? null)
        setAuthOpen(true)
        setToast(t('toast.needAuth'))
        return
      }
      setPresetOpp(opp ?? null)
      setUploadOpen(true)
    },
    [session, t],
  )

  const requireAuth = useCallback(
    (intent: 'upload' | 'join' | 'game' | 'rewards' | null = null) => {
      if (intent) setPendingAction(intent)
      setAuthOpen(true)
      setToast(t('toast.needAuth'))
    },
    [t],
  )

  const handleJoin = useCallback(
    (opportunity: Opportunity) => openUpload(opportunity),
    [openUpload],
  )
  const handleProvide = useCallback(() => openUpload(null), [openUpload])

  // After magic-link redirect establishes a session, resume pending intent once.
  useEffect(() => {
    if (!session) {
      welcomedRef.current = null
      return
    }
    if (welcomedRef.current === session.email) return
    welcomedRef.current = session.email
    setAuthOpen(false)
    setToast(t('toast.signedIn'))
    const action = pendingAction
    const opp = pendingOpp
    setPendingAction(null)
    setPendingOpp(null)
    if (action === 'join' || action === 'upload') {
      setPresetOpp(opp)
      setUploadOpen(true)
    }
    if (action === 'game') setTab('game')
    if (action === 'rewards') setTab('rewards')
  }, [session, t, pendingAction, pendingOpp])

  // Surface leftover auth-callback errors
  useEffect(() => {
    if (!authError) return
    setToast(authError)
    setAuthOpen(true)
    clearAuthError()
  }, [authError, clearAuthError])

  // Recovery link → force set-new-password UI
  useEffect(() => {
    if (!passwordRecovery) return
    setAuthOpen(true)
  }, [passwordRecovery])

  const handlePasswordSignIn = useCallback(
    async (input: { email: string; password: string }) => {
      await signInWithPassword(input)
      setToast(t('toast.signedIn'))
    },
    [signInWithPassword, t],
  )

  const handlePasswordSignUp = useCallback(
    async (input: {
      email: string
      password: string
      displayName?: string
    }) => {
      const result = await signUpWithPassword(input)
      if (result === 'signed_in') setToast(t('toast.signedIn'))
      return result
    },
    [signUpWithPassword, t],
  )

  const handleRequestReset = useCallback(
    async (email: string) => {
      await requestPasswordReset(email)
      setToast(t('toast.resetSent'))
    },
    [requestPasswordReset, t],
  )

  const handleUpdatePassword = useCallback(
    async (password: string) => {
      await updatePassword(password)
      setToast(t('toast.passwordUpdated'))
    },
    [updatePassword, t],
  )

  const handleSignOut = useCallback(async () => {
    await signOut()
    setToast(t('toast.signedOut'))
  }, [signOut, t])

  const handleUploadSubmit = useCallback(
    async (data: {
      category: import('./types').ContributionCategory
      opportunityId?: string
      opportunityTitle: string
      title: string
      description: string
      proofUrl?: string
      files: import('./types').UploadedFileMeta[]
    }) => {
      if (!session?.userId) {
        setToast(t('toast.needAuth'))
        return
      }
      try {
        await addContribution({
          ...data,
          participantName: session.displayName,
          participantEmail: session.email,
          session,
        })
        setUploadOpen(false)
        setPresetOpp(null)
        setToast(t('toast.uploaded'))
        setTab('feed')
      } catch (e) {
        console.warn(e)
        setToast(t('toast.cloudWriteFailed'))
      }
    },
    [session, addContribution, t],
  )

  const handleToggleLike = useCallback(
    async (c: Contribution) => {
      if (!session?.userId) return requireAuth()
      const wasLiked = (social.likes[c.id] ?? []).includes(session.email)
      try {
        await toggleLike(c, session)
        setToast(wasLiked ? t('toast.unliked') : t('toast.liked'))
      } catch (e) {
        console.warn(e)
        setToast(t('toast.cloudWriteFailed'))
      }
    },
    [session, social.likes, toggleLike, requireAuth, t],
  )

  const handleAddComment = useCallback(
    async (c: Contribution, body: string) => {
      if (!session?.userId) return requireAuth()
      try {
        await addComment(c, session, body)
        setToast(t('toast.commented'))
      } catch (e) {
        console.warn(e)
        setToast(t('toast.cloudWriteFailed'))
      }
    },
    [session, addComment, requireAuth, t],
  )

  const handleAddQuote = useCallback(
    async (quoted: Contribution, remark: string) => {
      if (!session?.userId) return requireAuth()
      try {
        await addQuote(quoted, session, remark)
        setToast(t('toast.quoted'))
      } catch (e) {
        console.warn(e)
        setToast(t('toast.cloudWriteFailed'))
      }
    },
    [session, addQuote, requireAuth, t],
  )

  const handleRoundComplete = useCallback(
    (score: number, hits: number) => {
      if (!session || score <= 0) return
      recordRound(score, hits)
      void recordGameActivity({
        actorName: session.displayName,
        actorEmail: session.email,
        score,
      }).then(() => refresh())
      setToast(t('toast.gamePoints', { n: score }))
    },
    [session, recordRound, refresh, t],
  )

  const handleClaimNft = useCallback(
    async (nftId: string, title: string) => {
      if (!session) return requireAuth('rewards')
      if (account.total < NFT_REDEEM_POINTS) {
        setToast(t('toast.nftNeedPoints'))
        return
      }
      const entry = await claim(nftId)
      if (!entry) return
      await recordNftActivity({
        actorName: session.displayName,
        actorEmail: session.email,
        nftTitle: title,
      })
      await refresh()
      setToast(t('toast.nftClaimed', { title }))
    },
    [session, account.total, claim, requireAuth, refresh, t],
  )

  const myContributions = session
    ? contributions.filter(
        (c) =>
          c.participantEmail === session.email ||
          (!c.seeded && c.participantName === session.displayName),
      )
    : []

  const clearToast = useCallback(() => setToast(null), [])

  return (
    <div className="hawk-grid min-h-svh">
      <Header
        tab={tab}
        onTabChange={setTab}
        session={session}
        onSignIn={() => {
          setChangePasswordOpen(false)
          setAuthOpen(true)
        }}
        onSignOut={() => void handleSignOut()}
        onChangePassword={() => {
          setChangePasswordOpen(true)
          setAuthOpen(true)
        }}
        onProvide={handleProvide}
        contributionCount={myContributions.length}
      />

      <ActivityMarquee activities={social.activities} />
      <StatsBar stats={statsWithPoints} />

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {tab === 'game' && (
          <GameHub
            session={session}
            account={account}
            onRequireAuth={() => requireAuth('game')}
            onRoundComplete={handleRoundComplete}
          />
        )}
        {tab === 'browse' && (
          <BrowseView
            opportunities={SEEDED_OPPORTUNITIES}
            onJoin={handleJoin}
            onProvide={handleProvide}
          />
        )}
        {tab === 'feed' && (
          <FeedView
            contributions={contributions}
            social={social}
            session={session}
            onRequireAuth={() => requireAuth()}
            onToggleLike={handleToggleLike}
            onAddComment={handleAddComment}
            onAddQuote={handleAddQuote}
          />
        )}
        {tab === 'ledger' && (
          <LedgerView
            contributions={myContributions}
            onBrowse={() => setTab('browse')}
            onProvide={handleProvide}
            signedIn={!!session}
          />
        )}
        {tab === 'rewards' && (
          <RewardsView
            session={session}
            account={account}
            claims={claims}
            onRequireAuth={() => requireAuth('rewards')}
            onClaim={(id, title) => void handleClaimNft(id, title)}
            onPlayGame={() => setTab('game')}
          />
        )}
      </main>

      <footer className="border-t border-hawk-border/60 py-6 text-center text-xs text-hawk-muted">
        <p>{t('footer.line1')}</p>
        <p className="mt-1 opacity-70">{t('feed.localNote')}</p>
      </footer>

      <AuthModal
        open={authOpen}
        passwordRecovery={passwordRecovery}
        changePassword={changePasswordOpen && !passwordRecovery}
        onClose={() => {
          setAuthOpen(false)
          setChangePasswordOpen(false)
        }}
        onSignIn={handlePasswordSignIn}
        onSignUp={handlePasswordSignUp}
        onRequestReset={handleRequestReset}
        onUpdatePassword={handleUpdatePassword}
      />

      {session && (
        <UploadModal
          open={uploadOpen}
          session={session}
          opportunities={SEEDED_OPPORTUNITIES}
          presetOpportunity={presetOpp}
          onClose={() => {
            setUploadOpen(false)
            setPresetOpp(null)
          }}
          onSubmit={handleUploadSubmit}
        />
      )}

      <Toast message={toast} onDone={clearToast} />
    </div>
  )
}
