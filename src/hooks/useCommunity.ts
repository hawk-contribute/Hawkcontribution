import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  Contribution,
  ContributionCategory,
  Session,
  SocialState,
  UploadedFileMeta,
} from '../types'
import {
  createId,
  loadContributions,
  loadSocial,
  pushActivity,
  saveContributions,
  saveSocial,
} from '../lib/storage'
import { subscribeStoreUpdates } from '../lib/sync'

function reload() {
  return {
    contributions: loadContributions(),
    social: loadSocial(),
  }
}

export function useCommunity() {
  const [{ contributions, social }, setState] = useState(reload)

  useEffect(() => {
    return subscribeStoreUpdates(() => setState(reload()))
  }, [])

  const refresh = useCallback(() => setState(reload()), [])

  const addContribution = useCallback(
    (input: {
      category: ContributionCategory
      opportunityId?: string
      opportunityTitle: string
      title: string
      description: string
      proofUrl?: string
      files: UploadedFileMeta[]
      participantName: string
      participantEmail: string
    }) => {
      const entry: Contribution = {
        id: createId('contrib'),
        opportunityId: input.opportunityId,
        opportunityTitle: input.opportunityTitle,
        category: input.category,
        title: input.title.trim(),
        description: input.description.trim(),
        proofUrl: input.proofUrl?.trim() || undefined,
        files: input.files,
        createdAt: new Date().toISOString(),
        participantName: input.participantName,
        participantEmail: input.participantEmail,
      }

      // FUTURE REWARDS HOOK

      const nextContribs = [entry, ...loadContributions()]
      saveContributions(nextContribs)

      let nextSocial = loadSocial()
      nextSocial = pushActivity(nextSocial, {
        kind: 'contribute',
        at: entry.createdAt,
        actorName: entry.participantName,
        actorEmail: entry.participantEmail,
        contributionId: entry.id,
        contributionTitle: entry.title,
      })
      saveSocial(nextSocial)
      setState(reload())
      return entry
    },
    [],
  )

  const toggleLike = useCallback((contribution: Contribution, session: Session) => {
    const social = loadSocial()
    const list = social.likes[contribution.id] ?? []
    const liked = list.includes(session.email)
    const nextList = liked
      ? list.filter((e) => e !== session.email)
      : [...list, session.email]
    let next: SocialState = {
      ...social,
      likes: { ...social.likes, [contribution.id]: nextList },
    }
    if (!liked) {
      next = pushActivity(next, {
        kind: 'like',
        at: new Date().toISOString(),
        actorName: session.displayName,
        actorEmail: session.email,
        contributionId: contribution.id,
        contributionTitle: contribution.title,
      })
    }
    saveSocial(next)
    setState(reload())
  }, [])

  const addComment = useCallback(
    (contribution: Contribution, session: Session, body: string) => {
      const text = body.trim()
      if (!text) return
      let social = loadSocial()
      const comment = {
        id: createId('comment'),
        contributionId: contribution.id,
        body: text,
        authorName: session.displayName,
        authorEmail: session.email,
        createdAt: new Date().toISOString(),
      }
      social = {
        ...social,
        comments: [comment, ...social.comments],
      }
      social = pushActivity(social, {
        kind: 'comment',
        at: comment.createdAt,
        actorName: session.displayName,
        actorEmail: session.email,
        contributionId: contribution.id,
        contributionTitle: contribution.title,
      })
      saveSocial(social)
      setState(reload())
      return comment
    },
    [],
  )

  const addQuote = useCallback(
    (quoted: Contribution, session: Session, remark: string) => {
      let social = loadSocial()
      const quote = {
        id: createId('quote'),
        contributionId: quoted.id,
        quotedContributionId: quoted.id,
        quotedTitle: quoted.title,
        remark: remark.trim(),
        authorName: session.displayName,
        authorEmail: session.email,
        createdAt: new Date().toISOString(),
      }
      social = { ...social, quotes: [quote, ...social.quotes] }
      social = pushActivity(social, {
        kind: 'quote',
        at: quote.createdAt,
        actorName: session.displayName,
        actorEmail: session.email,
        contributionId: quoted.id,
        contributionTitle: quoted.title,
      })
      saveSocial(social)
      setState(reload())
      return quote
    },
    [],
  )

  const stats = useMemo(() => {
    const byCategory = { event: 0, collab: 0, content: 0 }
    for (const c of contributions) {
      byCategory[c.category] = (byCategory[c.category] ?? 0) + 1
    }
    const likeCount = Object.values(social.likes).reduce((n, arr) => n + arr.length, 0)
    return {
      total: contributions.length,
      byCategory,
      likes: likeCount,
      comments: social.comments.length,
      quotes: social.quotes.length,
      members: social.memberEmails.length,
    }
  }, [contributions, social])

  return {
    contributions,
    social,
    stats,
    refresh,
    addContribution,
    toggleLike,
    addComment,
    addQuote,
  }
}
