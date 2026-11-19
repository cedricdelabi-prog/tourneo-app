-- TOURNEO V2 : PHASE 9, SYNCHRONISATION ET OLYMPIADES.
-- UNIQUEMENT SUR COPIE RESTAUREE V1 EN STAGING, après phases 1 à 8.
-- IMPORTANT: ne pas appliquer sur la production V1 ou le projet V2 déjà configuré.
-- Confirmation manuelle explicite sur connexion de staging UNIQUEMENT :
-- select set_config('tourneo.v1_copy_verified','true',false);
begin;
do $$
begin
 if current_setting('tourneo.v1_copy_verified',true) is distinct from 'true'
 then raise exception 'STAGING STOP: confirmation de la copie restauree absente'; end if;
 if to_regclass('public.tournois') is null
 or to_regclass('public.profiles') is null
 or to_regclass('public.tourneo_scores_proposes') is null
 or to_regclass('public.tourneo_groupes') is null
 or to_regprocedure('public.tourneo_proposer_manches(uuid,integer,jsonb)') is null
 or to_regprocedure('public.tourneo_profils_publics(text,uuid[])') is null
 or to_regprocedure('tourneo_private.reference_publique(uuid,text)') is null
 or not exists(select 1 from information_schema.columns where
   table_schema='public' and table_name='tournois' and column_name='revision')
 or not exists(select 1 from information_schema.columns where
   table_schema='public' and table_name='tournois' and column_name='partage_id')
 then raise exception 'STAGING STOP: phases 1 a 8 incomplètes'; end if;
 if (select count(*) from auth.users)=0 or (select count(*) from public.tournois)=0
 or exists(select 1 from public.tournois where partage_id is null)
 or not exists(select 1 from pg_trigger where
   tgrelid='auth.users'::regclass and tgname='on_auth_user_created_tourneo'
   and not tgisinternal)
 then raise exception 'STAGING STOP: identites et anciens liens V1 non proteges'; end if;
 if to_regclass('public.tourneo_olympiades') is not null
 or to_regprocedure('tourneo_private.reviser_tournoi()') is not null
 or to_regprocedure('public.tourneo_olympiade_publique(uuid)') is not null
 or exists(select 1 from pg_trigger where
  tgrelid='public.tournois'::regclass and tgname='revision_tournoi')
 then raise exception 'STAGING STOP: phase 9 deja installee ou partielle'; end if;
end $$;

-- La colonne revision existe deja depuis la phase 1. Eviter de la recreer.
-- Installation du trigger monotone de la V2 sans ecriture des lignes V1.
create or replace function tourneo_private.reviser_tournoi()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 new.revision:=case when TG_OP='INSERT' then 0 else old.revision+1 end;
 return new;
end $$;
create trigger revision_tournoi before insert or update on public.tournois for each row execute function tourneo_private.reviser_tournoi();

-- Olympiades, RLS proprietaire et projection anonyme assainie.
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
-- Le schéma interne ne reçoit aucun droit supplémentaire pour anon.
-- La projection interne ne peut être appelée que par le wrapper contrôlé.
revoke execute on function tourneo_private.olympiade_publique(uuid) from anon,authenticated;
create or replace function public.tourneo_olympiade_publique(p_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$ select tourneo_private.olympiade_publique(p_id); $$;
revoke all on function public.tourneo_olympiade_publique(uuid) from public;
grant execute on function public.tourneo_olympiade_publique(uuid) to anon,authenticated;
commit;
