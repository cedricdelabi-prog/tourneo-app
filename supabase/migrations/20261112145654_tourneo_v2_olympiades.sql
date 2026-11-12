create table public.tourneo_olympiades (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 nom text not null check(char_length(trim(nom)) between 1 and 100),
 donnees jsonb not null check(jsonb_typeof(donnees)='object' and octet_length(donnees::text)<=1000000),
 partage boolean not null default false,
 revision bigint not null default 0 check(revision>=0),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index olympiades_owner on public.tourneo_olympiades(user_id);
alter table public.tourneo_olympiades enable row level security;
revoke all on public.tourneo_olympiades from anon,authenticated;
grant select,insert,update,delete on public.tourneo_olympiades to authenticated;
create policy olympiades_owner on public.tourneo_olympiades for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create trigger revision_olympiade before insert or update on public.tourneo_olympiades for each row execute function tourneo_private.reviser_tournoi();
create or replace function tourneo_private.olympiade_publique(p_id uuid)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('version',1,'nom',o.nom,'equipes',coalesce((select jsonb_agg(jsonb_build_object('id',tourneo_private.reference_publique(o.id,e->>'id'),'nom',e->'nom','joueurs','[]'::jsonb)) from jsonb_array_elements(coalesce(o.donnees->'equipes','[]'::jsonb)) e),'[]'::jsonb),
 'epreuves',coalesce((select jsonb_agg(jsonb_build_object('id',tourneo_private.reference_publique(o.id,e->>'id'),'nom',e->'nom','unite',e->'unite','sens',e->'sens','validee',e->'validee','mesures',coalesce((select jsonb_object_agg(tourneo_private.reference_publique(o.id,t->>'id'),e->'mesures'->(t->>'id')) from jsonb_array_elements(coalesce(o.donnees->'equipes','[]'::jsonb)) t),'{}'::jsonb))) from jsonb_array_elements(coalesce(o.donnees->'epreuves','[]'::jsonb)) e where e->>'validee'='true'),'[]'::jsonb)) from public.tourneo_olympiades o where o.id=p_id and o.partage=true;
$$;
revoke all on function tourneo_private.olympiade_publique(uuid) from public;
grant usage on schema tourneo_private to anon,authenticated;
grant execute on function tourneo_private.olympiade_publique(uuid) to anon,authenticated;
create or replace function public.tourneo_olympiade_publique(p_id uuid)
returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$ select tourneo_private.olympiade_publique(p_id); $$;
revoke all on function public.tourneo_olympiade_publique(uuid) from public;
grant execute on function public.tourneo_olympiade_publique(uuid) to anon,authenticated;
