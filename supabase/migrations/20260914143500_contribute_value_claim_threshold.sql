-- Claim gate: contribution value sum + distinct category types
-- Settings (admin-editable)
ALTER TABLE public.reward_settings
  ADD COLUMN IF NOT EXISTS contribute_value_per_item integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS contribute_value_threshold integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS min_contribute_types integer NOT NULL DEFAULT 2;

ALTER TABLE public.reward_settings
  DROP CONSTRAINT IF EXISTS reward_settings_contribute_value_per_item_check;
ALTER TABLE public.reward_settings
  ADD CONSTRAINT reward_settings_contribute_value_per_item_check
  CHECK (contribute_value_per_item >= 1);

ALTER TABLE public.reward_settings
  DROP CONSTRAINT IF EXISTS reward_settings_contribute_value_threshold_check;
ALTER TABLE public.reward_settings
  ADD CONSTRAINT reward_settings_contribute_value_threshold_check
  CHECK (contribute_value_threshold >= 0);

ALTER TABLE public.reward_settings
  DROP CONSTRAINT IF EXISTS reward_settings_min_contribute_types_check;
ALTER TABLE public.reward_settings
  ADD CONSTRAINT reward_settings_min_contribute_types_check
  CHECK (min_contribute_types >= 1);

-- Durable per-contribution value (seeded = 0 so they never count)
ALTER TABLE public.contributions
  ADD COLUMN IF NOT EXISTS contribute_value integer;

UPDATE public.contributions
SET contribute_value = CASE
  WHEN seeded IS TRUE THEN 0
  ELSE COALESCE(
    (SELECT rs.contribute_value_per_item FROM public.reward_settings rs WHERE rs.id = 1),
    50
  )
END
WHERE contribute_value IS NULL;

ALTER TABLE public.contributions
  ALTER COLUMN contribute_value SET DEFAULT 50;

ALTER TABLE public.contributions
  ALTER COLUMN contribute_value SET NOT NULL;

ALTER TABLE public.contributions
  DROP CONSTRAINT IF EXISTS contributions_contribute_value_check;
ALTER TABLE public.contributions
  ADD CONSTRAINT contributions_contribute_value_check
  CHECK (contribute_value >= 0);

UPDATE public.contributions
SET contribute_value = 0
WHERE seeded IS TRUE AND contribute_value <> 0;
