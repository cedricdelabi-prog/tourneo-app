-- POST-MIGRATION ONLY: run after V2's tourneo_public_v2(uuid) exists
-- and after legacy V1 columns partage_id and est_public have been preserved.
-- Return only sanitized V2 public data, never the raw V1 donnees JSON.
begin;
create or replace function public.tourneo_public_compat_v2(p_id uuid)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
 select public.tourneo_public_v2(t.id)
 from public.tournois t
 where (t.id=p_id or t.partage_id=p_id)
   and t.est_public is true
 limit 1;
$$;
revoke all on function public.tourneo_public_compat_v2(uuid) from public;
grant execute on function public.tourneo_public_compat_v2(uuid) to anon,authenticated;
commit;
