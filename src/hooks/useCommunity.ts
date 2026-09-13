import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  Contribution,
  ContributionCategory,
  Session,
  SocialState,
  UploadedFileMeta,
} from '../types'
import {
  addCommentCloud,
  addQuoteCloud,
  adminDeleteActivity,
  adminDeleteComment,
  adminDeleteContribution,
  adminDeleteLike,
  adminDeleteQuote,
  createContributionCloud,
  fetchCommunitySnapshot,
  subscribeCommunityRealtime,
  toggleLikeCloud,
  type CommunitySnapshot,
} from '../lib/communityCloud'

const emptySocial: SocialState = {
  likes: {},
  comments: [],
  quotes: [],
  activities: [],
  memberEmails: [],
}

const emptySnap: CommunitySnapshot = {
  contributions: [],
  social: emptySocial,
}

const POLL_MS = 25_000

export function useCommunity(options?: { live?: boolean }) {
  const live = options?.live ?? true
  const [{ contributions, social }, setState] = useState<CommunitySnapshot>(emptySnap)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchingRef = useRef(false)

  const refresh = useCallback(async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      const snap = await fetchCommunitySnapshot()
      setState(snap)
      setError(null)
    } catch (e) {
      console.warn('[useCommunity] refresh failed', e)
      setError(e instanceof Error ? e.message : 'refresh failed')
    } finally {
      fetchingRef.current = false
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Poll while live (Feed / shared views)
  useEffect(() => {
    if (!live) return
    const id = window.setInterval(() => void refresh(), POLL_MS)
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void refresh()
    })
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [live, refresh])

  // Realtime (best-effort; poll is the fallback)
  useEffect(() => {
    return subscribeCommunityRealtime(() => {
      void refresh()
    })
  }, [refresh])

  const addContribution = useCallback(
    async (input: {
      category: ContributionCategory
      opportunityId?: string
      opportunityTitle: string
      title: string
      description: string
      proofUrl?: string
      files: UploadedFileMeta[]
      participantName: string
      participantEmail: string
      session: Session
    }) => {
      const entry = await createContributionCloud({
        session: input.session,
        category: input.category,
        opportunityId: input.opportunityId,
        opportunityTitle: input.opportunityTitle,
        title: input.title,
        description: input.description,
        proofUrl: input.proofUrl,
        files: input.files,
      })
      await refresh()
      return entry
    },
    [refresh],
  )

  const toggleLike = useCallback(
    async (contribution: Contribution, session: Session) => {
      const list = social.likes[contribution.id] ?? []
      const liked = list.includes(session.email)
      await toggleLikeCloud(contribution, session, liked)
      await refresh()
    },
    [social.likes, refresh],
  )

  const addComment = useCallback(
    async (contribution: Contribution, session: Session, body: string) => {
      const comment = await addCommentCloud(contribution, session, body)
      await refresh()
      return comment
    },
    [refresh],
  )

  const addQuote = useCallback(
    async (quoted: Contribution, session: Session, remark: string) => {
      const quote = await addQuoteCloud(quoted, session, remark)
      await refresh()
      return quote
    },
    [refresh],
  )

  const stats = useMemo(() => {
    const byCategory = { event: 0, collab: 0, content: 0 }
    for (const c of contributions) {
      byCategory[c.category] = (byCategory[c.category] ?? 0) + 1
    }
    const likeCount = Object.values(social.likes).reduce(
      (n, arr) => n + arr.length,
      0,
    )
    return {
      total: contributions.length,
      byCategory,
      likes: likeCount,
      comments: social.comments.length,
      quotes: social.quotes.length,
      members: social.memberEmails.length,
    }
  }, [contributions, social])


  const deleteContribution = useCallback(
    async (id: string) => {
      await adminDeleteContribution(id)
      await refresh()
    },
    [refresh],
  )

  const deleteComment = useCallback(
    async (id: string) => {
      await adminDeleteComment(id)
      await refresh()
    },
    [refresh],
  )

  const deleteQuote = useCallback(
    async (id: string) => {
      await adminDeleteQuote(id)
      await refresh()
    },
    [refresh],
  )

  const deleteLike = useCallback(
    async (contributionId: string, userEmail: string) => {
      await adminDeleteLike(contributionId, userEmail)
      await refresh()
    },
    [refresh],
  )

  const deleteActivity = useCallback(
    async (id: string) => {
      await adminDeleteActivity(id)
      await refresh()
    },
    [refresh],
  )

  return {
    contributions,
    social,
    stats,
    loading,
    error,
    refresh,
    addContribution,
    toggleLike,
    addComment,
    addQuote,
    deleteContribution,
    deleteComment,
    deleteQuote,
    deleteLike,
    deleteActivity,
  }
}
