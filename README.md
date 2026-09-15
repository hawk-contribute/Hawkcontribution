# Hawk Contribute（Hawk 貢獻）

**Live:** https://hawk-contribute.github.io/Hawkcontribution/


Web app for Hawk's brand / community ecosystem. Participants browse opportunities (活動 / 合作 / 內容貢獻), sign in with **email magic link** (Supabase), join, and **record** contributions. Mini-game points and NFT claims sync to Supabase when online.

## What it does

- Browse seeded opportunities in three types: **活動** / **合作** / **內容貢獻**
- **Supabase Auth** email magic-link sign-in (session persisted; guests can still browse)
- Join an opportunity and submit a contribution (title, description, optional proof URL)
- Personal contribution ledger (history) persisted in the browser
- zh-TW UI copy; English in code and comments
- Dark, bold Hawk-forward responsive UI

## How to run

```bash
cd /workspace/hawk-contribute
npm install
npm run dev
```

Open the URL Vite prints (default **http://localhost:5173**).

Other scripts:

```bash
npm run build    # production build
npm run preview  # preview production build
```






## NFT rewards

- Nav: **獎勵 / Rewards** — gallery of 6 collectible NFTs.
- Redeem at **10,000+** mini-game points (`hawk-contribute:points`).
- Claims: `hawk-contribute:nft-claims` → `{ [email]: { [nftId]: { claimedAt } } }`.
- Owned NFTs can be **downloaded** locally. App collectibles (not on-chain).
- Game tab is the **leftmost** nav item.
- Game audio: procedural Web Audio SFX/BGM; mute pref in `hawk-contribute:game-mute`.
- **Anti-bot verification** before claim / download (see below).

## Anti-bot verification (Rewards)

Claim and download stay disabled until the user passes a short human check on the Rewards page.

- **Default (no API key):** built-in checkbox + timed interaction + simple math challenge. Works on GitHub Pages with zero third-party keys.
- **Optional Turnstile:** set `VITE_TURNSTILE_SITE_KEY` (Cloudflare Turnstile site key) in the build env; when present, Turnstile is used instead of the built-in challenge.
- After pass, a short-lived `claim_token` is stored in `sessionStorage` (`hawk-contribute:claim-token`, ~12 min TTL). It is cleared after one successful claim (or on expiry / retry).
- **v1 is client-side only** (honest bot friction). It does not pretend to be server-verified unless a future Supabase check is added.

## Mini-game (Bald Eagle Whack)

- Nav: **小遊戲 / Game** — login required.
- Whack eagles for 30s; points saved in `hawk-contribute:points` (`email → { total, history }`).
- Points accumulate toward **future reward eligibility** (no redemption catalog yet).

## Community feed & live activity

- **Marquee** under the header thanks contributors in realtime (last 30 events).
- **Counters** for contributions (by category), likes, comments, citations, members.
- **Public feed** (browse/search without login); like / comment / cite require email session.
- Storage keys: `hawk-contribute:contributions`, `hawk-contribute:social`, `hawk-contribute:session`.
- Tab sync via `BroadcastChannel` (`hawk-contribute-sync`) + `storage` events.

## Auth & uploads (MVP)

- **Email sign-in** (local session in `localStorage`: email, displayName, signedInAt). No server verification yet.
- Browse is open; **contribute / upload requires sign-in**.
- Categorized upload: 活動 / 合作 / 內容貢獻 — optional linked opportunity or open submission; title, description, proof URL, file attachments (demo: base64 in localStorage, ~2.5MB cap).

## Languages (i18n)

UI supports **English / 简体中文 / 繁體中文**.

- Switcher: header `EN | 简 | 繁` (`src/components/LanguageSwitcher.tsx`)
- Strings: `src/i18n/translations.ts`
- Context: `src/i18n/context.tsx` (`t()`, `lx()`, `lxList()`)
- Locale persisted in `localStorage` key `hawk-contribute:locale` (only when the user picks a language)
- First visit (no saved preference): IP region via `https://ipapi.co/json/` (`src/i18n/geoLocale.ts`) — **CN** → `zh-CN`, **TW/HK/MO/SG** → `zh-TW`, else `en`. Short timeout; on failure falls back to `navigator.language` then `en`. Saved preference is never overridden.
- Seeded opportunities store keyed copy (`en` / `zh-CN` / `zh-TW`) in `src/data/opportunities.ts`

## Opportunity photos

Local covers under `public/photos/` (Unsplash downloads; see `public/photos/SOURCES.md`). Each `OpportunityCard` shows a 16:9 cover.

## Brand assets

Bundled under `public/brand/` (copied into the project; no external attachment paths):

- `hawk-logo.png` — full logo (eagle circle + Hawk wordmark)
- `hawk-mark.png` — circular eagle mark (header + favicon)
- `hawk-token.png` — coin art (hero accent + ledger empty / count badge)

Favicons: `public/favicon.png`, `public/favicon-32.png`.

## Tech stack

- Vite + React + TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite`)
- `localStorage` for identity + contributions

## Data & persistence

| Key | Purpose |
|-----|---------|
| `hawk-contribute:identity` | Display name (+ optional email) |
| `hawk-contribute:contributions` | Contribution ledger array |

Seeded opportunities live in `src/data/opportunities.ts` (static sample data).

## Where future rewards plug in

MVP **records contributions only**. When points / redemption land:

1. **`src/types.ts`** — `FutureRewardHook` documents the intended `evaluate(contribution, opportunity) => number` shape.
2. **`src/hooks/useContributions.ts`** — after `addContribution` persists an entry, call the reward evaluator and store/display points (commented hook in code).
3. Do **not** bake points into the contribution write path until the rule engine exists.

## Project layout

```
src/
  App.tsx                 # Shell + tab routing
  i18n/                   # Locale context + EN/简/繁 dictionaries
  components/             # UI (Header, LanguageSwitcher, cards, modals, ledger)
  data/opportunities.ts   # Seeded opportunities (localized + photo paths)
  hooks/                  # Identity + contributions
  lib/storage.ts          # localStorage helpers
  types.ts                # Shared types + rewards hook comment
  index.css               # Tailwind + Hawk theme
public/
  brand/                  # Hawk logo mark + token
  photos/                 # Opportunity cover images
```

## License

Private demo / internal MVP for Hawk.

## Shared community feed (Supabase)

Guests can **read** contributions, likes, comments, quotes, and the activity marquee from Supabase.
Signed-in users can **write** (RLS: public SELECT; authenticated INSERT of own rows).

Tables: `contributions`, `contribution_likes`, `contribution_comments`, `contribution_quotes`, `activities`.
Attachment **names** only are stored (no base64 blobs). Proof URL optional.

Realtime + 25s poll while browsing keep the feed in sync across browsers.

## Auth (Supabase email + password)

Primary: **Sign up / Sign in** with email + password (`signUp` / `signInWithPassword`).
**Forgot password?** → `resetPasswordForEmail` → open recovery link on this site → set new password (`updateUser`).
Passwords are stored by **Supabase Auth** (not local fake sessions).

Optional leftover magic-link callback handling remains harmless for old emails.

### Required Dashboard URL config

Supabase Dashboard → **Authentication → URL Configuration**:

- **Site URL:** `https://hawk-contribute.github.io/Hawkcontribution/`
- **Redirect URLs:** same + `http://localhost:5173/` (local `npm run dev`)

If **Confirm email** is enabled, new sign-ups must confirm before `signInWithPassword` works.


## Deploy (GitHub Pages)

**Live:** https://hawk-contribute.github.io/Hawkcontribution/

Vite `base` is `/Hawkcontribution/`. Asset paths go through `src/lib/asset.ts`.

Current publish source: **`gh-pages` branch** (built `dist`).  
Actions workflow is prepared at `.github/workflows/deploy-pages.yml` — pushing it requires a token with the `workflow` scope (`gh auth refresh -h github.com -s workflow`), then switch Pages to **GitHub Actions**.

## Wallet signature login (SIWE / Web3)

Supabase Auth **Sign in with Web3** (Ethereum / EIP-4361). Users connect an injected wallet (MetaMask etc.), sign a login message (`personal_sign` only — **no on-chain tx / gas**), and receive a normal Supabase session. Email + password login remains available.

### Enable on the project (required once)

1. Open [Auth → Providers](https://supabase.com/dashboard/project/bqccemvnwmtcuzaoouwr/auth/providers) and enable **Web3** → **Ethereum**.
2. [URL Configuration](https://supabase.com/dashboard/project/bqccemvnwmtcuzaoouwr/auth/url-configuration) — add Redirect URLs:
   - `https://hawk-contribute.github.io/Hawkcontribution/**`
   - `https://hawk-contribute.github.io/**`
   - `http://localhost:5173/**` (local Vite)
3. Optional: rate-limit Web3 under Auth → Rate Limits.

Without step 1 the client shows `auth.web3Disabled`.

### Client flow

- `ensureBscChain` then `supabase.auth.signInWithWeb3({ chain: 'ethereum', statement, wallet, options: { url } })` via `src/lib/walletAuth.ts`
- Before SIWE: `eth_requestAccounts` → ensure chain `0x38` (BSC); `wallet_switchEthereumChain` / `wallet_addEthereumChain` if needed
- EIP-6963 discovery + `window.ethereum` fallback (no WalletConnect / wagmi required)
- Profile column `wallet_address` (unique, nullable) upserted after sign-in

Optional env: `VITE_WALLETCONNECT_PROJECT_ID` (reserved; injected wallets work without it).

### How to test

1. Enable Ethereum Web3 + redirect URLs (above).
2. Open the live site (or `npm run dev`), open Sign in → **Sign in with wallet** / **錢包簽名登入**.
3. Approve connection + signature in MetaMask (BSC or any EVM chain is fine).
4. Header shows shortened address; points / NFT sync use the same session path as email.

## Security / env

- Use **anon** key only in `VITE_SUPABASE_ANON_KEY` (public by design for the SPA).
- **Never** commit a Supabase `service_role` key or other secrets. `.env.production` / `.env.development` are gitignored — copy from `.env.example`.
- **Leaked password protection** is enabled on Pro Auth (HaveIBeenPwned; verified 2026-09-14).
