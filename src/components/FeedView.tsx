import { useMemo, useState, type ReactNode } from 'react'
import {
  ExternalLink,
  Heart,
  MessageCircle,
  Quote as QuoteIcon,
  Search,
  Share2,
  Trash2,
  X,
} from 'lucide-react'
import type {
  Comment,
  Contribution,
  ContributionCategory,
  Quote,
  Session,
  SocialState,
} from '../types'
import { useI18n } from '../i18n'
import { isSiteAdmin } from '../lib/admins'
import { displayEmail } from '../lib/maskEmail'
import { safeHttpUrl } from '../lib/safeUrl'
import {
  buildCiteShareText,
  contributionShareUrl,
  facebookSharerUrl,
  openShareWindow,
  telegramShareUrl,
  xIntentUrl,
} from '../lib/shareSocial'

type Filter = 'all' | ContributionCategory

type AuthorFilter = {
  email: string
  name: string
}

interface FeedViewProps {
  contributions: Contribution[]
  social: SocialState
  session: Session | null
  onRequireAuth: () => void
  onToggleLike: (c: Contribution) => void | Promise<void>
  onAddComment: (c: Contribution, body: string) => void | Promise<void>
  onAddQuote: (quoted: Contribution, remark: string) => void | Promise<void>
  onFocusContribution?: (id: string) => void
  onAdminDeleteContribution?: (id: string) => void | Promise<void>
  onAdminDeleteComment?: (id: string) => void | Promise<void>
  onAdminDeleteQuote?: (id: string) => void | Promise<void>
  onAdminDeleteLike?: (contributionId: string, userEmail: string) => void | Promise<void>
}

/** Render remark text with safe http(s) URLs as links (X / FB / Telegram etc.). */
function RemarkWithLinks({ text }: { text: string }) {
  const parts: ReactNode[] = []
  const re = /(https?:\/\/[^\s<>"']+)/gi
  let last = 0
  let m: RegExpExecArray | null
  let key = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const raw = m[1]
    const punctMatch = raw.match(/^(.*?)([),.;!?]+)?$/)
    const candidate = punctMatch?.[1] ?? raw
    const punct = punctMatch?.[2] ?? ''
    const safe = safeHttpUrl(candidate)
    if (safe) {
      parts.push(
        <a
          key={`u-${key++}`}
          href={safe}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all font-medium text-hawk-blue-bright hover:underline"
        >
          {safe}
        </a>,
      )
      if (punct) parts.push(punct)
    } else {
      parts.push(raw)
    }
    last = m.index + raw.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}

function sameAuthor(c: Contribution, author: AuthorFilter): boolean {
  const email = author.email.trim().toLowerCase()
  const name = author.name.trim().toLowerCase()
  if (email && c.participantEmail.trim().toLowerCase() === email) return true
  if (!email && name && c.participantName.trim().toLowerCase() === name) return true
  if (email && c.participantEmail.trim()) return false
  return name !== '' && c.participantName.trim().toLowerCase() === name
}

export function FeedView({
  contributions,
  social,
  session,
  onRequireAuth,
  onToggleLike,
  onAddComment,
  onAddQuote,
  onAdminDeleteContribution,
  onAdminDeleteComment,
  onAdminDeleteQuote,
  onAdminDeleteLike,
}: FeedViewProps) {
  const { t } = useI18n()
  const admin = isSiteAdmin(session?.email)
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [authorFilter, setAuthorFilter] = useState<AuthorFilter | null>(null)
  const [openComments, setOpenComments] = useState<string | null>(null)
  const [openQuote, setOpenQuote] = useState<string | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [quoteDraft, setQuoteDraft] = useState('')
  const [quoteSourceUrl, setQuoteSourceUrl] = useState('')
  const [quoteSourceError, setQuoteSourceError] = useState('')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return contributions.filter((c) => {
      if (filter !== 'all' && c.category !== filter) return false
      if (authorFilter && !sameAuthor(c, authorFilter)) return false
      if (!needle) return true
      return (
        c.title.toLowerCase().includes(needle) ||
        c.description.toLowerCase().includes(needle) ||
        c.participantName.toLowerCase().includes(needle) ||
        c.participantEmail.toLowerCase().includes(needle)
      )
    })
  }, [contributions, filter, q, authorFilter])

  const filters: { id: Filter; labelKey: string }[] = [
    { id: 'all', labelKey: 'filter.all' },
    { id: 'event', labelKey: 'filter.event' },
    { id: 'collab', labelKey: 'filter.collab' },
    { id: 'content', labelKey: 'filter.content' },
  ]

  const commentsFor = (id: string): Comment[] =>
    social.comments.filter((c) => c.contributionId === id)
  const quotesFor = (id: string): Quote[] =>
    social.quotes.filter(
      (qq) => qq.quotedContributionId === id || qq.contributionId === id,
    )
  const likeCount = (id: string) => social.likes[id]?.length ?? 0
  const likedByMe = (id: string) =>
    !!session && (social.likes[id] ?? []).includes(session.email)

  const guard = (fn: () => void) => {
    if (!session) {
      onRequireAuth()
      return
    }
    fn()
  }

  const confirmAdmin = (message: string, fn: () => void) => {
    if (!admin) return
    if (window.confirm(message)) fn()
  }

  const selectAuthor = (c: Contribution) => {
    setAuthorFilter({
      email: c.participantEmail ?? '',
      name: c.participantName,
    })
  }

  const buildRemark = (): string | null => {
    const sourceRaw = quoteSourceUrl.trim()
    let source: string | undefined
    if (sourceRaw) {
      source = safeHttpUrl(sourceRaw)
      if (!source) {
        setQuoteSourceError(t('feed.quoteSourceInvalid'))
        return null
      }
    }
    setQuoteSourceError('')
    return [quoteDraft.trim(), source].filter(Boolean).join('\n\n')
  }

  const shareCite = (
    c: Contribution,
    network: 'x' | 'facebook' | 'telegram',
  ) => {
    const pageUrl = contributionShareUrl(c.id)
    const text = buildCiteShareText({
      title: c.title,
      authorName: c.participantName,
      remark: quoteDraft,
    })
    if (network === 'x') {
      openShareWindow(xIntentUrl(text, pageUrl))
      return
    }
    if (network === 'facebook') {
      openShareWindow(facebookSharerUrl(pageUrl))
      return
    }
    openShareWindow(telegramShareUrl(pageUrl, text))
  }

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-hawk-cream sm:text-3xl">
          {t('feed.title')}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-hawk-muted sm:text-base">
          {t('feed.subtitle')}
        </p>
        <p className="mt-1 max-w-2xl text-xs text-hawk-muted/90">
          {t('feed.contributorHint')}
        </p>
      </div>

      {authorFilter && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hawk-blue/30 bg-hawk-blue/10 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-hawk-cream">
              {t('feed.viewContributor', { name: authorFilter.name })}
            </p>
            <p className="text-xs text-hawk-muted">
              {t('feed.contributorCount', { n: filtered.length })}
              {authorFilter.email
                ? ` · ${displayEmail(authorFilter.email, {
                    viewerEmail: session?.email,
                    isAdmin: admin,
                  })}`
                : ''}
            </p>
          </div>
          <button
            type="button"
            className="hawk-btn hawk-btn-ghost shrink-0 px-3 py-1.5 text-sm"
            onClick={() => setAuthorFilter(null)}
          >
            <X className="h-3.5 w-3.5" />
            {t('feed.clearContributor')}
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-hawk-muted" />
          <input
            className="hawk-input pl-10"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('feed.search')}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`hawk-btn rounded-full px-3 py-1.5 text-sm ${
                filter === f.id
                  ? 'bg-hawk-blue text-white'
                  : 'hawk-btn-ghost'
              }`}
            >
              {t(f.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="hawk-card px-6 py-12 text-center text-sm text-hawk-muted">
          {t('feed.empty')}
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((c) => {
            const comments = commentsFor(c.id)
            const quotes = quotesFor(c.id)
            const likes = likeCount(c.id)
            const isLiked = likedByMe(c.id)
            const proof = safeHttpUrl(c.proofUrl)
            return (
              <li key={c.id} id={`feed-${c.id}`} className="hawk-card p-5 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-hawk-blue/15 px-2.5 py-0.5 text-xs font-semibold text-hawk-blue-bright">
                    {t(`type.${c.category}`)}
                  </span>
                  <button
                    type="button"
                    onClick={() => selectAuthor(c)}
                    className="rounded-full px-1 text-xs font-medium text-hawk-cream/90 underline-offset-2 hover:text-hawk-blue-bright hover:underline"
                    title={t('feed.viewContributor', { name: c.participantName })}
                  >
                    {c.participantName}
                  </button>
                  {admin && onAdminDeleteContribution && (
                    <button
                      type="button"
                      className="ml-auto hawk-btn hawk-btn-ghost px-2 py-1 text-xs text-red-300 hover:border-red-400/40 hover:text-red-200"
                      onClick={() =>
                        confirmAdmin(t('admin.confirmContribution'), () => {
                          void onAdminDeleteContribution(c.id)
                        })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t('admin.deleteContribution')}
                    </button>
                  )}
                </div>
                <h3 className="mt-2 text-base font-bold text-hawk-cream">{c.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-hawk-muted">
                  {c.description}
                </p>
                {c.opportunityTitle && (
                  <p className="mt-2 text-xs text-hawk-muted">
                    {t('ledger.forOpportunity')}：
                    <span className="text-hawk-cream/90">{c.opportunityTitle}</span>
                  </p>
                )}
                {proof && (
                  <a
                    href={proof}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-hawk-blue-bright hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {t('feed.proof')}
                  </a>
                )}

                {quotes.filter((qq) => qq.contributionId === c.id).length > 0 && (
                  <div className="mt-3 space-y-2">
                    {quotes
                      .filter((qq) => qq.contributionId === c.id)
                      .map((qq) => (
                        <div
                          key={qq.id}
                          className="rounded-lg border border-hawk-gold/20 bg-hawk-gold/5 px-3 py-2 text-xs text-hawk-muted"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-hawk-gold">
                              {t('feed.quotedFrom')}：{qq.quotedTitle}
                            </p>
                            {admin && onAdminDeleteQuote && (
                              <button
                                type="button"
                                className="shrink-0 text-red-300 hover:text-red-200"
                                title={t('admin.deleteQuote')}
                                onClick={() =>
                                  confirmAdmin(t('admin.confirmQuote'), () => {
                                    void onAdminDeleteQuote(qq.id)
                                  })
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          {qq.remark && (
                            <p className="mt-1 whitespace-pre-wrap text-hawk-cream/90">
                              <RemarkWithLinks text={qq.remark} />
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      guard(() => onToggleLike(c))
                    }
                    className={`hawk-btn px-3 py-1.5 text-sm ${
                      isLiked
                        ? 'bg-hawk-gold/20 text-hawk-gold'
                        : 'hawk-btn-ghost'
                    }`}
                  >
                    <Heart
                      className={`h-3.5 w-3.5 ${isLiked ? 'fill-hawk-gold' : ''}`}
                    />
                    {isLiked ? t('feed.liked') : t('feed.like')}
                    <span className="opacity-80">{likes}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenQuote(null)
                      setOpenComments(openComments === c.id ? null : c.id)
                      setCommentDraft('')
                    }}
                    className="hawk-btn hawk-btn-ghost px-3 py-1.5 text-sm"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    {t('feed.comment')}
                    <span className="opacity-80">{comments.length}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      guard(() => {
                        setOpenComments(null)
                        setOpenQuote(openQuote === c.id ? null : c.id)
                        setQuoteDraft('')
                        setQuoteSourceUrl('')
                        setQuoteSourceError('')
                      })
                    }
                    className="hawk-btn hawk-btn-ghost px-3 py-1.5 text-sm"
                  >
                    <QuoteIcon className="h-3.5 w-3.5" />
                    {t('feed.quote')}
                    <span className="opacity-80">
                      {social.quotes.filter((qq) => qq.quotedContributionId === c.id).length}
                    </span>
                  </button>
                </div>

                {openComments === c.id && (
                  <div className="mt-4 rounded-xl border border-hawk-border bg-hawk-ink p-3">
                    <p className="mb-2 text-xs font-semibold text-hawk-muted">
                      {t('feed.commentsTitle')}
                    </p>
                    {admin && (social.likes[c.id]?.length ?? 0) > 0 && (
                      <div className="mb-3 rounded-lg border border-hawk-border/60 bg-hawk-panel/40 px-2 py-2">
                        <p className="mb-1 text-[11px] font-semibold uppercase text-hawk-muted">
                          {t('admin.likesTitle')}
                        </p>
                        <ul className="space-y-1">
                          {(social.likes[c.id] ?? []).map((email) => (
                            <li
                              key={email}
                              className="flex items-center justify-between gap-2 text-xs text-hawk-cream/90"
                            >
                              <span className="truncate">
                                {displayEmail(email, {
                                  viewerEmail: session?.email,
                                  isAdmin: admin,
                                })}
                              </span>
                              {onAdminDeleteLike && (
                                <button
                                  type="button"
                                  className="shrink-0 text-red-300 hover:text-red-200"
                                  title={t('admin.deleteLike')}
                                  onClick={() =>
                                    confirmAdmin(t('admin.confirmLike'), () => {
                                      void onAdminDeleteLike(c.id, email)
                                    })
                                  }
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <ul className="mb-3 max-h-48 space-y-2 overflow-y-auto">
                      {comments.length === 0 && (
                        <li className="text-xs text-hawk-muted">{t('feed.empty')}</li>
                      )}
                      {comments.map((cm) => (
                        <li key={cm.id} className="flex items-start justify-between gap-2 text-sm">
                          <p>
                            <span className="font-semibold text-hawk-blue-bright">
                              {cm.authorName}
                            </span>
                            <span className="text-hawk-cream"> — {cm.body}</span>
                          </p>
                          {admin && onAdminDeleteComment && (
                            <button
                              type="button"
                              className="shrink-0 text-red-300 hover:text-red-200"
                              title={t('admin.deleteComment')}
                              onClick={() =>
                                confirmAdmin(t('admin.confirmComment'), () => {
                                  void onAdminDeleteComment(cm.id)
                                })
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        className="hawk-input flex-1"
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        placeholder={t('feed.commentPlaceholder')}
                      />
                      <button
                        type="button"
                        className="hawk-btn hawk-btn-primary px-4 py-2 text-sm"
                        onClick={() =>
                          guard(() => {
                            if (!commentDraft.trim()) return
                            onAddComment(c, commentDraft)
                            setCommentDraft('')
                          })
                        }
                      >
                        {t('feed.commentSubmit')}
                      </button>
                    </div>
                  </div>
                )}

                {openQuote === c.id && (
                  <div className="mt-4 rounded-xl border border-hawk-gold/25 bg-hawk-gold/5 p-3">
                    <p className="mb-2 text-xs font-semibold text-hawk-gold">
                      {t('feed.quoteTitle')}
                    </p>
                    <label className="block">
                      <span className="mb-1 block text-xs text-hawk-muted">
                        {t('feed.quoteRemark')}
                      </span>
                      <textarea
                        className="hawk-input min-h-[72px]"
                        value={quoteDraft}
                        onChange={(e) => setQuoteDraft(e.target.value)}
                        placeholder={t('feed.quoteRemarkPlaceholder')}
                      />
                    </label>
                    <label className="mt-2 block">
                      <span className="mb-1 block text-xs text-hawk-muted">
                        {t('feed.quoteSource')}
                      </span>
                      <input
                        className="hawk-input"
                        value={quoteSourceUrl}
                        onChange={(e) => {
                          setQuoteSourceUrl(e.target.value)
                          setQuoteSourceError('')
                        }}
                        placeholder={t('feed.quoteSourcePlaceholder')}
                        inputMode="url"
                        autoComplete="url"
                      />
                      <span className="mt-1 block text-[11px] text-hawk-muted">
                        {t('feed.quoteSourceHint')}
                      </span>
                      {quoteSourceError && (
                        <span className="mt-1 block text-[11px] text-red-300">
                          {quoteSourceError}
                        </span>
                      )}
                    </label>
                    <button
                      type="button"
                      className="hawk-btn hawk-btn-primary mt-2 px-4 py-2 text-sm"
                      onClick={() => {
                        const remark = buildRemark()
                        if (remark === null) return
                        onAddQuote(c, remark)
                        setQuoteDraft('')
                        setQuoteSourceUrl('')
                        setQuoteSourceError('')
                        setOpenQuote(null)
                      }}
                    >
                      {t('feed.quoteSubmit')}
                    </button>

                    <div className="mt-3 border-t border-hawk-gold/15 pt-3">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-hawk-muted">
                        <Share2 className="h-3.5 w-3.5" />
                        {t('feed.shareCite')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="hawk-btn hawk-btn-ghost px-3 py-1.5 text-sm"
                          onClick={() => shareCite(c, 'x')}
                        >
                          {t('feed.shareX')}
                        </button>
                        <button
                          type="button"
                          className="hawk-btn hawk-btn-ghost px-3 py-1.5 text-sm"
                          onClick={() => shareCite(c, 'facebook')}
                        >
                          {t('feed.shareFacebook')}
                        </button>
                        <button
                          type="button"
                          className="hawk-btn hawk-btn-ghost px-3 py-1.5 text-sm"
                          onClick={() => shareCite(c, 'telegram')}
                        >
                          {t('feed.shareTelegram')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
