-- Regression test: old V1 share IDs resolve safely, unpublished tournaments remain private.
-- Execute on local disposable V2 schema only. Every change is rolled back.
begin;
alter table public.tournois add column partage_id uuid unique default gen_random_uuid();
alter table public.tournois add column est_public boolean not null default true;
create or replace function public.tourneo_public_compat_v2(p_id uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
 select public.tourneo_public_v2(t.id) from public.tournois t
 where (t.id=p_id or t.partage_id=p_id) and t.est_public is true limit 1;
$$;
revoke all on function public.tourneo_public_compat_v2(uuid) from public;
grant execute on function public.tourneo_public_compat_v2(uuid) to anon,authenticated;
insert into auth.users(id,aud,role) values ('60000000-0000-4000-8000-000000000001','authenticated','authenticated');
insert into public.tournois(id,user_id,nom,sport,partage_id,est_public,donnees) values
('61000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','Ancien lien public','petanque','62000000-0000-4000-8000-000000000001',true,
'{"equipes":[{"id":"SECRET-PLAYER-ID","nom":"Equipe A","email":"SECRET-CONTACT"},{"id":"B","nom":"Equipe B"}],"matchs":[],"termine":false}'),
('61000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000001','Tournoi privé','petanque','62000000-0000-4000-8000-000000000002',false,
'{"equipes":[],"matchs":[],"email":"SECRET-PRIVATE"}');
set local role anon;
do $$
declare legacy jsonb; canonical jsonb;
begin
 legacy := public.tourneo_public_compat_v2('62000000-0000-4000-8000-000000000001');
 canonical := public.tourneo_public_compat_v2('61000000-0000-4000-8000-000000000001');
 if legacy is null or canonical is null or legacy->>'id'<>'61000000-0000-4000-8000-000000000001'
 then raise exception 'Old or canonical share URL broken'; end if;
 if legacy::text like '%SECRET%' or canonical::text like '%SECRET%'
 then raise exception 'Private fields leaked from legacy link'; end if;
 if public.tourneo_public_compat_v2('62000000-0000-4000-8000-000000000002') is not null
 or public.tourneo_public_compat_v2('61000000-0000-4000-8000-000000000002') is not null
 then raise exception 'Private tournament exposed'; end if;
 if public.tourneo_public_compat_v2('62000000-0000-4000-8000-000000000003') is not null
 then raise exception 'Unknown share ID exposed'; end if;
end $$;
reset role;
select 'Legacy and canonical IDs, sanitized response, private and missing IDs: OK' as result;
rollback;
