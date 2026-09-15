/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Optional Cloudflare Turnstile site key. When set, Rewards uses Turnstile instead of the built-in challenge. */
  readonly VITE_TURNSTILE_SITE_KEY?: string
  /** Optional WalletConnect Cloud project id. Injected wallets work without it. */
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
