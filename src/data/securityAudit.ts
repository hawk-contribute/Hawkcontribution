export type AuditSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export type AuditFinding = {
  id: string
  severity: AuditSeverity
  areaEn: string
  areaZh: string
  titleEn: string
  titleZh: string
  detailZh: string
  detailEn: string
  paths: string[]
}

export const SECURITY_AUDIT_META = {
  date: '2026-09-13',
  commit: 'f4c7c1a+',
  scopeEn:
    'Vite React + Supabase + GitHub Pages app at hawk-contribute (auth, RLS assumptions, XSS, secrets, third-party fetches).',
  scopeZh:
    'Hawk Contribute（Vite React + Supabase + GitHub Pages）：認證、RLS 假設、XSS、密鑰、第三方請求。',
} as const

export const SECURITY_AUDIT_FINDINGS: AuditFinding[] = [
  {
    id: 'proof-url-href',
    severity: 'high',
    areaEn: 'XSS / uploads',
    areaZh: 'XSS／上傳',
    titleEn: 'Unvalidated proofUrl used as link href',
    titleZh: '未驗證的 proofUrl 直接作為連結 href',
    detailZh:
      '使用者可在上傳時填寫 proofUrl，Ledger 以 href={c.proofUrl} 渲染。若填入 javascript: 或其他危險協定，點擊可能導致腳本執行或釣魚。建議僅允許 http/https，並在寫入前後端雙重驗證。',
    detailEn:
      'Contributors can set proofUrl; LedgerView renders it as href without an http(s) allowlist. A javascript: URL could XSS on click. Allow only http/https client- and server-side.',
    paths: [
      'src/components/LedgerView.tsx',
      'src/components/UploadModal.tsx',
      'src/lib/communityCloud.ts',
    ],
  },
  {
    id: 'public-emails',
    severity: 'medium',
    areaEn: 'Privacy / API',
    areaZh: '隱私／API',
    titleEn: 'Participant emails exposed via public SELECT / UI',
    titleZh: '投稿者 Email 經公開 SELECT／介面暴露',
    detailZh:
      'contributions 含 participant_email，likes 含 user_email；若 RLS 允許匿名讀取，任何人可用 anon key 蒐集郵件。Ledger 亦顯示 Email。建議公開介面只顯示暱稱或遮罩。',
    detailEn:
      'Cloud rows include participant_email / user_email. With public SELECT, emails are harvestable. Prefer display names or masking in public views.',
    paths: ['src/lib/communityCloud.ts', 'src/components/LedgerView.tsx'],
  },
  {
    id: 'weak-password',
    severity: 'medium',
    areaEn: 'Auth',
    areaZh: '認證',
    titleEn: 'Minimum password length is only 6 characters',
    titleZh: '密碼最短僅 6 碼',
    detailZh:
      'useSession.ts 僅檢查 password.length < 6。建議提高長度，並啟用 Supabase 洩漏密碼防護。',
    detailEn:
      'Client only rejects passwords shorter than 6. Raise minimum length and enable leaked-password protection in Supabase Auth.',
    paths: ['src/hooks/useSession.ts'],
  },
  {
    id: 'leaked-pw-advisor',
    severity: 'medium',
    areaEn: 'Supabase Auth advisor',
    areaZh: 'Supabase Auth 建議',
    titleEn: 'Leaked password protection disabled (WARN)',
    titleZh: '已洩漏密碼防護未啟用（WARN）',
    detailZh:
      '專案顧問警告：Leaked password protection 關閉。遭外洩的常見密碼仍可能通過註冊／變更。請在 Supabase Auth 設定啟用。',
    detailEn:
      'Supabase advisor WARN: leaked password protection is off. Enable it in Auth settings.',
    paths: ['Supabase Dashboard → Auth'],
  },
  {
    id: 'security-definer',
    severity: 'medium',
    areaEn: 'Supabase advisor',
    areaZh: 'Supabase 建議',
    titleEn: 'SECURITY DEFINER functions executable by anon/authenticated',
    titleZh: 'SECURITY DEFINER 函式可被 anon／authenticated 執行',
    detailZh:
      '顧問警告：is_site_admin、handle_new_user 為 SECURITY DEFINER 且可能授予過寬 EXECUTE。應鎖定 search_path、收回不必要的 PUBLIC/anon 執行權，並審核函式內容。',
    detailEn:
      'Advisor WARN: is_site_admin / handle_new_user are SECURITY DEFINER and callable too broadly. Revoke excess EXECUTE; fix search_path; review bodies.',
    paths: ['Supabase SQL: is_site_admin', 'handle_new_user'],
  },
  {
    id: 'env-tracked',
    severity: 'medium',
    areaEn: 'Config hygiene',
    areaZh: '設定衛生',
    titleEn: 'Live anon key committed in .env.production',
    titleZh: '正式 anon key 提交於 .env.production',
    detailZh:
      '已追蹤的 .env.production／.env.development 含 role=anon 的 JWT（SPA 常態）。.gitignore 未排除它們，日後易誤提交 service_role。請維持僅 anon，並加強文件／忽略規則。',
    detailEn:
      'Tracked env files contain the public anon JWT (normal for Vite SPAs). Tighten gitignore/docs so a service_role key is never committed.',
    paths: ['.env.production', '.env.development', '.gitignore'],
  },
  {
    id: 'admin-emails-client',
    severity: 'low',
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
    areaEn: 'News',
    areaZh: '最新消息',
    titleEn: 'Admin news URL used as href',
    titleZh: '管理員貼文 URL 作為 href',
    detailZh:
      'NewsView 將 news_posts.url 設為連結。管理員帳號被盜或誤貼時風險類似 proofUrl。建議同樣限制 http/https。',
    detailEn:
      'News card links use stored url. Apply the same http(s) allowlist as proof links.',
    paths: ['src/components/NewsView.tsx', 'src/lib/news.ts'],
  },
  {
    id: 'third-party',
    severity: 'info',
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
  'npm audit（正式依賴）當次為 0 漏洞。',
]

export const SECURITY_AUDIT_OK_EN = [
  'Supabase client uses anon key only; JWT role=anon.',
  'No service_role or private key material found.',
  'Auth via Supabase email/password + PKCE; callback params cleaned.',
  'Admin deletes use user JWT; admins.ts documents RLS as authority.',
  'User text rendered as React text (no dangerouslySetInnerHTML).',
  'Cloud uploads store attachment names only; size capped.',
  'npm audit (prod) reported 0 vulnerabilities at review time.',
]

export const SECURITY_AUDIT_NEXT_ZH = [
  '優先：限制 proof_url／外連僅 http/https。',
  '啟用洩漏密碼防護並提高密碼強度。',
  '收緊 SECURITY DEFINER 函式權限。',
  '減少公開 Email 暴露。',
  '強化 .env／gitignore 避免誤提交 service_role。',
]

export const SECURITY_AUDIT_NEXT_EN = [
  'First: allowlist http(s) for proof_url and external links.',
  'Enable leaked-password protection; strengthen passwords.',
  'Harden SECURITY DEFINER grants.',
  'Reduce public email exposure.',
  'Improve env/gitignore hygiene against service_role commits.',
]
