import { useCallback, useMemo, useState } from 'react'
import { SEEDED_OPPORTUNITIES } from './data/opportunities'
import { useCommunity } from './hooks/useCommunity'
import { usePoints } from './hooks/usePoints'
import { useSession } from './hooks/useSession'
import { useI18n } from './i18n'
import { recordGameActivity } from './lib/storage'
import type { Contribution, Opportunity } from './types'
import { ActivityMarquee } from './components/ActivityMarquee'
import { AuthModal } from './components/AuthModal'
import { BrowseView } from './components/BrowseView'
import { FeedView } from './components/FeedView'
import { GameView } from './components/GameView'
import { Header } from './components/Header'
import { LedgerView } from './components/LedgerView'
import { StatsBar } from './components/StatsBar'
import { Toast } from './components/Toast'
import { UploadModal } from './components/UploadModal'

type Tab = 'browse' | 'feed' | 'ledger' | 'game'

export default function App() {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('browse')
  const [authOpen, setAuthOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [presetOpp, setPresetOpp] = useState<Opportunity | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<'upload' | 'join' | 'game' | null>(
    null,
  )
  const [pendingOpp, setPendingOpp] = useState<Opportunity | null>(null)

  const { session, signIn, signOut } = useSession()
  const {
    contributions,
    social,
    stats,
    addContribution,
    toggleLike,
    addComment,
    addQuote,
    refresh,
  } = useCommunity()
  const { account, communityPoints, recordRound } = usePoints(session?.email)

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
    (intent: 'upload' | 'join' | 'game' | null = null) => {
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

  const handleSignedIn = useCallback(
    (input: { email: string; displayName?: string }) => {
      signIn(input)
      setToast(t('toast.signedIn'))
      const action = pendingAction
      const opp = pendingOpp
      setPendingAction(null)
      setPendingOpp(null)
      if (action === 'join' || action === 'upload') {
        setPresetOpp(opp)
        setUploadOpen(true)
      }
      if (action === 'game') {
        setTab('game')
      }
    },
    [signIn, t, pendingAction, pendingOpp],
  )

  const handleSignOut = useCallback(() => {
    signOut()
    setToast(t('toast.signedOut'))
  }, [signOut, t])

  const handleUploadSubmit = useCallback(
    (data: {
      category: import('./types').ContributionCategory
      opportunityId?: string
      opportunityTitle: string
      title: string
      description: string
      proofUrl?: string
      files: import('./types').UploadedFileMeta[]
    }) => {
      if (!session) return
      addContribution({
        ...data,
        participantName: session.displayName,
        participantEmail: session.email,
      })
      setUploadOpen(false)
      setPresetOpp(null)
      setToast(t('toast.uploaded'))
      setTab('feed')
    },
    [session, addContribution, t],
  )

  const handleToggleLike = useCallback(
    (c: Contribution) => {
      if (!session) return requireAuth()
      const wasLiked = (social.likes[c.id] ?? []).includes(session.email)
      toggleLike(c, session)
      setToast(wasLiked ? t('toast.unliked') : t('toast.liked'))
    },
    [session, social.likes, toggleLike, requireAuth, t],
  )

  const handleAddComment = useCallback(
    (c: Contribution, body: string) => {
      if (!session) return requireAuth()
      addComment(c, session, body)
      setToast(t('toast.commented'))
    },
    [session, addComment, requireAuth, t],
  )

  const handleAddQuote = useCallback(
    (quoted: Contribution, remark: string) => {
      if (!session) return requireAuth()
      addQuote(quoted, session, remark)
      setToast(t('toast.quoted'))
    },
    [session, addQuote, requireAuth, t],
  )

  const handleRoundComplete = useCallback(
    (score: number, hits: number) => {
      if (!session || score <= 0) return
      recordRound(score, hits)
      recordGameActivity({
        actorName: session.displayName,
        actorEmail: session.email,
        score,
      })
      refresh()
      setToast(t('toast.gamePoints', { n: score }))
    },
    [session, recordRound, refresh, t],
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
        onSignIn={() => setAuthOpen(true)}
        onSignOut={handleSignOut}
        onProvide={handleProvide}
        contributionCount={myContributions.length}
      />

      <ActivityMarquee activities={social.activities} />
      <StatsBar stats={statsWithPoints} />

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
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
        {tab === 'game' && (
          <GameView
            session={session}
            account={account}
            onRequireAuth={() => requireAuth('game')}
            onRoundComplete={handleRoundComplete}
          />
        )}
      </main>

      <footer className="border-t border-hawk-border/60 py-6 text-center text-xs text-hawk-muted">
        <p>{t('footer.line1')}</p>
        <p className="mt-1 opacity-70">{t('feed.localNote')}</p>
      </footer>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSignIn={handleSignedIn}
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
