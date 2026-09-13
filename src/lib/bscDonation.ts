import { DONATION } from './donation'

const RPCS = [
  'https://bsc-dataseed.binance.org/',
  'https://bsc-dataseed1.defibit.io/',
  'https://bsc-dataseed1.ninicoin.io/',
  'https://rpc.ankr.com/bsc',
] as const

const CACHE_KEY = 'hawk-contribute:bsc-donations-v1'
/** Initial lookback (~few minutes on BSC). Then incremental only. */
const INITIAL_LOOKBACK = 180
const BATCH = 18
const MAX_CACHED = 40

export type IncomingDonation = {
  hash: string
  from: string
  valueWei: string
  amountBnb: string
  blockNumber: number
  at: string
}

type CacheShape = {
  donations: IncomingDonation[]
  lastScannedBlock: number
}

async function rpcCall<T>(
  method: string,
  params: unknown[],
  rpcUrl?: string,
): Promise<T> {
  const urls = rpcUrl ? [rpcUrl, ...RPCS.filter((u) => u !== rpcUrl)] : [...RPCS]
  let lastErr: unknown
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      })
      if (!res.ok) throw new Error(`RPC HTTP ${res.status}`)
      const json = (await res.json()) as { result?: T; error?: { message?: string } }
      if (json.error) throw new Error(json.error.message || 'RPC error')
      if (json.result === undefined) throw new Error('RPC empty result')
      return json.result
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('All BSC RPCs failed')
}

function formatBnb(weiHexOrDec: string): string {
  const wei = BigInt(weiHexOrDec.startsWith('0x') ? weiHexOrDec : weiHexOrDec || '0')
  const whole = wei / 10n ** 18n
  const frac = wei % 10n ** 18n
  const fracStr = frac.toString().padStart(18, '0').replace(/0+$/, '')
  if (!fracStr) return whole.toString()
  const trimmed = fracStr.slice(0, 6).replace(/0+$/, '') || '0'
  return `${whole}.${trimmed}`
}

export function formatBnbFromWei(weiHex: string): string {
  return formatBnb(weiHex)
}

function loadCache(): CacheShape {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return { donations: [], lastScannedBlock: 0 }
    const parsed = JSON.parse(raw) as CacheShape
    return {
      donations: Array.isArray(parsed.donations) ? parsed.donations : [],
      lastScannedBlock:
        typeof parsed.lastScannedBlock === 'number' ? parsed.lastScannedBlock : 0,
    }
  } catch {
    return { donations: [], lastScannedBlock: 0 }
  }
}

function saveCache(cache: CacheShape): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    /* ignore */
  }
}

export type BnbBalanceResult =
  | { ok: true; weiHex: string; bnb: string; updatedAt: string }
  | { ok: false; error: string; updatedAt: string }

export async function fetchBnbBalance(): Promise<BnbBalanceResult> {
  const updatedAt = new Date().toISOString()
  try {
    const weiHex = await rpcCall<string>('eth_getBalance', [
      DONATION.address,
      'latest',
    ])
    return { ok: true, weiHex, bnb: formatBnb(weiHex), updatedAt }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'balance unavailable',
      updatedAt,
    }
  }
}

type RpcTx = {
  hash: string
  from: string
  to: string | null
  value: string
  blockNumber?: string
}

type RpcBlock = {
  number: string
  timestamp: string
  transactions: RpcTx[]
}

async function fetchBlock(n: number): Promise<RpcBlock | null> {
  try {
    return await rpcCall<RpcBlock | null>('eth_getBlockByNumber', [
      '0x' + n.toString(16),
      true,
    ])
  } catch {
    return null
  }
}

function donationsFromBlock(
  block: RpcBlock,
  target: string,
): IncomingDonation[] {
  const blockNumber = parseInt(block.number, 16)
  const at = new Date(parseInt(block.timestamp, 16) * 1000).toISOString()
  const out: IncomingDonation[] = []
  for (const tx of block.transactions ?? []) {
    if (!tx?.to || tx.to.toLowerCase() !== target) continue
    const value = tx.value || '0x0'
    if (BigInt(value) <= 0n) continue
    out.push({
      hash: tx.hash,
      from: tx.from,
      valueWei: value,
      amountBnb: formatBnb(value),
      blockNumber,
      at,
    })
  }
  return out
}

/**
 * Discover recent native BNB transfers TO the donation address via public RPC
 * block scanning (no API key). Never fabricates transfers.
 */
export async function syncIncomingDonations(): Promise<{
  donations: IncomingDonation[]
  latestBlock: number
  scannedFrom: number
  scannedTo: number
}> {
  const latestHex = await rpcCall<string>('eth_blockNumber', [])
  const latestBlock = parseInt(latestHex, 16)
  const cache = loadCache()
  const target = DONATION.address.toLowerCase()

  let fromBlock: number
  if (cache.lastScannedBlock > 0 && cache.lastScannedBlock < latestBlock) {
    fromBlock = cache.lastScannedBlock + 1
  } else if (cache.lastScannedBlock >= latestBlock) {
    return {
      donations: cache.donations,
      latestBlock,
      scannedFrom: latestBlock,
      scannedTo: latestBlock,
    }
  } else {
    fromBlock = Math.max(0, latestBlock - INITIAL_LOOKBACK + 1)
  }

  const found: IncomingDonation[] = []
  for (let start = fromBlock; start <= latestBlock; start += BATCH) {
    const end = Math.min(latestBlock, start + BATCH - 1)
    const nums: number[] = []
    for (let n = start; n <= end; n++) nums.push(n)
    const blocks = await Promise.all(nums.map((n) => fetchBlock(n)))
    for (const b of blocks) {
      if (!b) continue
      found.push(...donationsFromBlock(b, target))
    }
  }

  const byHash = new Map<string, IncomingDonation>()
  for (const d of [...found, ...cache.donations]) {
    byHash.set(d.hash, d)
  }
  const donations = [...byHash.values()]
    .sort((a, b) => b.blockNumber - a.blockNumber)
    .slice(0, MAX_CACHED)

  saveCache({ donations, lastScannedBlock: latestBlock })
  return {
    donations,
    latestBlock,
    scannedFrom: fromBlock,
    scannedTo: latestBlock,
  }
}

export function cachedDonations(): IncomingDonation[] {
  return loadCache().donations
}

export function truncateAddress(addr: string, chars = 4): string {
  if (!addr || addr.length < chars * 2 + 2) return addr
  return `${addr.slice(0, chars + 2)}…${addr.slice(-chars)}`
}

export function txUrl(hash: string): string {
  return `https://bscscan.com/tx/${hash}`
}
