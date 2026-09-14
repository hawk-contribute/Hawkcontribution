-- After a successful NFT claim, clear personal contribution-value progress
-- by advancing a per-user eligibility epoch. Feed posts are untouched.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS contribute_eligibility_reset_at timestamptz;

COMMENT ON COLUMN public.profiles.contribute_eligibility_reset_at IS
  'Only this user''s non-seeded contributions with created_at > reset_at count toward the next claim cycle. Set to now() after a successful NFT claim.';
