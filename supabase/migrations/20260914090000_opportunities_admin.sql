-- Editable opportunity "title pages" (browse cards). Public read; site admins write.

CREATE TABLE IF NOT EXISTS public.opportunities (
  id text PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('event', 'collab', 'content')),
  image_path text NOT NULL,
  title jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  host jsonb NOT NULL DEFAULT '{}'::jsonb,
  location jsonb NOT NULL DEFAULT '{}'::jsonb,
  deadline text NOT NULL DEFAULT '',
  tags jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closing-soon', 'ongoing')),
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS opportunities_active_sort_idx
  ON public.opportunities (active, sort_order);

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS opportunities_select_all ON public.opportunities;
CREATE POLICY opportunities_select_all
  ON public.opportunities
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS opportunities_insert_admin ON public.opportunities;
CREATE POLICY opportunities_insert_admin
  ON public.opportunities
  FOR INSERT
  WITH CHECK (public.is_site_admin());

DROP POLICY IF EXISTS opportunities_update_admin ON public.opportunities;
CREATE POLICY opportunities_update_admin
  ON public.opportunities
  FOR UPDATE
  USING (public.is_site_admin())
  WITH CHECK (public.is_site_admin());

DROP POLICY IF EXISTS opportunities_delete_admin ON public.opportunities;
CREATE POLICY opportunities_delete_admin
  ON public.opportunities
  FOR DELETE
  USING (public.is_site_admin());

GRANT SELECT ON public.opportunities TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.opportunities TO authenticated;

-- Seed from current hardcoded catalog (idempotent upsert).
INSERT INTO public.opportunities (
  id, type, image_path, title, summary, host, location, deadline, tags, status, sort_order, active
) VALUES
(
  'opp-event-hawk-night',
  'event',
  'photos/event-meetup.jpg',
  '{"en":"Hawk Night Taipei · Community Meetup","zh-CN":"Hawk Night 台北场・社群见面会","zh-TW":"Hawk Night 台北場・社群見面會"}'::jsonb,
  '{"en":"Meet Hawk partners in person, share recent work, and spark collaborations. Bring a portfolio or a short pitch.","zh-CN":"与 Hawk 伙伴面对面交流，分享近期创作与合作火花。欢迎带来作品或提案简报。","zh-TW":"與 Hawk 夥伴面對面交流，分享近期創作與合作火花。歡迎帶來作品或提案簡報。"}'::jsonb,
  '{"en":"Hawk Community","zh-CN":"Hawk Community","zh-TW":"Hawk Community"}'::jsonb,
  '{"en":"Taipei · In person","zh-CN":"台北・线下","zh-TW":"台北・實體"}'::jsonb,
  '2026-10-05',
  '{"en":["Meetup","Networking","Taipei"],"zh-CN":["见面会","Networking","台北"],"zh-TW":["見面會","Networking","台北"]}'::jsonb,
  'open',
  10,
  true
),
(
  'opp-event-workshop',
  'event',
  'photos/event-workshop.jpg',
  '{"en":"Brand storytelling workshop: Speak like Hawk","zh-CN":"品牌叙事工作坊：把故事讲得像 Hawk","zh-TW":"品牌敘事工作坊：把故事講得像 Hawk"}'::jsonb,
  '{"en":"A one-day workshop on brand voice, visual rhythm, and short-video scripts. Submit your workshop output to the contribution log.","zh-CN":"一日工作坊，练习品牌语气、视觉节奏与短视频脚本。完成后可提交工作成果至贡献记录。","zh-TW":"一日工作坊，練習品牌語氣、視覺節奏與短影音腳本。完成後可提交工作成果至貢獻紀錄。"}'::jsonb,
  '{"en":"Hawk Academy","zh-CN":"Hawk Academy","zh-TW":"Hawk Academy"}'::jsonb,
  '{"en":"Online · Zoom","zh-CN":"线上 Zoom","zh-TW":"線上 Zoom"}'::jsonb,
  '2026-09-28',
  '{"en":["Workshop","Brand","Story"],"zh-CN":["工作坊","品牌","叙事"],"zh-TW":["工作坊","品牌","敘事"]}'::jsonb,
  'closing-soon',
  20,
  true
),
(
  'opp-collab-merch',
  'collab',
  'photos/collab-design.jpg',
  '{"en":"Co-branded merch design call","zh-CN":"联名周边设计征集","zh-TW":"聯名周邊設計徵集"}'::jsonb,
  '{"en":"Looking for illustrators / graphic designers to co-create next-season Hawk merch. Portfolio link required.","zh-CN":"寻找插画／平面设计师，共同打造下一季 Hawk 联名周边。需附作品集链接。","zh-TW":"尋找插畫／平面設計師，共同打造下一季 Hawk 聯名周邊。需附作品集連結。"}'::jsonb,
  '{"en":"Hawk Studio","zh-CN":"Hawk Studio","zh-TW":"Hawk Studio"}'::jsonb,
  '{"en":"Remote collab","zh-CN":"远程协作","zh-TW":"遠端協作"}'::jsonb,
  '2026-10-20',
  '{"en":["Design","Collab","Merch"],"zh-CN":["设计","联名","周边"],"zh-TW":["設計","聯名","周邊"]}'::jsonb,
  'open',
  30,
  true
),
(
  'opp-collab-podcast',
  'collab',
  'photos/collab-podcast.jpg',
  '{"en":"Hawk Talk guest / co-producer","zh-CN":"Hawk Talk 嘉宾／共同制作","zh-TW":"Hawk Talk 來賓／共同製作"}'::jsonb,
  '{"en":"Recruiting guests or co-producers with takes on community and the creator economy. Pitch episode themes welcome.","zh-CN":"招募对社群、创作经济有见解的嘉宾或共同制作人。可提案单元主题。","zh-TW":"招募對社群、創作經濟有見解的來賓或共同製作人。可提案單元主題。"}'::jsonb,
  '{"en":"Hawk Media","zh-CN":"Hawk Media","zh-TW":"Hawk Media"}'::jsonb,
  '{"en":"Online / studio","zh-CN":"线上／录音室","zh-TW":"線上／錄音室"}'::jsonb,
  '2026-11-01',
  '{"en":["Podcast","Content","Collab"],"zh-CN":["Podcast","内容","合作"],"zh-TW":["Podcast","內容","合作"]}'::jsonb,
  'open',
  40,
  true
),
(
  'opp-content-ugc',
  'content',
  'photos/content-ugc.jpg',
  '{"en":"UGC short video: #HawkDaily challenge","zh-CN":"UGC 短视频：#HawkDaily 挑战","zh-TW":"UGC 短影音：#HawkDaily 挑戰"}'::jsonb,
  '{"en":"Capture a 15–60s Hawk moment. Include a public post URL as proof when you submit.","zh-CN":"用 15–60 秒短视频记录你的日常 Hawk 时刻。提交时请附公开帖文链接作为证明。","zh-TW":"用 15–60 秒短影音記錄你的日常 Hawk 時刻。提交時請附公開貼文連結作為證明。"}'::jsonb,
  '{"en":"Hawk Social","zh-CN":"Hawk Social","zh-TW":"Hawk Social"}'::jsonb,
  '{"en":"Social platforms","zh-CN":"社群平台","zh-TW":"社群平台"}'::jsonb,
  '2026-09-30',
  '{"en":["Short video","UGC","Challenge"],"zh-CN":["短视频","UGC","挑战"],"zh-TW":["短影音","UGC","挑戰"]}'::jsonb,
  'ongoing',
  50,
  true
),
(
  'opp-content-article',
  'content',
  'photos/content-article.jpg',
  '{"en":"Long-form: Hawk ecosystem notes","zh-CN":"深度文稿：Hawk 生态观察笔记","zh-TW":"深度文稿：Hawk 生態觀察筆記"}'::jsonb,
  '{"en":"Write an 800+ word observation or how-to on the Hawk brand / community. May be featured on the site or newsletter.","zh-CN":"撰写一篇关于 Hawk 品牌／社群生态的观察或教学文（800 字以上），可刊登于官网或电子报。","zh-TW":"撰寫一篇關於 Hawk 品牌／社群生態的觀察或教學文（800 字以上），可刊登於官網或電子報。"}'::jsonb,
  '{"en":"Hawk Editorial","zh-CN":"Hawk Editorial","zh-TW":"Hawk Editorial"}'::jsonb,
  '{"en":"Online submission","zh-CN":"线上投稿","zh-TW":"線上投稿"}'::jsonb,
  '2026-10-15',
  '{"en":["Writing","Notes","Newsletter"],"zh-CN":["写作","观察","电子报"],"zh-TW":["寫作","觀察","電子報"]}'::jsonb,
  'open',
  60,
  true
)
ON CONFLICT (id) DO UPDATE SET
  type = EXCLUDED.type,
  image_path = EXCLUDED.image_path,
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  host = EXCLUDED.host,
  location = EXCLUDED.location,
  deadline = EXCLUDED.deadline,
  tags = EXCLUDED.tags,
  status = EXCLUDED.status,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  updated_at = now();
