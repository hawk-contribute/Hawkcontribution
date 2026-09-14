-- Each NFT stores its own required_points (no null → global fallback).
-- Backfill from reward_settings.redeem_points, then enforce NOT NULL + CHECK.

UPDATE public.nft_catalog AS nc
SET
  required_points = GREATEST(
    1,
    COALESCE(
      nc.required_points,
      (SELECT rs.redeem_points FROM public.reward_settings rs WHERE rs.id = 1),
      10000
    )
  ),
  updated_at = now()
WHERE nc.required_points IS NULL OR nc.required_points < 1;

ALTER TABLE public.nft_catalog
  ALTER COLUMN required_points SET DEFAULT 10000;

ALTER TABLE public.nft_catalog
  ALTER COLUMN required_points SET NOT NULL;

ALTER TABLE public.nft_catalog
  DROP CONSTRAINT IF EXISTS nft_catalog_required_points_check;

ALTER TABLE public.nft_catalog
  ADD CONSTRAINT nft_catalog_required_points_check
  CHECK (required_points >= 1);

-- Public can read; only site admins can update (including required_points).
DROP POLICY IF EXISTS nft_catalog_update_admin ON public.nft_catalog;
CREATE POLICY nft_catalog_update_admin
  ON public.nft_catalog
  FOR UPDATE
  USING (public.is_site_admin())
  WITH CHECK (public.is_site_admin());

-- Keep select public-readable (idempotent recreate).
DROP POLICY IF EXISTS nft_catalog_select_all ON public.nft_catalog;
CREATE POLICY nft_catalog_select_all
  ON public.nft_catalog
  FOR SELECT
  USING (true);
