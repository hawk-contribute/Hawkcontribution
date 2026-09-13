import { supabase } from './supabase'

export type CommunityLiveCounts = {
  contributions: number
  likes: number
  comments: number
  quotes: number
  activities: number
  fetchedAt: string
}

export type CountsResult =
  | { ok: true; counts: CommunityLiveCounts }
  | { ok: false; error: string; fetchedAt: string }

async function headCount(table: string): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
  if (error) throw new Error(`${table}: ${error.message}`)
  if (count == null) throw new Error(`${table}: count unavailable`)
  return count
}

/** Exact table counts from Supabase. Never invents numbers. */
export async function fetchCommunityLiveCounts(): Promise<CountsResult> {
  const fetchedAt = new Date().toISOString()
  try {
    const [contributions, likes, comments, quotes, activities] =
      await Promise.all([
        headCount('contributions'),
        headCount('contribution_likes'),
        headCount('contribution_comments'),
        headCount('contribution_quotes'),
        headCount('activities'),
      ])
    return {
      ok: true,
      counts: {
        contributions,
        likes,
        comments,
        quotes,
        activities,
        fetchedAt,
      },
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'counts unavailable',
      fetchedAt,
    }
  }
}
