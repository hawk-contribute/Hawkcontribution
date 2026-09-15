import type { User } from '@supabase/supabase-js'
import { authRedirectTo, supabase } from './supabase'

/** Minimal EIP-1193 provider shape (injected wallets). */
export type EthereumWallet = {
  request: (args: {
    method: string
    params?: unknown[] | Record<string, unknown>
  }) => Promise<unknown>
  on?: (...args: unknown[]) => void
  removeListener?: (...args: unknown[]) => void
  address?: string
}

export type Eip6963ProviderDetail = {
  info: { uuid: string; name: string; icon: string; rdns: string }
  provider: EthereumWallet
}

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/

export function isEvmAddress(value: string | null | undefined): boolean {
  return !!value && ADDR_RE.test(value)
}

export function normalizeAddress(addr: string): string {
  return addr.trim().toLowerCase()
}

/** 0x1234…abcd */
export function shortenAddress(addr: string, left = 6, right = 4): string {
  const a = addr.trim()
  if (a.length < left + right + 2) return a
  return `${a.slice(0, left)}…${a.slice(-right)}`
}

/**
 * Extract EVM address from a Supabase Auth user created via Web3 / SIWE.
 * Identity subject is typically `web3:ethereum:0x…`; custom claims include `address`.
 */
export function walletAddressFromUser(user: User | null | undefined): string | null {
  if (!user) return null

  const tryAddr = (v: unknown): string | null => {
    if (typeof v !== 'string') return null
    const t = v.trim()
    if (isEvmAddress(t)) return t
    const m = t.match(/0x[a-fA-F0-9]{40}/)
    return m ? m[0] : null
  }

  for (const id of user.identities ?? []) {
    if (id.provider !== 'web3') continue
    const data = (id.identity_data ?? {}) as Record<string, unknown>
    const fromClaims =
      tryAddr(data.address) ||
      tryAddr((data.custom_claims as Record<string, unknown> | undefined)?.address) ||
      tryAddr(data.sub)
    if (fromClaims) return fromClaims
  }

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const fromMeta =
    tryAddr(meta.address) ||
    tryAddr(meta.wallet_address) ||
    tryAddr((meta.custom_claims as Record<string, unknown> | undefined)?.address)
  if (fromMeta) return fromMeta

  return null
}

/** Local ledger key when Auth user has no email (Web3-only accounts). */
export function sessionKeyForUser(user: User, walletAddress?: string | null): string {
  const email = (user.email ?? '').trim()
  if (email) return email
  const addr = walletAddress ?? walletAddressFromUser(user)
  if (addr) return `${normalizeAddress(addr)}@ethereum.wallet`
  return `uid:${user.id}`
}

export function hasInjectedEthereum(): boolean {
  if (typeof window === 'undefined') return false
  const eth = (window as unknown as { ethereum?: { request?: unknown } }).ethereum
  return !!eth && typeof eth.request === 'function'
}

/** Discover EIP-6963 wallets (MetaMask, Rabby, etc.). Falls back to window.ethereum. */
export function discoverEthereumProviders(timeoutMs = 120): Promise<Eip6963ProviderDetail[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve([])
      return
    }
    const found = new Map<string, Eip6963ProviderDetail>()
    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent<Eip6963ProviderDetail>).detail
      if (detail?.info?.uuid && detail.provider) {
        found.set(detail.info.uuid, detail)
      }
    }
    window.addEventListener('eip6963:announceProvider', onAnnounce)
    try {
      window.dispatchEvent(new Event('eip6963:requestProvider'))
    } catch {
      /* ignore */
    }
    window.setTimeout(() => {
      window.removeEventListener('eip6963:announceProvider', onAnnounce)
      if (found.size === 0 && hasInjectedEthereum()) {
        const eth = (window as unknown as { ethereum: EthereumWallet }).ethereum
        resolve([
          {
            info: {
              uuid: 'legacy-window-ethereum',
              name: 'Browser wallet',
              icon: '',
              rdns: 'window.ethereum',
            },
            provider: eth,
          },
        ])
        return
      }
      resolve([...found.values()])
    }, timeoutMs)
  })
}

export function isUserRejectedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') {
    const msg = String(err ?? '').toLowerCase()
    return msg.includes('rejected') || msg.includes('denied') || msg.includes('user cancel')
  }
  const e = err as { code?: number | string; message?: string; name?: string }
  if (e.code === 4001 || e.code === 'ACTION_REJECTED') return true
  const msg = `${e.message ?? ''} ${e.name ?? ''}`.toLowerCase()
  return (
    msg.includes('user rejected') ||
    msg.includes('user denied') ||
    msg.includes('rejected the request') ||
    msg.includes('user cancelled') ||
    msg.includes('user canceled')
  )
}

const DEFAULT_STATEMENT =
  'Sign in to Hawk Contribute. This signature proves wallet ownership and does not send a transaction or cost gas.'

/**
 * Connect injected wallet (EIP-6963 / window.ethereum) and sign SIWE via Supabase Auth.
 * Server verifies the signature — no eth_sendTransaction.
 */
export async function signInWithEthereumWallet(options?: {
  statement?: string
  /** Prefer a specific EIP-6963 provider; otherwise first discovered / window.ethereum. */
  wallet?: EthereumWallet
}): Promise<{ user: User; address: string }> {
  const providers = options?.wallet
    ? null
    : await discoverEthereumProviders()
  const wallet =
    options?.wallet ??
    providers?.[0]?.provider ??
    (hasInjectedEthereum()
      ? (window as unknown as { ethereum: EthereumWallet }).ethereum
      : undefined)

  if (!wallet) {
    throw new Error('NO_WALLET')
  }

  // Prefer site origin for SIWE URI so Redirect URL allow-list matches Pages / localhost.
  const url = authRedirectTo()

  const { data, error } = await supabase.auth.signInWithWeb3({
    chain: 'ethereum',
    statement: options?.statement ?? DEFAULT_STATEMENT,
    // Injected providers satisfy request(); cast for SDK's full EIP-1193 type.
    wallet: wallet as never,
    // SIWE URI must match Supabase Redirect URL allow-list (Pages / localhost).
    // chainId comes from the wallet (e.g. BSC 56) — personal_sign only, no tx / gas.
    options: { url },
  })

  if (error) throw error
  if (!data.session?.user) throw new Error('NO_SESSION')

  const address =
    walletAddressFromUser(data.session.user) ??
    (await requestAccounts(wallet).then((a) => a[0] ?? null))
  if (!address) throw new Error('NO_SESSION')

  return { user: data.session.user, address }
}

async function requestAccounts(wallet: EthereumWallet): Promise<string[]> {
  try {
    const accs = (await wallet.request({ method: 'eth_requestAccounts' })) as string[]
    return Array.isArray(accs) ? accs : []
  } catch {
    return []
  }
}
