import { SEEDED_OPPORTUNITIES } from '../data/opportunities'
import type {
  ActivityEvent,
  ActivityKind,
  Comment,
  Contribution,
  ContributionCategory,
  Quote,
  Session,
  SocialState,
  UploadedFileMeta,
} from '../types'
import { MAX_ACTIVITIES } from '../types'
import { supabase } from './supabase'
import { safeHttpUrl } from './safeUrl'
import { clawbackContributePointsCloud } from './cloudSync'

/** Activities older than this are purged (DB) and omitted from marquee/UI. */
export const ACTIVITY_RETENTION_MS = 24 * 60 * 60 * 1000

export function activityCutoffIso(now = Date.now()): string {
  return new Date(now - ACTIVITY_RETENTION_MS).toISOString()
}

export function isWithinActivityWindow(iso: string, now = Date.now()): boolean {
  const t = new Date(iso).getTime()
  return Number.isFinite(t) && t >= now - ACTIVITY_RETENTION_MS
}

/** Best-effort DB cleanup; ignore failures (missing RPC, RLS, etc.). */
export async function cleanupOldActivities(): Promise<void> {
  try {
    const { error } = await supabase.rpc('cleanup_old_activities')
    if (error) console.warn('[communityCloud] cleanup_old_activities', error.message)
  } catch (e) {
    console.warn('[communityCloud] cleanup_old_activities', e)
  }
}


type ContribRow = {
  id: string
  user_id: string | null
  opportunity_id: string | null
  category: string
  title: string
  description: string
  proof_url: string | null
  participant_name: string
  participant_email: string
  attachment_names: string[] | null
  seeded: boolean | null
  created_at: string
}

type LikeRow = {
  contribution_id: string
  user_id: string
  user_email: string
}

type CommentRow = {
  id: string
  contribution_id: string
  user_id: string | null
  author_name: string
  author_email: string
  body: string
  created_at: string
}

type QuoteRow = {
  id: string
  contribution_id: string
  quoted_contribution_id: string
  user_id: string | null
  author_name: string
  author_email: string
  remark: string | null
  created_at: string
}

type ActivityRow = {
  id: string
  kind: string
  actor_name: string
  actor_email: string
  title: string | null
  meta: Record<string, unknown> | null
  created_at: string
}

function oppTitle(opportunityId: string | null | undefined): string {
  if (!opportunityId) return ''
  const opp = SEEDED_OPPORTUNITIES.find((o) => o.id === opportunityId)
  return opp?.title['zh-TW'] || opp?.title.en || opportunityId
}

function namesToFiles(names: string[] | null | undefined): UploadedFileMeta[] {
  return (names ?? []).map((name) => ({
    name,
    type: '',
    size: 0,
    dataUrl: '',
  }))
}

function mapContribution(row: ContribRow): Contribution {
  const category = (['event', 'collab', 'content'].includes(row.category)
    ? row.category
    : 'content') as ContributionCategory
  return {
    id: row.id,
    opportunityId: row.opportunity_id ?? undefined,
    opportunityTitle: oppTitle(row.opportunity_id),
    category,
    title: row.title,
    description: row.description,
    proofUrl: row.proof_url || undefined,
    files: namesToFiles(row.attachment_names),
    createdAt: row.created_at,
    participantName: row.participant_name,
    participantEmail: row.participant_email,
    seeded: !!row.seeded,
  }
}

function mapActivity(row: ActivityRow): ActivityEvent {
  const meta = row.meta ?? {}
  const kind = row.kind as ActivityKind
  return {
    id: row.id,
    kind: [
      'contribute',
      'like',
      'comment',
      'quote',
      'game',
      'nft',
    ].includes(kind)
      ? kind
      : 'contribute',
    at: row.created_at,
    actorName: row.actor_name,
    actorEmail: row.actor_email,
    contributionId: String(meta.contribution_id ?? meta.contributionId ?? ''),
    contributionTitle: row.title || String(meta.contribution_title ?? ''),
  }
}

export type CommunitySnapshot = {
  contributions: Contribution[]
  social: SocialState
}

export async function fetchCommunitySnapshot(): Promise<CommunitySnapshot> {
  await cleanupOldActivities()

  const cutoff = activityCutoffIso()
  const [contribRes, likesRes, commentsRes, quotesRes, actsRes] =
    await Promise.all([
      supabase
        .from('contributions')
        .select(
          'id,user_id,opportunity_id,category,title,description,proof_url,participant_name,participant_email,attachment_names,seeded,created_at',
        )
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('contribution_likes')
        .select('contribution_id,user_id,user_email')
        .limit(2000),
      supabase
        .from('contribution_comments')
        .select(
          'id,contribution_id,user_id,author_name,author_email,body,created_at',
        )
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('contribution_quotes')
        .select(
          'id,contribution_id,quoted_contribution_id,user_id,author_name,author_email,remark,created_at',
        )
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('activities')
        .select('id,kind,actor_name,actor_email,title,meta,created_at')
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(MAX_ACTIVITIES),
    ])

  for (const res of [contribRes, likesRes, commentsRes, quotesRes, actsRes]) {
    if (res.error) {
      console.warn('[communityCloud] fetch error', res.error.message)
    }
  }

  const contributions = ((contribRes.data as ContribRow[]) ?? []).map(
    mapContribution,
  )

  const likes: SocialState['likes'] = {}
  for (const row of (likesRes.data as LikeRow[]) ?? []) {
    const list = likes[row.contribution_id] ?? []
    if (row.user_email && !list.includes(row.user_email)) {
      list.push(row.user_email)
    }
    likes[row.contribution_id] = list
  }

  const comments: Comment[] = ((commentsRes.data as CommentRow[]) ?? []).map(
    (row) => ({
      id: row.id,
      contributionId: row.contribution_id,
      body: row.body,
      authorName: row.author_name,
      authorEmail: row.author_email,
      createdAt: row.created_at,
    }),
  )

  const quotes: Quote[] = ((quotesRes.data as QuoteRow[]) ?? []).map((row) => {
    const quoted = contributions.find((c) => c.id === row.quoted_contribution_id)
    return {
      id: row.id,
      contributionId: row.contribution_id,
      quotedContributionId: row.quoted_contribution_id,
      quotedTitle: quoted?.title ?? '',
      remark: row.remark ?? '',
      authorName: row.author_name,
      authorEmail: row.author_email,
      createdAt: row.created_at,
    }
  })

  const activities = ((actsRes.data as ActivityRow[]) ?? []).map(mapActivity)

  const memberEmails = new Set<string>()
  for (const c of contributions) {
    if (c.participantEmail) memberEmails.add(c.participantEmail)
  }
  for (const list of Object.values(likes)) {
    for (const e of list) memberEmails.add(e)
  }
  for (const c of comments) memberEmails.add(c.authorEmail)
  for (const q of quotes) memberEmails.add(q.authorEmail)
  for (const a of activities) {
    if (a.actorEmail) memberEmails.add(a.actorEmail)
  }

  return {
    contributions,
    social: {
      likes,
      comments,
      quotes,
      activities,
      memberEmails: [...memberEmails],
    },
  }
}

async function insertActivity(input: {
  kind: ActivityKind
  actorName: string
  actorEmail: string
  title: string
  contributionId?: string
  meta?: Record<string, unknown>
}): Promise<void> {
  const { error } = await supabase.from('activities').insert({
    kind: input.kind,
    actor_name: input.actorName,
    actor_email: input.actorEmail,
    title: input.title,
    meta: {
      contribution_id: input.contributionId ?? null,
      contribution_title: input.title,
      ...(input.meta ?? {}),
    },
  })
  if (error) console.warn('[communityCloud] activity insert', error.message)
}

export async function createContributionCloud(input: {
  session: Session
  category: ContributionCategory
  opportunityId?: string
  opportunityTitle: string
  title: string
  description: string
  proofUrl?: string
  files: UploadedFileMeta[]
}): Promise<Contribution> {
  if (!input.session.userId) throw new Error('NOT_SIGNED_IN')
  const attachmentNames = input.files.map((f) => f.name).filter(Boolean)
  const { data, error } = await supabase
    .from('contributions')
    .insert({
      user_id: input.session.userId,
      opportunity_id: input.opportunityId ?? null,
      category: input.category,
      title: input.title.trim(),
      description: input.description.trim(),
      proof_url: safeHttpUrl(input.proofUrl) ?? null,
      participant_name: input.session.displayName,
      participant_email: input.session.email,
      attachment_names: attachmentNames,
      seeded: false,
    })
    .select(
      'id,user_id,opportunity_id,category,title,description,proof_url,participant_name,participant_email,attachment_names,seeded,created_at',
    )
    .single()
  if (error || !data) throw error ?? new Error('CREATE_FAILED')
  const entry = mapContribution(data as ContribRow)
  // Prefer catalog title when we have one from the form
  if (input.opportunityTitle) entry.opportunityTitle = input.opportunityTitle
  await insertActivity({
    kind: 'contribute',
    actorName: entry.participantName,
    actorEmail: entry.participantEmail,
    title: entry.title,
    contributionId: entry.id,
  })
  return entry
}

export async function toggleLikeCloud(
  contribution: Contribution,
  session: Session,
  currentlyLiked: boolean,
): Promise<void> {
  if (!session.userId) throw new Error('NOT_SIGNED_IN')
  if (currentlyLiked) {
    const { error } = await supabase
      .from('contribution_likes')
      .delete()
      .eq('contribution_id', contribution.id)
      .eq('user_id', session.userId)
    if (error) throw error
    return
  }
  const { error } = await supabase.from('contribution_likes').insert({
    contribution_id: contribution.id,
    user_id: session.userId,
    user_email: session.email,
  })
  if (error) throw error
  await insertActivity({
    kind: 'like',
    actorName: session.displayName,
    actorEmail: session.email,
    title: contribution.title,
    contributionId: contribution.id,
  })
}

export async function addCommentCloud(
  contribution: Contribution,
  session: Session,
  body: string,
): Promise<Comment> {
  if (!session.userId) throw new Error('NOT_SIGNED_IN')
  const text = body.trim()
  if (!text) throw new Error('EMPTY')
  const { data, error } = await supabase
    .from('contribution_comments')
    .insert({
      contribution_id: contribution.id,
      user_id: session.userId,
      author_name: session.displayName,
      author_email: session.email,
      body: text,
    })
    .select(
      'id,contribution_id,user_id,author_name,author_email,body,created_at',
    )
    .single()
  if (error || !data) throw error ?? new Error('COMMENT_FAILED')
  const row = data as CommentRow
  await insertActivity({
    kind: 'comment',
    actorName: session.displayName,
    actorEmail: session.email,
    title: contribution.title,
    contributionId: contribution.id,
  })
  return {
    id: row.id,
    contributionId: row.contribution_id,
    body: row.body,
    authorName: row.author_name,
    authorEmail: row.author_email,
    createdAt: row.created_at,
  }
}

export async function addQuoteCloud(
  quoted: Contribution,
  session: Session,
  remark: string,
): Promise<Quote> {
  if (!session.userId) throw new Error('NOT_SIGNED_IN')
  const { data, error } = await supabase
    .from('contribution_quotes')
    .insert({
      contribution_id: quoted.id,
      quoted_contribution_id: quoted.id,
      user_id: session.userId,
      author_name: session.displayName,
      author_email: session.email,
      remark: remark.trim(),
    })
    .select(
      'id,contribution_id,quoted_contribution_id,user_id,author_name,author_email,remark,created_at',
    )
    .single()
  if (error || !data) throw error ?? new Error('QUOTE_FAILED')
  const row = data as QuoteRow
  await insertActivity({
    kind: 'quote',
    actorName: session.displayName,
    actorEmail: session.email,
    title: quoted.title,
    contributionId: quoted.id,
  })
  return {
    id: row.id,
    contributionId: row.contribution_id,
    quotedContributionId: row.quoted_contribution_id,
    quotedTitle: quoted.title,
    remark: row.remark ?? '',
    authorName: row.author_name,
    authorEmail: row.author_email,
    createdAt: row.created_at,
  }
}

export async function recordGameActivityCloud(input: {
  actorName: string
  actorEmail: string
  score: number
}): Promise<void> {
  await insertActivity({
    kind: 'game',
    actorName: input.actorName,
    actorEmail: input.actorEmail,
    title: String(input.score),
    contributionId: 'game-eagle',
    meta: { score: input.score },
  })
}

export async function recordNftActivityCloud(input: {
  actorName: string
  actorEmail: string
  nftTitle: string
}): Promise<void> {
  await insertActivity({
    kind: 'nft',
    actorName: input.actorName,
    actorEmail: input.actorEmail,
    title: input.nftTitle,
    contributionId: 'nft-reward',
  })
}

/** Subscribe to shared feed changes; returns unsubscribe. */
export function subscribeCommunityRealtime(onChange: () => void): () => void {
  const channel = supabase
    .channel('hawk-community')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'contributions' },
      () => onChange(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'contribution_likes' },
      () => onChange(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'contribution_comments' },
      () => onChange(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'contribution_quotes' },
      () => onChange(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'activities' },
      () => onChange(),
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}

/** Admin moderation deletes — RLS enforces is_site_admin(). */

export type ContributionDeleteResult = {
  authorEmail: string | null
  authorUserId: string | null
  clawedBack: boolean
  newTotal: number | null
}

export async function adminDeleteContribution(
  id: string,
): Promise<ContributionDeleteResult> {
  const { data: row } = await supabase
    .from('contributions')
    .select('id,user_id,participant_email,seeded')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase.from('contributions').delete().eq('id', id)
  if (error) throw error

  const authorUserId =
    typeof row?.user_id === 'string' && row.user_id ? row.user_id : null
  const authorEmail =
    typeof row?.participant_email === 'string' && row.participant_email
      ? row.participant_email
      : null
  const seeded = !!row?.seeded

  let newTotal: number | null = null
  // Only claw back rewarded (non-seeded) contributions; skip if no game_points row.
  if (authorUserId && !seeded) {
    newTotal = await clawbackContributePointsCloud(authorUserId)
  }

  return {
    authorEmail,
    authorUserId,
    clawedBack: newTotal != null,
    newTotal,
  }
}

export async function adminDeleteComment(id: string): Promise<void> {
  const { error } = await supabase
    .from('contribution_comments')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function adminDeleteQuote(id: string): Promise<void> {
  const { error } = await supabase
    .from('contribution_quotes')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function adminDeleteLike(
  contributionId: string,
  userEmail: string,
): Promise<void> {
  const { error } = await supabase
    .from('contribution_likes')
    .delete()
    .eq('contribution_id', contributionId)
    .eq('user_email', userEmail)
  if (error) throw error
}

export async function adminDeleteActivity(id: string): Promise<void> {
  const { error } = await supabase.from('activities').delete().eq('id', id)
  if (error) throw error
}

