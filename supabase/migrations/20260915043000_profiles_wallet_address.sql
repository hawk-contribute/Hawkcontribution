-- Wallet signature login (Supabase Auth Web3 / SIWE): store verified address on profile.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS wallet_address text;

COMMENT ON COLUMN public.profiles.wallet_address IS
  'EVM wallet address (checksum or lower) from Supabase Auth Web3 / SIWE identity. Unique when set.';

CREATE UNIQUE INDEX IF NOT EXISTS profiles_wallet_address_unique
  ON public.profiles (lower(wallet_address))
  WHERE wallet_address IS NOT NULL AND length(trim(wallet_address)) > 0;

-- Existing RLS (select/insert/update own by auth.uid() = id) already covers this column.
