import { DONATION, HAWK_TOKEN } from './donation'

const RPCS = [
  'https://bsc-dataseed.binance.org/',
  'https://bsc-dataseed1.defibit.io/',
  'https://bsc-dataseed1.ninicoin.io/',
] as const

const CACHE_KEY = 'hawk-contribute:bsc-donations-v2'
/** Initial lookback; then incremental. */
const INITIAL_LOOKBACK = 200
const BATCH = 16
const MAX_CACHED = 50

const ERC20_TRANSFER = '0xa9059cbb'
const ERC20_BALANCE_OF = '0x70a08231'
const ERC20_DECIMALS = '0x313ce567'

export type DonationAsset = 'BNB' | 'HAWK'

export type IncomingDonation = {
  id: string
  hash: string
  from: string
  asset: DonationAsset
  amount: string
  valueRaw: string
  blockNumber: number
  at: string
}

type CacheShape = {
  donations: IncomingDonation[]
  lastScannedBlock: number
}

export async function rpcCall<T>(
  method: string,
  params: unknown[],
): Promise<T> {
  let lastErr: unknown
  for (const url of RPCS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      })
      if (!res.ok) throw new Error(`RPC HTTP ${res.status}`)
      const json = (await res.json()) as {
        result?: T
        error?: { message?: string }
      }
      if (json.error) throw new Error(json.error.message || 'RPC error')
      if (json.result === undefined) throw new Error('RPC empty result')
      return json.result
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('All BSC RPCs failed')
}

function padAddr(addr: string): string {
  return addr.toLowerCase().replace(/^0x/, '').padStart(64, '0')
}

export function formatUnits(rawHexOrDec: string, decimals: number): string {
  const wei = BigInt(
    rawHexOrDec.startsWith('0x') ? rawHexOrDec : rawHexOrDec || '0',
  )
  const base = 10n ** BigInt(decimals)
  const whole = wei / base
  const frac = wei % base
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '')
  if (!fracStr) return whole.toString()
  const trimmed = fracStr.slice(0, 6).replace(/0+$/, '') || '0'
  return `${whole}.${trimmed}`
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

export type TokenBalanceResult =
  | { ok: true; raw: string; formatted: string; decimals: number; updatedAt: string }
  | { ok: false; error: string; updatedAt: string }

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
    return { ok: true, weiHex, bnb: formatUnits(weiHex, 18), updatedAt }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'balance unavailable',
      updatedAt,
    }
  }
}

async function readDecimals(): Promise<number> {
  try {
    const hex = await rpcCall<string>('eth_call', [
      { to: HAWK_TOKEN.address, data: ERC20_DECIMALS },
      'latest',
    ])
    const n = Number.parseInt(hex, 16)
    return Number.isFinite(n) && n >= 0 && n <= 36 ? n : HAWK_TOKEN.decimals
  } catch {
    return HAWK_TOKEN.decimals
  }
}

export async function fetchHawkBalance(
  holder: string,
): Promise<TokenBalanceResult> {
  const updatedAt = new Date().toISOString()
  try {
    const decimals = await readDecimals()
    const data = `${ERC20_BALANCE_OF}${padAddr(holder)}`
    const raw = await rpcCall<string>('eth_call', [
      { to: HAWK_TOKEN.address, data },
      'latest',
    ])
    return {
      ok: true,
      raw,
      formatted: formatUnits(raw, decimals),
      decimals,
      updatedAt,
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'HAWK balance unavailable',
      updatedAt,
    }
  }
}

export type BurnStatsResult =
  | {
      ok: true
      totalBurned: string
      totalBurnedRaw: string
      bySink: { address: string; amount: string }[]
      decimals: number
      updatedAt: string
      method: 'balanceOf-burn-sinks'
    }
  | { ok: false; error: string; updatedAt: string }

/**
 * Active burn total = sum of HAWK balanceOf(burn sinks).
 * Free public RPC; never invents. Does not count burns that left the sink.
 */
export async function fetchHawkBurnStats(): Promise<BurnStatsResult> {
  const updatedAt = new Date().toISOString()
  try {
    const decimals = await readDecimals()
    const bySink: { address: string; amount: string }[] = []
    let total = 0n
    for (const sink of HAWK_TOKEN.burnSinks) {
      const data = `${ERC20_BALANCE_OF}${padAddr(sink)}`
      const raw = await rpcCall<string>('eth_call', [
        { to: HAWK_TOKEN.address, data },
        'latest',
      ])
      const v = BigInt(raw)
      total += v
      bySink.push({ address: sink, amount: formatUnits(raw, decimals) })
    }
    return {
      ok: true,
      totalBurned: formatUnits('0x' + total.toString(16), decimals),
      totalBurnedRaw: '0x' + total.toString(16),
      bySink,
      decimals,
      updatedAt,
      method: 'balanceOf-burn-sinks',
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'burn stats unavailable',
      updatedAt,
    }
  }
}

type RpcTx = {
  hash: string
  from: string
  to: string | null
  value: string
  input?: string
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

function decodeErc20Transfer(input: string | undefined): {
  to: string
  value: string
} | null {
  if (!input || input.length < 10 + 64 + 64) return null
  const sel = input.slice(0, 10).toLowerCase()
  if (sel !== ERC20_TRANSFER) return null
  const to = '0x' + input.slice(10 + 24, 10 + 64)
  const value = '0x' + input.slice(10 + 64, 10 + 64 + 64)
  return { to, value }
}

function donationsFromBlock(
  block: RpcBlock,
  donationAddr: string,
  hawkAddr: string,
  decimals: number,
): IncomingDonation[] {
  const blockNumber = parseInt(block.number, 16)
  const at = new Date(parseInt(block.timestamp, 16) * 1000).toISOString()
  const out: IncomingDonation[] = []

  for (const tx of block.transactions ?? []) {
    // Native BNB
    if (tx?.to && tx.to.toLowerCase() === donationAddr) {
      const value = tx.value || '0x0'
      if (BigInt(value) > 0n) {
        out.push({
          id: `bnb-${tx.hash}`,
          hash: tx.hash,
          from: tx.from,
          asset: 'BNB',
          amount: formatUnits(value, 18),
          valueRaw: value,
          blockNumber,
          at,
        })
      }
    }

    // HAWK ERC-20 transfer(donation, amount)
    if (tx?.to && tx.to.toLowerCase() === hawkAddr) {
      const decoded = decodeErc20Transfer(tx.input)
      if (
        decoded &&
        decoded.to.toLowerCase() === donationAddr &&
        BigInt(decoded.value) > 0n
      ) {
        out.push({
          id: `hawk-${tx.hash}`,
          hash: tx.hash,
          from: tx.from,
          asset: 'HAWK',
          amount: formatUnits(decoded.value, decimals),
          valueRaw: decoded.value,
          blockNumber,
          at,
        })
      }
    }
  }
  return out
}

/**
 * Discover recent native BNB + HAWK ERC-20 transfers TO the donation address
 * via public RPC block scanning (decodes transfer() calldata; no paid API).
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
  const donationAddr = DONATION.address.toLowerCase()
  const hawkAddr = HAWK_TOKEN.address.toLowerCase()
  const decimals = await readDecimals()

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
      found.push(...donationsFromBlock(b, donationAddr, hawkAddr, decimals))
    }
  }

  const byId = new Map<string, IncomingDonation>()
  for (const d of [...found, ...cache.donations]) {
    byId.set(d.id, d)
  }
  const donations = [...byId.values()]
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
