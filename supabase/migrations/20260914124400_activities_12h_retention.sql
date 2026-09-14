-- Activity marquee / activities table retention: 24h → 12h
CREATE OR REPLACE FUNCTION public.cleanup_old_activities()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  n integer;
begin
  delete from public.activities
  where created_at < (now() - interval '12 hours');
  get diagnostics n = row_count;
  return n;
end;
$function$;
