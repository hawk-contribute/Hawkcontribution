import { useCallback, useState } from 'react'
import { SEEDED_OPPORTUNITIES } from './data/opportunities'
import { useContributions } from './hooks/useContributions'
import { useIdentity } from './hooks/useIdentity'
import { useI18n } from './i18n'
import type { Opportunity } from './types'
import { BrowseView } from './components/BrowseView'
import { ContributeModal } from './components/ContributeModal'
import { Header } from './components/Header'
import { IdentityModal } from './components/IdentityModal'
import { LedgerView } from './components/LedgerView'
import { Toast } from './components/Toast'

type Tab = 'browse' | 'ledger'

export default function App() {
  const { t, lx } = useI18n()
  const [tab, setTab] = useState<Tab>('browse')
  const [identityOpen, setIdentityOpen] = useState(false)
  const [activeOpp, setActiveOpp] = useState<Opportunity | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const { identity, setIdentity, clearIdentity } = useIdentity()
  const { contributions, addContribution } = useContributions()

  const handleJoin = useCallback(
    (opportunity: Opportunity) => {
      if (!identity) {
        setIdentityOpen(true)
        setToast(t('toast.needIdentity'))
        return
      }
      setActiveOpp(opportunity)
    },
    [identity, t],
  )

  const handleSubmitContribution = useCallback(
    (data: { title: string; description: string; proofUrl?: string }) => {
      if (!identity || !activeOpp) return
      addContribution({
        opportunity: activeOpp,
        title: data.title,
        description: data.description,
        proofUrl: data.proofUrl,
        participantName: identity.displayName,
        opportunityTitleSnapshot: lx(activeOpp.title),
      })
      setActiveOpp(null)
      setToast(t('toast.saved'))
      setTab('ledger')
    },
    [identity, activeOpp, addContribution, t, lx],
  )

  const clearToast = useCallback(() => setToast(null), [])

  return (
    <div className="hawk-grid min-h-svh">
      <Header
        tab={tab}
        onTabChange={setTab}
        identity={identity}
        onOpenIdentity={() => setIdentityOpen(true)}
        contributionCount={contributions.length}
      />

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {tab === 'browse' ? (
          <BrowseView opportunities={SEEDED_OPPORTUNITIES} onJoin={handleJoin} />
        ) : (
          <LedgerView contributions={contributions} onBrowse={() => setTab('browse')} />
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

      <IdentityModal
        open={identityOpen}
        initial={identity}
        onClose={() => setIdentityOpen(false)}
        onSave={setIdentity}
        onClear={clearIdentity}
      />

      <ContributeModal
        opportunity={activeOpp}
        participantName={identity?.displayName ?? ''}
        onClose={() => setActiveOpp(null)}
        onSubmit={handleSubmitContribution}
      />

      <Toast message={toast} onDone={clearToast} />
    </div>
  )
}
