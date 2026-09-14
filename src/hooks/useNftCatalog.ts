import { useCallback, useEffect, useState } from 'react'
import {
  deleteNftCatalogItem,
  fetchNftCatalog,
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

  useEffect(() => {
    if (!live) return
    const id = window.setInterval(() => void refresh(), 60_000)
    return () => window.clearInterval(id)
  }, [live, refresh])

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

  return {
    redeemPoints: snap.settings.redeemPoints,
    catalog: snap.catalog,
    fromCloud: snap.fromCloud,
    loading,
    error,
    refresh,
    saveRedeemPoints,
    saveNft,
    removeNft,
  }
}
