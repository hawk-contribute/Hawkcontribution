export type AuditSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export type AuditStatus = 'open' | 'remediated' | 'partial' | 'dashboard' | 'needs_pro'

export type AuditFinding = {
  id: string
  severity: AuditSeverity
  status: AuditStatus
  areaEn: string
  areaZh: string
  titleEn: string
  titleZh: string
  detailZh: string
  detailEn: string
  paths: string[]
  /** Optional Dashboard / docs link (shown for dashboard / partial items). */
  actionUrl?: string
  actionLabelEn?: string
  actionLabelZh?: string
}

export const SECURITY_AUDIT_META = {
  date: '2026-09-14',
  commit: 'pro-adjust-2026-09-14',
  scopeEn:
    'Vite React + Supabase + GitHub Pages app at hawk-contribute (auth, RLS assumptions, XSS, secrets, third-party fetches). Remediation pass 2026-09-13.',
  scopeZh:
    'Hawk Contribute（Vite React + Supabase + GitHub Pages）：認證、RLS 假設、XSS、密鑰、第三方請求。2026-09-13 修復回合。',
} as const

export const SECURITY_AUDIT_FINDINGS: AuditFinding[] = [
  {
    id: 'proof-url-href',
    severity: 'high',
    status: 'remediated',
    areaEn: 'XSS / uploads',
    areaZh: 'XSS／上傳',
    titleEn: 'Unvalidated proofUrl used as link href',
    titleZh: '未驗證的 proofUrl 直接作為連結 href',
    detailZh:
      '【已於 2026-09-13 Remediated】新增 safeHttpUrl()，上傳（UploadModal）、雲端寫入（communityCloud）與 Ledger 渲染僅允許 http/https；拒絕 javascript:／data: 等。資料庫 CHECK 已同步。',
    detailEn:
      '[Remediated 2026-09-13] safeHttpUrl() allowlists http/https on insert (UploadModal, communityCloud) and Ledger render; rejects javascript:/data:. DB CHECK aligned.',
    paths: [
      'src/lib/safeUrl.ts',
      'src/components/LedgerView.tsx',
      'src/components/UploadModal.tsx',
      'src/lib/communityCloud.ts',
    ],
  },
  {
    id: 'public-emails',
    severity: 'medium',
    status: 'remediated',
    areaEn: 'Privacy / API',
    areaZh: '隱私／API',
    titleEn: 'Participant emails exposed via public SELECT / UI',
    titleZh: '投稿者 Email 經公開 SELECT／介面暴露',
    detailZh:
      '【已於 2026-09-13 Remediated】Ledger／Feed likes 對非管理員以 maskEmail／displayEmail（首字 + ***@domain）遮罩；本人與管理員仍可見完整信箱。DB 另有 mask_email helper。公開 API 欄位仍可能存在——UI 已不再完整展示。',
    detailEn:
      '[Remediated 2026-09-13] Ledger/Feed likes mask emails for non-admins (first char + ***@domain); owners/admins may see full. DB mask_email helper added. Column may still exist in API — UI no longer shows full emails publicly.',
    paths: [
      'src/lib/maskEmail.ts',
      'src/components/LedgerView.tsx',
      'src/components/FeedView.tsx',
    ],
  },
  {
    id: 'weak-password',
    severity: 'medium',
    status: 'remediated',
    areaEn: 'Auth',
    areaZh: '認證',
    titleEn: 'Minimum password length is only 6 characters',
    titleZh: '密碼最短僅 6 碼',
    detailZh:
      '【已於 2026-09-13 Remediated】客戶端最短密碼改為 10（useSession／AuthModal／i18n）。組織已在 Pro；洩漏密碼防護可於 Auth 設定啟用（見下方 dashboard 項）。',
    detailEn:
      '[Remediated 2026-09-13] Client minimum password length raised to 10 (useSession / AuthModal / i18n). Org is on Pro; enable leaked-password protection in Auth settings (see dashboard item below).',
    paths: ['src/hooks/useSession.ts', 'src/components/AuthModal.tsx'],
  },
  {
    id: 'leaked-pw-advisor',
    severity: 'medium',
    status: 'dashboard',
    areaEn: 'Supabase Auth advisor',
    areaZh: 'Supabase Auth 建議',
    titleEn: 'Leaked password protection — enable on Pro',
    titleZh: '已洩漏密碼防護 — 請於 Pro 啟用',
    detailZh:
      '【Dashboard／Pro 已就緒】組織已確認為 Supabase Pro。請於 Dashboard → Authentication → Providers（Email）開啟「Prevent use of leaked passwords」（HaveIBeenPwned）。客戶端密碼最短 10 已落地。啟用後 advisors 的 auth_leaked_password_protection 應消失。',
    detailEn:
      '[Open dashboard — Pro ready] Org confirmed Supabase Pro. Enable “Prevent use of leaked passwords” (HaveIBeenPwned) in Dashboard → Authentication → Providers (Email). Client password min 10 is in place. After enabling, the auth_leaked_password_protection advisor should clear.',
    paths: ['Supabase Auth (Pro)', 'docs: password-security'],
    actionUrl:
      'https://supabase.com/dashboard/project/bqccemvnwmtcuzaoouwr/auth/providers?provider=Email',
    actionLabelEn: 'Open Auth providers (enable leaked-pw)',
    actionLabelZh: '開啟 Auth Providers（啟用洩漏密碼防護）',
  },
  {
    id: 'security-definer',
    severity: 'medium',
    status: 'remediated',
    areaEn: 'Supabase advisor',
    areaZh: 'Supabase 建議',
    titleEn: 'SECURITY DEFINER functions executable by anon/authenticated',
    titleZh: 'SECURITY DEFINER 函式可被 anon／authenticated 執行',
    detailZh:
      '【已於 2026-09-13 Remediated（DB）】收回 anon/public 對 is_site_admin 的 EXECUTE，僅授予 authenticated；handle_new_user 自 anon/authenticated/public 收回（僅觸發器）。',
    detailEn:
      '[Remediated 2026-09-13 on DB] Revoked anon/public EXECUTE on is_site_admin (authenticated only); handle_new_user revoked from anon/authenticated/public (trigger-only).',
    paths: ['Supabase SQL: is_site_admin', 'handle_new_user'],
  },
  {
    id: 'env-tracked',
    severity: 'medium',
    status: 'remediated',
    areaEn: 'Config hygiene',
    areaZh: '設定衛生',
    titleEn: 'Live anon key committed in .env.production',
    titleZh: '正式 anon key 提交於 .env.production',
    detailZh:
      '【已於 2026-09-13 Remediated】.gitignore 忽略 .env／.env.production／.env.development；已自 git 索引移除（本地檔保留）；README 警告勿提交 service_role。歷史 commit 仍可能含 anon JWT（SPA 常態）。',
    detailEn:
      '[Remediated 2026-09-13] gitignore covers .env / .env.production / .env.development; removed from git index (local files kept); README warns never commit service_role. Historical commits may still contain anon JWT (normal for SPAs).',
    paths: ['.gitignore', 'README.md', '.env.example'],
  },
  {
    id: 'admin-emails-client',
    severity: 'low',
    status: 'open',
    areaEn: 'Admin UX',
    areaZh: '管理員 UX',
    titleEn: 'Admin emails shipped in client bundle',
    titleZh: '管理員 Email 打包進前端',
    detailZh:
      'src/lib/admins.ts 白名單會出現在公開 JS。僅控制按鈕顯示；真正刪除靠 RLS。仍會暴露營運者信箱。',
    detailEn:
      'admins.ts allowlist is public in the bundle (UX only; RLS enforces deletes). Still discloses operator emails.',
    paths: ['src/lib/admins.ts'],
  },
  {
    id: 'auth-console-email',
    severity: 'low',
    status: 'open',
    areaEn: 'Logging',
    areaZh: '日誌',
    titleEn: 'Auth failures log email in console',
    titleZh: '登入失敗時在 console 記錄 Email',
    detailZh:
      'useSession.ts 的 console.error 帶有 email 欄位，可能進入除錯截圖。建議只記錄錯誤碼。',
    detailEn:
      'signIn/signUp error logs include email. Prefer error codes only.',
    paths: ['src/hooks/useSession.ts'],
  },
  {
    id: 'news-url-href',
    severity: 'low',
    status: 'remediated',
    areaEn: 'News',
    areaZh: '最新消息',
    titleEn: 'Admin news URL used as href',
    titleZh: '管理員貼文 URL 作為 href',
    detailZh:
      '【已於 2026-09-13 Remediated】News 寫入／卡片連結使用同一 safeHttpUrl()；資料庫 CHECK 已同步。',
    detailEn:
      '[Remediated 2026-09-13] News writes/card links use the same safeHttpUrl(); DB CHECK aligned.',
    paths: ['src/components/NewsView.tsx', 'src/lib/news.ts', 'src/lib/safeUrl.ts'],
  },
  {
    id: 'third-party',
    severity: 'info',
    status: 'open',
    areaEn: 'Third-party fetches',
    areaZh: '第三方請求',
    titleEn: 'Browser calls Dexscreener / BSC RPC / optional X syndication',
    titleZh: '瀏覽器請求 Dexscreener／BSC RPC／可選 X 來源',
    detailZh:
      '未夾帶專案密鑰；失敗時降級顯示。第三方可見訪客 IP。屬預期設計。',
    detailEn:
      'No app secrets sent; failures degrade safely. Third parties see visitor IPs.',
    paths: ['src/lib/hawkPrice.ts', 'src/lib/bscDonation.ts', 'src/lib/news.ts'],
  },
  {
    id: 'donation-public',
    severity: 'info',
    status: 'open',
    areaEn: 'Donations',
    areaZh: '捐贈',
    titleEn: 'Public donation / token addresses only',
    titleZh: '僅公開捐贈／代幣地址',
    detailZh:
      'donation.ts 僅含公開鏈上地址，未發現私鑰。屬預期。',
    detailEn:
      'Only public chain addresses in donation.ts; no private keys found.',
    paths: ['src/lib/donation.ts'],
  },
]

export const SECURITY_AUDIT_OK_ZH = [
  'Supabase 客戶端僅使用 anon key（src/lib/supabase.ts）；JWT role=anon。',
  '未發現 service_role 或私鑰材料。',
  '認證走 Supabase email/password + PKCE；回調清參與 authCallback.ts。',
  '管理員刪除以使用者 JWT 呼叫；admins.ts 註明 RLS 為權威。',
  '留言／說明／消息正文以 React 文字節點渲染（無 dangerouslySetInnerHTML）。',
  '雲端投稿只存附件檔名，有大小上限。',
  'proof／news URL：safeHttpUrl + DB CHECK（http/https）。',
  '公開 UI Email 已遮罩；密碼最短 10；env 檔已自追蹤移除。',
  'npm audit（正式依賴）當次為 0 漏洞。',
]

export const SECURITY_AUDIT_OK_EN = [
  'Supabase client uses anon key only; JWT role=anon.',
  'No service_role or private key material found.',
  'Auth via Supabase email/password + PKCE; callback params cleaned.',
  'Admin deletes use user JWT; admins.ts documents RLS as authority.',
  'User text rendered as React text (no dangerouslySetInnerHTML).',
  'Cloud uploads store attachment names only; size capped.',
  'proof/news URLs: safeHttpUrl + DB CHECK (http/https).',
  'Public UI emails masked; password min 10; env files untracked.',
  'npm audit (prod) reported 0 vulnerabilities at review time.',
]

export const SECURITY_AUDIT_NEXT_ZH = [
  '洩漏密碼防護：組織已在 Pro — 於 Dashboard Auth Providers（Email）啟用「Prevent use of leaked passwords」。',
  '可選：進一步收窄公開 SELECT 欄位（不回傳 email）。',
  '可選：移除／隱藏 admins.ts 信箱白名單；auth console 勿記 email。',
]

export const SECURITY_AUDIT_NEXT_EN = [
  'Leaked password protection: org is on Pro — enable “Prevent use of leaked passwords” in Dashboard Auth Providers (Email).',
  'Optional: narrow public SELECT columns (omit emails).',
  'Optional: hide admins.ts email allowlist; stop logging email in auth console.',
]
