# Hawk Contribute — Security Audit

**Date:** 2026-09-13 (UTC)  
**Scope:** `/workspace/hawk-contribute` (Vite + React + TypeScript + Supabase + GitHub Pages)  
**Commit reviewed:** `f4c7c1a` (and local tree for Audit tab)  
**Method:** Static review of `src/`, env files, build output patterns, dependency audit. Database RLS policies were **not** re-executed live; findings assume policies described by the project / coordinator.

---

## Executive summary

No **Critical** issues were found (no service-role key, no hardcoded user passwords, no private keys). The app correctly uses the **Supabase anon key** with **PKCE** auth and relies on **RLS** for write/delete authority. Client `admins.ts` is UX-only, which is appropriate **if** RLS `is_site_admin()` is correct.

Main residual risks are: **user-controlled URLs** rendered as `href` (possible `javascript:` XSS), **public exposure of contributor emails** via API/UI, **weak client password minimum (6)**, **Supabase Auth advisor warnings** (SECURITY DEFINER grants; leaked-password protection off), and **committed `.env.production` anon key** (expected for a public SPA, but gitignore should prevent accidental service-role commits).

---

## Findings

| Severity | Area | Issue | Impact | Recommendation |
|----------|------|-------|--------|----------------|
| **High** | XSS / uploads | `proofUrl` from contributors is rendered as raw `href` without scheme allowlist (`LedgerView.tsx` → `href={c.proofUrl}`; set in `UploadModal.tsx`, stored in `communityCloud.ts` `proof_url`). | Authenticated user could set `javascript:…` or malicious URL; click may execute script in victims’ browsers or open phishing pages. | Allow only `http:`/`https:`; reject others server-side (CHECK) and client-side before insert/render. Use `rel="noopener noreferrer"` (already present) + optional text-only display of URL. |
| **Medium** | Privacy / API | Contribution rows expose `participant_email` (and likes `user_email`) to **public SELECT**; Ledger shows email (`LedgerView.tsx`). | Anyone with anon key can harvest member emails. | Prefer display name only in public UI; mask emails; tighten SELECT columns / views. |
| **Medium** | Auth policy | Client enforces password length ≥ 6 only (`useSession.ts`). | Weak passwords more likely; credential stuffing easier. | Raise min length (e.g. 10+); enable Supabase leaked-password protection; optional complexity. |
| **Medium** | Supabase Auth advisor | **Leaked password protection disabled** (project WARN). | Compromised passwords from breaches may still be accepted. | Enable “Leaked password protection” in Supabase Auth settings. |
| **Medium** | Supabase advisor | `is_site_admin` / `handle_new_user` **SECURITY DEFINER** executable by `anon`/`authenticated` (WARN). | If functions are overly privileged or mis-granted, callers might abuse DEFINER rights. | Revoke EXECUTE from `PUBLIC`/`anon` where not required; lock `search_path`; grant only to roles that need them; review function bodies. |
| **Medium** | Config hygiene | `.env.production` / `.env.development` are **git-tracked** with live anon JWT (`role=anon`). `.gitignore` only ignores `.env.local`. | Anon key is public by design in SPAs, but tracking env files makes it easy to accidentally commit a **service_role** later. | Keep only anon in Vite env; add `.env.production` caution to README; prefer CI secrets for builds; never commit service_role. |
| **Low** | Admin UX | Admin emails hardcoded in `src/lib/admins.ts` and shipped in the JS bundle. | Reveals operator emails; attacker can show admin UI locally but **cannot** delete without RLS. | Accept as public ops contacts, or derive admin UI from a non-sensitive claim / RPC that doesn’t list emails. |
| **Low** | Logging | `useSession.ts` `console.error` includes `email` on auth failures. | PII in browser console / support screenshots. | Log error codes only, not email. |
| **Low** | News URLs | Admin-pasted `news_posts.url` rendered as `href` (`NewsView.tsx`). | Same class as proof URL if an admin account is compromised or mistaken paste. | Same `http(s):` allowlist for news URLs. |
| **Info** | Third-party | Dexscreener (`hawkPrice.ts`), BSC RPCs (`bscDonation.ts`), optional X syndication (`news.ts`) fetched from browser. | No secrets sent; failures degrade safely; third parties see visitor IP. | Keep timeouts; no API keys in client; document privacy. |
| **Info** | Donations | Public BSC donation + HAWK token addresses in `donation.ts`. | Expected; **no private keys** in repo. | Continue never storing keys; warn users about irreversible transfers (already in i18n). |
| **Info** | Legacy storage | `storage.ts` still has `loadSession` / local contribution caches. | Auth path uses Supabase session (`useSession.ts`), not this as authority — low confusion risk. | Remove or clearly mark dead local-auth helpers. |

---

## What's already OK

- Supabase client uses **anon key only** (`src/lib/supabase.ts`); decoded JWT `role=anon` in `.env.production` / `.env.development`.
- **No `service_role`** string or private key material found in `src/` or tracked env.
- Auth: `signInWithPassword` / `signUp` / `resetPasswordForEmail` / `updateUser` via Supabase; **PKCE** (`flowType: 'pkce'`); redirect cleaned in `authCallback.ts`.
- Admin deletes call Supabase with user JWT; comments in `admins.ts` / `communityCloud.ts` correctly state **RLS is source of truth**.
- React renders comments, descriptions, news `body` as **text nodes** (no `dangerouslySetInnerHTML` in `src/`).
- Uploads: cloud stores **attachment names** only, not file bytes (`createContributionCloud`); size capped (`MAX_UPLOAD_BYTES`).
- `npm audit --omit=dev` reported **0** vulnerabilities at audit time.
- Donation UI does not handle wallets/private keys.

---

## Suggested fix priority

1. **Sanitize `proof_url` / external links** (http/https only) — High.  
2. **Enable Supabase leaked-password protection** + strengthen password policy — Medium.  
3. **Harden SECURITY DEFINER** grants on `is_site_admin` / `handle_new_user` — Medium.  
4. **Reduce public email exposure** on contributions/likes — Medium.  
5. **Env/gitignore hygiene** to prevent future service-role commits — Medium.  
6. Trim auth console PII; allowlist news URLs; clean legacy session helpers — Low.

---

## Notes / limitations

- This audit **did not** re-run Supabase policy SQL against production; coordinator-reported advisor WARNs are included as stated.  
- GitHub Pages hosts a static SPA: all `VITE_*` values are visible to browsers by design.
