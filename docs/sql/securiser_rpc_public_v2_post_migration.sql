-- POST-MIGRATION SECURITY GATE. Do not run on V1 or on the current V2 test project.
-- Requires full V2 installation on a restored V1 staging copy.
-- V2 public RPC currently returns a tournament by id without checking V1 est_public.
-- This migration protects direct PostgREST RPC calls as well as compatibility links.
begin;
do $$
begin
 if to_regclass('public.tournois') is null
 or not exists(select 1 from information_schema.columns
   where table_schema='public' and table_name='tournois' and column_name='est_public')
 or to_regprocedure('public.tourneo_public_v2(uuid)') is null
 or to_regprocedure('public.tourneo_public_v2_internal(uuid)') is not null
 then raise exception 'Expected V1+V2 staging schema missing or gate already installed';
 end if;
end $$;
alter function public.tourneo_public_v2(uuid) rename to tourneo_public_v2_internal;
revoke all on function public.tourneo_public_v2_internal(uuid) from public,anon,authenticated;
create function public.tourneo_public_v2(p_id uuid)
returns jsonb language sql stable security definer set search_path=''
as $$
 select public.tourneo_public_v2_internal(t.id)
 from public.tournois t where t.id=p_id and t.est_public is true limit 1;
$$;
revoke all on function public.tourneo_public_v2(uuid) from public;
grant execute on function public.tourneo_public_v2(uuid) to anon,authenticated;
-- The separate tourneo_public_compat_v2 RPC checks est_public for both canonical and legacy IDs.
commit;
