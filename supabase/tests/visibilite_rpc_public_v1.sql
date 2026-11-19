-- Regression: direct public RPC must respect migrated V1 visibility.
-- All schema and fixture changes are rolled back.
begin;
alter table public.tournois add column est_public boolean not null default true;
alter function public.tourneo_public_v2(uuid) rename to tourneo_public_v2_internal;
revoke all on function public.tourneo_public_v2_internal(uuid) from public,anon,authenticated;
create function public.tourneo_public_v2(p_id uuid) returns jsonb
language sql stable security definer set search_path=''
as $$ select public.tourneo_public_v2_internal(t.id) from public.tournois t
where t.id=p_id and t.est_public is true limit 1 $$;
revoke all on function public.tourneo_public_v2(uuid) from public;
grant execute on function public.tourneo_public_v2(uuid) to anon,authenticated;
insert into auth.users(id,aud,role) values('70000000-0000-4000-8000-000000000001','authenticated','authenticated');
insert into public.tournois(id,user_id,nom,sport,donnees,est_public) values
('71000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','Public','petanque','{"equipes":[],"matchs":[]}',true),
('71000000-0000-4000-8000-000000000002','70000000-0000-4000-8000-000000000001','Prive','petanque','{"equipes":[],"matchs":[]}',false);
set local role anon;
do $$ begin
if public.tourneo_public_v2('71000000-0000-4000-8000-000000000001') is null then raise exception 'Public tournament missing'; end if;
if public.tourneo_public_v2('71000000-0000-4000-8000-000000000002') is not null then raise exception 'Private tournament leaked'; end if;
if public.tourneo_public_v2('71000000-0000-4000-8000-000000000003') is not null then raise exception 'Unknown tournament leaked'; end if;
end $$;
reset role;
select 'Direct public RPC respects V1 visibility: OK' as result;
rollback;
