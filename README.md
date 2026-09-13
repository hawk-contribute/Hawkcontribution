# Hawk Contribute（Hawk 貢獻）

**Live:** https://jeffyu-jpg.github.io/Hawkcontribution/


Local MVP web app for Hawk's brand / community ecosystem. Participants browse opportunities (活動 / 合作 / 內容貢獻), set a simple local identity, join, and **record** contributions. Points and redemption are **not** implemented in this MVP.

## What it does

- Browse seeded opportunities in three types: **活動** / **合作** / **內容貢獻**
- Local identity via `localStorage` (display name + optional email) — no OAuth
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
- Locale persisted in `localStorage` key `hawk-contribute:locale`
- Default: browser language when recognizable, else **繁體中文**
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

## Deploy (GitHub Pages)

**Live:** https://jeffyu-jpg.github.io/Hawkcontribution/

Vite `base` is `/Hawkcontribution/`. Asset paths go through `src/lib/asset.ts`.

Current publish source: **`gh-pages` branch** (built `dist`).  
Actions workflow is prepared at `.github/workflows/deploy-pages.yml` — pushing it requires a token with the `workflow` scope (`gh auth refresh -h github.com -s workflow`), then switch Pages to **GitHub Actions**.
