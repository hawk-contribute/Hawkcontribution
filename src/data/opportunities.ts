import type { Opportunity } from '../types'

/** Seeded Hawk sample opportunities — first open feels alive */
export const SEEDED_OPPORTUNITIES: Opportunity[] = [
  {
    id: 'opp-event-hawk-night',
    type: 'event',
    image: '/photos/event-meetup.jpg',
    title: {
      en: 'Hawk Night Taipei · Community Meetup',
      'zh-CN': 'Hawk Night 台北场・社群见面会',
      'zh-TW': 'Hawk Night 台北場・社群見面會',
    },
    summary: {
      en: 'Meet Hawk partners in person, share recent work, and spark collaborations. Bring a portfolio or a short pitch.',
      'zh-CN': '与 Hawk 伙伴面对面交流，分享近期创作与合作火花。欢迎带来作品或提案简报。',
      'zh-TW': '與 Hawk 夥伴面對面交流，分享近期創作與合作火花。歡迎帶來作品或提案簡報。',
    },
    host: {
      en: 'Hawk Community',
      'zh-CN': 'Hawk Community',
      'zh-TW': 'Hawk Community',
    },
    location: {
      en: 'Taipei · In person',
      'zh-CN': '台北・线下',
      'zh-TW': '台北・實體',
    },
    deadline: '2026-10-05',
    tags: {
      en: ['Meetup', 'Networking', 'Taipei'],
      'zh-CN': ['见面会', 'Networking', '台北'],
      'zh-TW': ['見面會', 'Networking', '台北'],
    },
    status: 'open',
  },
  {
    id: 'opp-event-workshop',
    type: 'event',
    image: '/photos/event-workshop.jpg',
    title: {
      en: 'Brand storytelling workshop: Speak like Hawk',
      'zh-CN': '品牌叙事工作坊：把故事讲得像 Hawk',
      'zh-TW': '品牌敘事工作坊：把故事講得像 Hawk',
    },
    summary: {
      en: 'A one-day workshop on brand voice, visual rhythm, and short-video scripts. Submit your workshop output to the contribution log.',
      'zh-CN': '一日工作坊，练习品牌语气、视觉节奏与短视频脚本。完成后可提交工作成果至贡献记录。',
      'zh-TW': '一日工作坊，練習品牌語氣、視覺節奏與短影音腳本。完成後可提交工作成果至貢獻紀錄。',
    },
    host: {
      en: 'Hawk Academy',
      'zh-CN': 'Hawk Academy',
      'zh-TW': 'Hawk Academy',
    },
    location: {
      en: 'Online · Zoom',
      'zh-CN': '线上 Zoom',
      'zh-TW': '線上 Zoom',
    },
    deadline: '2026-09-28',
    tags: {
      en: ['Workshop', 'Brand', 'Story'],
      'zh-CN': ['工作坊', '品牌', '叙事'],
      'zh-TW': ['工作坊', '品牌', '敘事'],
    },
    status: 'closing-soon',
  },
  {
    id: 'opp-collab-merch',
    type: 'collab',
    image: '/photos/collab-design.jpg',
    title: {
      en: 'Co-branded merch design call',
      'zh-CN': '联名周边设计征集',
      'zh-TW': '聯名周邊設計徵集',
    },
    summary: {
      en: 'Looking for illustrators / graphic designers to co-create next-season Hawk merch. Portfolio link required.',
      'zh-CN': '寻找插画／平面设计师，共同打造下一季 Hawk 联名周边。需附作品集链接。',
      'zh-TW': '尋找插畫／平面設計師，共同打造下一季 Hawk 聯名周邊。需附作品集連結。',
    },
    host: {
      en: 'Hawk Studio',
      'zh-CN': 'Hawk Studio',
      'zh-TW': 'Hawk Studio',
    },
    location: {
      en: 'Remote collab',
      'zh-CN': '远程协作',
      'zh-TW': '遠端協作',
    },
    deadline: '2026-10-20',
    tags: {
      en: ['Design', 'Collab', 'Merch'],
      'zh-CN': ['设计', '联名', '周边'],
      'zh-TW': ['設計', '聯名', '周邊'],
    },
    status: 'open',
  },
  {
    id: 'opp-collab-podcast',
    type: 'collab',
    image: '/photos/collab-podcast.jpg',
    title: {
      en: 'Hawk Talk guest / co-producer',
      'zh-CN': 'Hawk Talk 嘉宾／共同制作',
      'zh-TW': 'Hawk Talk 來賓／共同製作',
    },
    summary: {
      en: 'Recruiting guests or co-producers with takes on community and the creator economy. Pitch episode themes welcome.',
      'zh-CN': '招募对社群、创作经济有见解的嘉宾或共同制作人。可提案单元主题。',
      'zh-TW': '招募對社群、創作經濟有見解的來賓或共同製作人。可提案單元主題。',
    },
    host: {
      en: 'Hawk Media',
      'zh-CN': 'Hawk Media',
      'zh-TW': 'Hawk Media',
    },
    location: {
      en: 'Online / studio',
      'zh-CN': '线上／录音室',
      'zh-TW': '線上／錄音室',
    },
    deadline: '2026-11-01',
    tags: {
      en: ['Podcast', 'Content', 'Collab'],
      'zh-CN': ['Podcast', '内容', '合作'],
      'zh-TW': ['Podcast', '內容', '合作'],
    },
    status: 'open',
  },
  {
    id: 'opp-content-ugc',
    type: 'content',
    image: '/photos/content-ugc.jpg',
    title: {
      en: 'UGC short video: #HawkDaily challenge',
      'zh-CN': 'UGC 短视频：#HawkDaily 挑战',
      'zh-TW': 'UGC 短影音：#HawkDaily 挑戰',
    },
    summary: {
      en: 'Capture a 15–60s Hawk moment. Include a public post URL as proof when you submit.',
      'zh-CN': '用 15–60 秒短视频记录你的日常 Hawk 时刻。提交时请附公开帖文链接作为证明。',
      'zh-TW': '用 15–60 秒短影音記錄你的日常 Hawk 時刻。提交時請附公開貼文連結作為證明。',
    },
    host: {
      en: 'Hawk Social',
      'zh-CN': 'Hawk Social',
      'zh-TW': 'Hawk Social',
    },
    location: {
      en: 'Social platforms',
      'zh-CN': '社群平台',
      'zh-TW': '社群平台',
    },
    deadline: '2026-09-30',
    tags: {
      en: ['Short video', 'UGC', 'Challenge'],
      'zh-CN': ['短视频', 'UGC', '挑战'],
      'zh-TW': ['短影音', 'UGC', '挑戰'],
    },
    status: 'ongoing',
  },
  {
    id: 'opp-content-article',
    type: 'content',
    image: '/photos/content-article.jpg',
    title: {
      en: 'Long-form: Hawk ecosystem notes',
      'zh-CN': '深度文稿：Hawk 生态观察笔记',
      'zh-TW': '深度文稿：Hawk 生態觀察筆記',
    },
    summary: {
      en: 'Write an 800+ word observation or how-to on the Hawk brand / community. May be featured on the site or newsletter.',
      'zh-CN': '撰写一篇关于 Hawk 品牌／社群生态的观察或教学文（800 字以上），可刊登于官网或电子报。',
      'zh-TW': '撰寫一篇關於 Hawk 品牌／社群生態的觀察或教學文（800 字以上），可刊登於官網或電子報。',
    },
    host: {
      en: 'Hawk Editorial',
      'zh-CN': 'Hawk Editorial',
      'zh-TW': 'Hawk Editorial',
    },
    location: {
      en: 'Online submission',
      'zh-CN': '线上投稿',
      'zh-TW': '線上投稿',
    },
    deadline: '2026-10-15',
    tags: {
      en: ['Writing', 'Notes', 'Newsletter'],
      'zh-CN': ['写作', '观察', '电子报'],
      'zh-TW': ['寫作', '觀察', '電子報'],
    },
    status: 'open',
  },
]
