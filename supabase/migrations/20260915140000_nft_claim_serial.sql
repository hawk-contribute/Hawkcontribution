-- Global monotonic claim serial (領取序號) for off-chain NFT vouchers.
-- Rule: one sequence across all users and NFT types; first successful claim is 1.
-- Existing rows stay NULL (UI shows —). Serials are assigned only on INSERT
-- and cannot be set or changed by the client.

CREATE SEQUENCE IF NOT EXISTS public.nft_claim_serial_seq
  AS bigint
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

COMMENT ON SEQUENCE public.nft_claim_serial_seq IS
  'Monotonic serial for nft_claims.claim_serial (global across users and NFT types).';

ALTER TABLE public.nft_claims
  ADD COLUMN IF NOT EXISTS claim_serial bigint;

COMMENT ON COLUMN public.nft_claims.claim_serial IS
  'Global monotonic claim serial (領取序號). Assigned on insert from nft_claim_serial_seq. Null on legacy claims.';

CREATE UNIQUE INDEX IF NOT EXISTS nft_claims_claim_serial_uidx
  ON public.nft_claims (claim_serial)
  WHERE claim_serial IS NOT NULL;

CREATE OR REPLACE FUNCTION public.assign_nft_claim_serial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Always assign from the sequence; ignore any client-supplied value.
    NEW.claim_serial := nextval('public.nft_claim_serial_seq');
  ELSIF TG_OP = 'UPDATE' THEN
    -- Serial is immutable once written (including keeping legacy NULL).
    NEW.claim_serial := OLD.claim_serial;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS nft_claims_assign_serial ON public.nft_claims;
CREATE TRIGGER nft_claims_assign_serial
  BEFORE INSERT OR UPDATE ON public.nft_claims
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_nft_claim_serial();

REVOKE ALL ON FUNCTION public.assign_nft_claim_serial() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assign_nft_claim_serial() FROM anon, authenticated;
