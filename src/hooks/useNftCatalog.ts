import { useCallback, useEffect, useState } from 'react'
import { useVisibilityPoll } from './useVisibilityPoll'
import {
  deleteNftCatalogItem,
  fetchNftCatalog,
  updateNftRequiredPoints,
  updateRedeemPoints,
  upsertNftCatalogItem,
  type NftCatalogSnapshot,
  type NftUpsertInput,
} from '../lib/nftCatalog'
import { NFT_CATALOG } from '../data/nfts'
import { NFT_REDEEM_POINTS } from '../types'

const fallback: NftCatalogSnapshot = {
  settings: { redeemPoints: NFT_REDEEM_POINTS },
  catalog: NFT_CATALOG,
  fromCloud: false,
}

export function useNftCatalog(options?: { live?: boolean }) {
  const live = options?.live ?? true
  const [snap, setSnap] = useState<NftCatalogSnapshot>(fallback)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const next = await fetchNftCatalog()
      setSnap(next)
      setError(null)
    } catch (e) {
      console.warn('[useNftCatalog]', e)
      setError(e instanceof Error ? e.message : 'load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useVisibilityPoll(() => void refresh(), 90_000, live)

  const saveRedeemPoints = useCallback(
    async (points: number) => {
      await updateRedeemPoints(points)
      await refresh()
    },
    [refresh],
  )

  const saveNft = useCallback(
    async (input: NftUpsertInput) => {
      await upsertNftCatalogItem(input)
      await refresh()
    },
    [refresh],
  )

  const removeNft = useCallback(
    async (id: string) => {
      await deleteNftCatalogItem(id)
      await refresh()
    },
    [refresh],
  )

  const saveNftPoints = useCallback(
    async (id: string, points: number) => {
      await updateNftRequiredPoints(id, points)
      await refresh()
    },
    [refresh],
  )

  return {
    redeemPoints: snap.settings.redeemPoints,
    catalog: snap.catalog,
    fromCloud: snap.fromCloud,
    loading,
    error,
    refresh,
    saveRedeemPoints,
    saveNft,
    saveNftPoints,
    removeNft,
  }
}
