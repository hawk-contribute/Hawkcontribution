# Hawk Contribute — Security Audit

**Date:** 2026-09-13 (UTC)  
**Scope:** `/workspace/hawk-contribute` (Vite + React + TypeScript + Supabase + GitHub Pages)  
**Baseline review:** `f4c7c1a`  
**Remediation pass:** 2026-09-13 (High + Medium app/repo fixes; DB grants/CHECK applied on project `bqccemvnwmtcuzaoouwr`)  
**Method:** Static review of `src/`, env files, build patterns, dependency audit; coordinator-applied Supabase SQL noted below.

---

## Executive summary

No **Critical** issues were found (no service-role key, no hardcoded user passwords, no private keys). The app correctly uses the **Supabase anon key** with **PKCE** auth and relies on **RLS** for write/delete authority.

**Remediated on 2026-09-13 (app + DB):** proof/news URL `http(s)` allowlist (`safeHttpUrl` + CHECK), public UI email masking, password minimum **10**, SECURITY DEFINER EXECUTE grants tightened, env files untracked + README hygiene.

**Needs Pro plan (N/A on Free):** **Leaked password protection** requires Supabase **Pro+** per docs. Project is on **Free** — cannot enable; not a failed app remediation. Client password min 10 remains in place.

---

## Findings (status as of remediation)

| Severity | Status | Area | Issue | Notes |
|----------|--------|------|-------|-------|
| **High** | **Remediated** 2026-09-13 | XSS / uploads | `proofUrl` as raw `href` | `safeHttpUrl()` on UploadModal / communityCloud / LedgerView; DB CHECK `^https?://`. |
| **Medium** | **Remediated** 2026-09-13 | Privacy / API | Public emails in UI | `maskEmail` / `displayEmail` in Ledger + Feed likes; owners/admins may see full. DB `mask_email` helper. |
| **Medium** | **Remediated** 2026-09-13 | Auth | Password min was 6 | Client min raised to **10** (`useSession`, `AuthModal`, i18n). |
| **Medium** | **Needs Pro plan** (N/A on Free) | Supabase Auth | Leaked password protection off | Confirmed Free plan. Feature requires Pro+ per Supabase docs — not applicable until upgrade. Not a code remediation failure. |
| **Medium** | **Remediated** 2026-09-13 (DB) | SECURITY DEFINER | Broad EXECUTE | `is_site_admin`: EXECUTE revoked from anon/public, granted to `authenticated`. `handle_new_user`: revoked from anon/authenticated/public (trigger-only). |
| **Medium** | **Remediated** 2026-09-13 | Config hygiene | Tracked `.env.production` | `.gitignore` ignores `.env` / `.env.production` / `.env.development`; removed from git index (local kept); README: never commit `service_role`. |
| **Low** | Open | Admin UX | Admin emails in bundle | `admins.ts` UX-only; RLS authority. |
| **Low** | Open | Logging | Auth console logs email | Prefer error codes only. |
| **Low** | **Remediated** 2026-09-13 | News URLs | Admin news `href` | Same `safeHttpUrl()` + DB CHECK. |
| **Info** | Open | Third-party | Dexscreener / BSC / X | Expected; no secrets. |
| **Info** | Open | Donations | Public addresses | No private keys. |

---

## What's already OK

- Supabase client uses **anon key only**; **no `service_role`** in `src/` or local env intended for Vite.
- Auth: email/password + **PKCE**; callback cleaned in `authCallback.ts`.
- Admin deletes use user JWT; **RLS is source of truth**.
- User text rendered as React text (no `dangerouslySetInnerHTML`).
- Cloud uploads store attachment names only; size capped.
- `npm audit --omit=dev` reported **0** vulnerabilities at review time.

---

## Remaining / plan notes

1. **Leaked password protection:** Requires Supabase **Pro+**. On **Free** this finding is **not applicable** (accepted residual until upgrade). Docs: https://supabase.com/docs/guides/auth/password-security  
2. Optional: narrow public SELECT columns so emails are not returned to anon at all.  
3. Optional: Low items (admins.ts disclosure; console email logging).

---

## Notes / limitations

- GitHub Pages hosts a static SPA: all `VITE_*` values are visible to browsers by design.  
- Historical git history may still contain previously tracked anon JWT files; rotating anon key is optional if desired.
