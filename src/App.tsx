import { useCallback, useState } from 'react'
import { SEEDED_OPPORTUNITIES } from './data/opportunities'
import { useContributions } from './hooks/useContributions'
import { useSession } from './hooks/useSession'
import { useI18n } from './i18n'
import type { Opportunity } from './types'
import { AuthModal } from './components/AuthModal'
import { BrowseView } from './components/BrowseView'
import { Header } from './components/Header'
import { LedgerView } from './components/LedgerView'
import { Toast } from './components/Toast'
import { UploadModal } from './components/UploadModal'

type Tab = 'browse' | 'ledger'

export default function App() {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('browse')
  const [authOpen, setAuthOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [presetOpp, setPresetOpp] = useState<Opportunity | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<'upload' | 'join' | null>(null)
  const [pendingOpp, setPendingOpp] = useState<Opportunity | null>(null)

  const { session, signIn, signOut } = useSession()
  const { contributions, addContribution } = useContributions()

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
      setTab('ledger')
    },
    [session, addContribution, t],
  )

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
        contributionCount={contributions.length}
      />

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {tab === 'browse' ? (
          <BrowseView
            opportunities={SEEDED_OPPORTUNITIES}
            onJoin={handleJoin}
            onProvide={handleProvide}
          />
        ) : (
          <LedgerView
            contributions={contributions}
            onBrowse={() => setTab('browse')}
            onProvide={handleProvide}
            signedIn={!!session}
          />
        )}
      </main>

      <footer className="border-t border-hawk-border/60 py-6 text-center text-xs text-hawk-muted">
        <p>{t('footer.line1')}</p>
        <p className="mt-1 opacity-70">
          Future rewards hook: see{' '}
          <code className="text-hawk-blue-bright/90">src/types.ts</code>
          {' & '}
          <code className="text-hawk-blue-bright/90">useContributions.ts</code>
        </p>
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
