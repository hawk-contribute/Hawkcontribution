import type { Locale } from './types'

export const LOCALE_STORAGE_KEY = 'hawk-contribute:locale'

export const LOCALE_OPTIONS: { id: Locale; short: string; label: string }[] = [
  { id: 'en', short: 'EN', label: 'English' },
  { id: 'zh-CN', short: '简', label: '简体中文' },
  { id: 'zh-TW', short: '繁', label: '繁體中文' },
]

type Dict = Record<string, string>

export const translations: Record<Locale, Dict> = {
  en: {
    'brand.subtitle': 'Community contribution log',
    'brand.slogan': 'Freedom as our banner, guardians of the ecosystem',
    'brand.officialSite': 'Hawk Official Site',

    'nav.opportunities': 'Opportunities',
    'nav.ledger': 'My contributions',
    'nav.setIdentity': 'Set identity',
    'hero.badge': 'Hawk Community',
    'hero.title': 'Explore contribution opportunities',
    'hero.body':
      'Join through events, collaborations, and content calls — and keep a record of your Hawk ecosystem participation. This MVP records only; rewards plug in later.',
    'filter.all': 'All',
    'filter.event': 'Events',
    'filter.collab': 'Collaborations',
    'filter.content': 'Content',
    'browse.count': 'Showing {n} opportunities',
    'type.event': 'Event',
    'type.collab': 'Collaboration',
    'type.content': 'Content',
    'status.open': 'Open',
    'status.closing-soon': 'Closing soon',
    'status.ongoing': 'Ongoing',
    'card.deadline': 'Deadline / milestone',
    'card.join': 'Join & submit contribution',
    'identity.title': 'Local identity',
    'identity.hint': 'Stored only in this browser (localStorage). No OAuth.',
    'identity.name': 'Display name',
    'identity.email': 'Email (optional)',
    'identity.namePlaceholder': 'e.g. HawkFlyer',
    'identity.emailPlaceholder': 'you@example.com',
    'identity.nameRequired': 'Please enter a display name',
    'identity.save': 'Save identity',
    'identity.clear': 'Clear',
    'identity.close': 'Close',
    'contribute.title': 'Submit contribution',
    'contribute.as': 'Participating as',
    'contribute.fieldTitle': 'Contribution title',
    'contribute.fieldDesc': 'Short description',
    'contribute.fieldProof': 'Proof URL (optional)',
    'contribute.titlePlaceholder': 'e.g. Finished workshop script draft',
    'contribute.descPlaceholder': 'What you did, produced, or how you took part…',
    'contribute.required': 'Please fill in title and description',
    'contribute.cancel': 'Cancel',
    'contribute.submit': 'Save record',
    'ledger.title': 'My contribution ledger',
    'ledger.subtitle':
      'Your personal log stays on this device. Future reward rules can score these records.',
    'ledger.count': '{n} records',
    'ledger.emptyTitle': 'No contributions yet',
    'ledger.emptyBody': 'Pick an opportunity and submit — it will show up here.',
    'ledger.browse': 'Browse opportunities',
    'ledger.forOpportunity': 'Opportunity',
    'ledger.participant': 'Participant',
    'ledger.proof': 'Proof link',
    'toast.needIdentity': 'Set a display name before submitting',
    'toast.saved': 'Contribution saved! Check “My contributions”',
    'footer.line1': 'Hawk Contribute MVP · Local records only · Points / redemption not enabled',
    'footer.line2': 'Future rewards hook: see src/types.ts & useContributions.ts',
    'meta.required': '*',
  },
  'zh-CN': {
    'brand.subtitle': '社群生态贡献记录',
    'brand.slogan': '以自由为帜，生态守护',
    'brand.officialSite': 'Hawk 官网',

    'nav.opportunities': '机会',
    'nav.ledger': '我的贡献',
    'nav.setIdentity': '设置身份',
    'hero.badge': 'Hawk Community',
    'hero.title': '探索贡献机会',
    'hero.body':
      '通过活动、合作与内容征集参与 Hawk 生态，并把你的贡献留下来。本版 MVP 只做记录；积分与兑换日后接入。',
    'filter.all': '全部',
    'filter.event': '活动',
    'filter.collab': '合作',
    'filter.content': '内容贡献',
    'browse.count': '显示 {n} 个机会',
    'type.event': '活动',
    'type.collab': '合作',
    'type.content': '内容贡献',
    'status.open': '开放中',
    'status.closing-soon': '即将截止',
    'status.ongoing': '进行中',
    'card.deadline': '截止／节点',
    'card.join': '参与并提交贡献',
    'identity.title': '本地身份',
    'identity.hint': '仅保存在本机浏览器（localStorage），无需登录。',
    'identity.name': '显示名称',
    'identity.email': 'Email（选填）',
    'identity.namePlaceholder': '例如：HawkFlyer',
    'identity.emailPlaceholder': 'you@example.com',
    'identity.nameRequired': '请填写显示名称',
    'identity.save': '保存身份',
    'identity.clear': '清除',
    'identity.close': '关闭',
    'contribute.title': '提交贡献',
    'contribute.as': '以以下身份参与',
    'contribute.fieldTitle': '贡献标题',
    'contribute.fieldDesc': '简短说明',
    'contribute.fieldProof': '证明链接（选填）',
    'contribute.titlePlaceholder': '例如：完成工作坊练习脚本',
    'contribute.descPlaceholder': '描述你做了什么、产出或参与方式…',
    'contribute.required': '请填写标题与简短说明',
    'contribute.cancel': '取消',
    'contribute.submit': '送出记录',
    'ledger.title': '我的贡献记录',
    'ledger.subtitle': '个人账本保存在本机。未来奖励规则可依据这些记录计算积分。',
    'ledger.count': '{n} 笔记录',
    'ledger.emptyTitle': '尚无贡献记录',
    'ledger.emptyBody': '从机会列表选择一项并提交，就会出现在这里。',
    'ledger.browse': '浏览机会',
    'ledger.forOpportunity': '对应机会',
    'ledger.participant': '参与者',
    'ledger.proof': '证明链接',
    'toast.needIdentity': '请先设置显示名称，再提交贡献',
    'toast.saved': '贡献已记录！可在「我的贡献」查看',
    'footer.line1': 'Hawk Contribute MVP · 仅本机记录 · 积分／兑换尚未启用',
    'footer.line2': 'Future rewards hook: see src/types.ts & useContributions.ts',
    'meta.required': '*',
  },
  'zh-TW': {
    'brand.subtitle': '社群生態貢獻紀錄',
    'brand.slogan': '以自由為幟，生態守護',
    'brand.officialSite': 'Hawk 官網',

    'nav.opportunities': '機會',
    'nav.ledger': '我的貢獻',
    'nav.setIdentity': '設定身分',
    'hero.badge': 'Hawk Community',
    'hero.title': '探索貢獻機會',
    'hero.body':
      '透過活動、合作與內容貢獻，把你在 Hawk 生態中的參與留下來。本版 MVP 只做紀錄；未來積分與兌換會接在貢獻送出之後。',
    'filter.all': '全部',
    'filter.event': '活動',
    'filter.collab': '合作',
    'filter.content': '內容貢獻',
    'browse.count': '顯示 {n} 個機會',
    'type.event': '活動',
    'type.collab': '合作',
    'type.content': '內容貢獻',
    'status.open': '開放中',
    'status.closing-soon': '即將截止',
    'status.ongoing': '進行中',
    'card.deadline': '截止／節點',
    'card.join': '參與並提交貢獻',
    'identity.title': '本地身分',
    'identity.hint': '僅存於本機瀏覽器（localStorage），無需登入。',
    'identity.name': '顯示名稱',
    'identity.email': 'Email（選填）',
    'identity.namePlaceholder': '例如：HawkFlyer',
    'identity.emailPlaceholder': 'you@example.com',
    'identity.nameRequired': '請填寫顯示名稱',
    'identity.save': '儲存身分',
    'identity.clear': '清除',
    'identity.close': '關閉',
    'contribute.title': '提交貢獻',
    'contribute.as': '以以下身分參與',
    'contribute.fieldTitle': '貢獻標題',
    'contribute.fieldDesc': '簡短說明',
    'contribute.fieldProof': '證明連結（選填）',
    'contribute.titlePlaceholder': '例如：完成工作坊練習腳本',
    'contribute.descPlaceholder': '描述你做了什麼、產出或參與方式…',
    'contribute.required': '請填寫標題與簡短說明',
    'contribute.cancel': '取消',
    'contribute.submit': '送出紀錄',
    'ledger.title': '我的貢獻紀錄',
    'ledger.subtitle': '個人帳本保存在本機。未來獎勵規則可依這些紀錄計算積分。',
    'ledger.count': '{n} 筆紀錄',
    'ledger.emptyTitle': '尚無貢獻紀錄',
    'ledger.emptyBody': '從機會列表選擇一項並提交，就會出現在這裡。',
    'ledger.browse': '瀏覽機會',
    'ledger.forOpportunity': '對應機會',
    'ledger.participant': '參與者',
    'ledger.proof': '證明連結',
    'toast.needIdentity': '請先設定顯示名稱，再提交貢獻',
    'toast.saved': '貢獻已記錄！可在「我的貢獻」查看',
    'footer.line1': 'Hawk Contribute MVP · 僅本機紀錄 · 積分／兌換尚未啟用',
    'footer.line2': 'Future rewards hook: see src/types.ts & useContributions.ts',
    'meta.required': '*',
  },
}

export function detectDefaultLocale(): Locale {
  try {
    const nav = (typeof navigator !== 'undefined' ? navigator.language : '') || ''
    const lower = nav.toLowerCase()
    if (lower.startsWith('zh-cn') || lower === 'zh-hans' || lower.startsWith('zh-sg')) {
      return 'zh-CN'
    }
    if (
      lower.startsWith('zh-tw') ||
      lower.startsWith('zh-hk') ||
      lower.startsWith('zh-mo') ||
      lower === 'zh-hant' ||
      lower === 'zh'
    ) {
      return 'zh-TW'
    }
    if (lower.startsWith('en')) return 'en'
  } catch {
    /* ignore */
  }
  return 'zh-TW'
}

export function loadStoredLocale(): Locale | null {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (raw === 'en' || raw === 'zh-CN' || raw === 'zh-TW') return raw
  } catch {
    /* ignore */
  }
  return null
}

export function saveLocale(locale: Locale): void {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale)
}
