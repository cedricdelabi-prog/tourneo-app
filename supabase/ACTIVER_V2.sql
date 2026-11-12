-- BASE V2 VIERGE UNIQUEMENT. Vérifier le projet tourneo-v2-test (kmjfmjhdnokkaiolxiin).
-- Déjà appliqué le 12 novembre 2026 : ne pas relancer sur le projet existant.
begin;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default 'Joueur' check(char_length(trim(display_name)) between 1 and 100),
 player_code text not null unique default ('TRN-'||upper(replace(gen_random_uuid()::text,'-',''))),
 avatar_url text, favorite_color text default '#3B82F6',
 first_name text, last_name text, city text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.tournois (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 nom text not null check(char_length(trim(nom)) between 1 and 150),
 sport text not null default 'autre',
 donnees jsonb not null default '{}'::jsonb check(jsonb_typeof(donnees)='object'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index tournois_user_id on public.tournois(user_id);
create table public.player_results (
 id uuid primary key default gen_random_uuid(),
 tournament_id uuid not null references public.tournois(id) on delete cascade,
 profile_id uuid not null references public.profiles(id) on delete cascade,
 tournament_name text not null, sport text not null,
 placement integer not null check(placement between 1 and 256),
 points integer not null check(points between 0 and 100),
 created_at timestamptz not null default now(),
 unique(tournament_id,profile_id)
);
create index player_results_profile_id on public.player_results(profile_id);
alter table public.profiles enable row level security;
alter table public.tournois enable row level security;
alter table public.player_results enable row level security;
revoke all on public.profiles,public.tournois,public.player_results from anon,authenticated;
grant select,insert,update,delete on public.profiles,public.tournois to authenticated;
grant select on public.player_results to anon,authenticated;
grant insert,update,delete on public.player_results to authenticated;
create policy profiles_owner on public.profiles for all to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy tournois_owner on public.tournois for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy results_read on public.player_results for select to anon,authenticated using(true);
create policy results_owner_insert on public.player_results for insert to authenticated with check(exists(select 1 from public.tournois t where t.id=tournament_id and t.user_id=(select auth.uid())));
create policy results_owner_update on public.player_results for update to authenticated using(exists(select 1 from public.tournois t where t.id=tournament_id and t.user_id=(select auth.uid()))) with check(exists(select 1 from public.tournois t where t.id=tournament_id and t.user_id=(select auth.uid())));
create policy results_owner_delete on public.player_results for delete to authenticated using(exists(select 1 from public.tournois t where t.id=tournament_id and t.user_id=(select auth.uid())));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('tourneo-media','tourneo-media',false,5242880,array['image/jpeg','image/png','image/webp','image/gif']);
create policy media_owner_read on storage.objects for select to authenticated using(bucket_id='tourneo-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy media_owner_insert on storage.objects for insert to authenticated with check(bucket_id='tourneo-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy media_owner_update on storage.objects for update to authenticated using(bucket_id='tourneo-media' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='tourneo-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy media_owner_delete on storage.objects for delete to authenticated using(bucket_id='tourneo-media' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- TOURNEO V2 UNIQUEMENT : ouvrir le projet tourneo-v2-test avant exécution.
-- Ne jamais exécuter ce script sur la base de la V1.
-- L'ensemble est transactionnel : une erreur annule les changements du script.
do $$
begin
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='tournois' and column_name='id' and udt_name='uuid')
    or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='tournois' and column_name='user_id' and udt_name='uuid')
    or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='tournois' and column_name='donnees' and udt_name='jsonb')
    or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='player_code') then
    raise exception 'Schéma attendu absent. Ne pas modifier la V1 : vérifier le projet Supabase V2 et son schéma avant de continuer.';
  end if;
end $$;
-- 2026110901_inscriptions_v2.sql
-- Apply only to the dedicated Tourneo V2 project. No service-role key in the browser.
create table if not exists public.tourneo_inscriptions_config (
  tournoi_id uuid primary key references public.tournois(id) on delete cascade,
  ouvert boolean not null default false,
  capacite integer not null default 32 check (capacite between 2 and 256),
  echeance timestamptz,
  validation_manuelle boolean not null default true
);
create table if not exists public.tourneo_inscriptions (
  id uuid primary key default gen_random_uuid(),
  tournoi_id uuid not null references public.tournois(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  jeton uuid not null,
  nom text not null check (char_length(trim(nom)) between 1 and 100),
  type_participant text not null default 'individuel' check (type_participant in ('individuel','equipe')),
  joueurs text[] not null default '{}',
  statut text not null check (statut in ('en_attente','a_valider','accepte','refuse','annule')),
  present boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tournoi_id, jeton),
  check (cardinality(joueurs) <= 12)
);
create unique index if not exists tournoi_inscriptions_nom_actif on public.tourneo_inscriptions(tournoi_id, lower(trim(nom))) where statut not in ('refuse','annule');
create unique index if not exists tournoi_inscriptions_compte_actif on public.tourneo_inscriptions(tournoi_id,user_id) where user_id is not null and statut not in ('refuse','annule');
create index if not exists tournoi_inscriptions_file on public.tourneo_inscriptions(tournoi_id, created_at);
alter table public.tourneo_inscriptions_config enable row level security;
alter table public.tourneo_inscriptions enable row level security;
revoke all on public.tourneo_inscriptions_config, public.tourneo_inscriptions from anon, authenticated;
grant select on public.tourneo_inscriptions_config, public.tourneo_inscriptions to authenticated;
drop policy if exists inscriptions_config_owner on public.tourneo_inscriptions_config;
create policy inscriptions_config_owner on public.tourneo_inscriptions_config for select to authenticated using (exists(select 1 from public.tournois t where t.id = tournoi_id and t.user_id = auth.uid()));
drop policy if exists inscriptions_owner on public.tourneo_inscriptions;
create policy inscriptions_owner on public.tourneo_inscriptions for select to authenticated using (exists(select 1 from public.tournois t where t.id = tournoi_id and t.user_id = auth.uid()));

create or replace function public.tourneo_configurer_inscriptions(p_tournoi uuid, p_ouvert boolean, p_capacite integer, p_echeance timestamptz, p_validation boolean)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare t public.tournois;
begin
  select * into t from public.tournois where id=p_tournoi for update;
  if not found or t.user_id is distinct from auth.uid() or auth.uid() is null then raise exception 'Accès organisateur requis'; end if;
  if coalesce((t.donnees->>'cree')::boolean,false) and p_ouvert then raise exception 'Le tournoi a déjà démarré'; end if;
  if p_capacite < 2 or p_capacite > 256 then raise exception 'Capacité invalide'; end if;
  if p_ouvert and p_echeance is not null and p_echeance <= now() then raise exception 'Échéance passée'; end if;
  insert into public.tourneo_inscriptions_config(tournoi_id,ouvert,capacite,echeance,validation_manuelle) values(p_tournoi,p_ouvert,p_capacite,p_echeance,p_validation)
  on conflict(tournoi_id) do update set ouvert=excluded.ouvert, capacite=excluded.capacite, echeance=excluded.echeance, validation_manuelle=excluded.validation_manuelle;
end $$;

create or replace function public.tourneo_infos_inscriptions(p_tournoi uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare t public.tournois; c public.tourneo_inscriptions_config; places integer;
begin
  select * into t from public.tournois where id=p_tournoi;
  select * into c from public.tourneo_inscriptions_config where tournoi_id=p_tournoi;
  if t.id is null or c.tournoi_id is null then raise exception 'Inscriptions indisponibles'; end if;
  select count(*) into places from public.tourneo_inscriptions where tournoi_id=p_tournoi and statut in ('accepte','a_valider');
  return jsonb_build_object('nom',t.nom,'sport',t.sport,'ouvert',c.ouvert and not coalesce((t.donnees->>'cree')::boolean,false) and (c.echeance is null or c.echeance>now()),'capacite',c.capacite,'echeance',c.echeance,'places_restantes',greatest(0,c.capacite-places-jsonb_array_length(coalesce(t.donnees->'equipes','[]'::jsonb))),'validation_manuelle',c.validation_manuelle);
end $$;

create or replace function public.tourneo_inscrire(p_tournoi uuid, p_jeton uuid, p_nom text, p_type text, p_joueurs text[])
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare t public.tournois; c public.tourneo_inscriptions_config; r public.tourneo_inscriptions; places integer; etat text;
begin
  select * into t from public.tournois where id=p_tournoi for update;
  select * into c from public.tourneo_inscriptions_config where tournoi_id=p_tournoi;
  if t.id is null or c.tournoi_id is null then raise exception 'Inscriptions indisponibles'; end if;
  select * into r from public.tourneo_inscriptions where tournoi_id=p_tournoi and jeton=p_jeton;
  if found then return jsonb_build_object('id',r.id,'nom',r.nom,'statut',r.statut,'present',r.present); end if;
  if p_jeton is null or not c.ouvert or coalesce((t.donnees->>'cree')::boolean,false) or (c.echeance is not null and c.echeance <= now()) then raise exception 'Les inscriptions sont fermées'; end if;
  if p_nom is null or char_length(trim(p_nom)) not between 1 and 100 or p_type not in ('individuel','equipe') or p_type is null then raise exception 'Participant invalide'; end if;
  if cardinality(p_joueurs)>12 or exists(select 1 from unnest(p_joueurs) j where char_length(trim(j)) not between 1 and 100 or j is null) then raise exception 'Liste des joueurs invalide'; end if;
  if exists(select 1 from jsonb_array_elements(coalesce(t.donnees->'equipes','[]'::jsonb)) e where lower(trim(e->>'nom'))=lower(trim(p_nom))) then raise exception 'Ce nom est déjà inscrit'; end if;
  if (select count(*) from public.tourneo_inscriptions where tournoi_id=p_tournoi) >= 1024 then raise exception 'Le nombre maximal de demandes est atteint. Contactez l’organisateur'; end if;
  select count(*) into places from public.tourneo_inscriptions where tournoi_id=p_tournoi and statut in ('accepte','a_valider');
  places:=places+jsonb_array_length(coalesce(t.donnees->'equipes','[]'::jsonb));
  etat:=case when places>=c.capacite then 'en_attente' when c.validation_manuelle then 'a_valider' else 'accepte' end;
  insert into public.tourneo_inscriptions(tournoi_id,user_id,jeton,nom,type_participant,joueurs,statut) values(p_tournoi,auth.uid(),p_jeton,trim(p_nom),p_type,coalesce(p_joueurs,'{}'),etat) returning * into r;
  return jsonb_build_object('id',r.id,'nom',r.nom,'statut',r.statut,'present',r.present);
exception when unique_violation then raise exception 'Ce nom est déjà inscrit';
end $$;

create or replace function public.tourneo_mon_inscription(p_tournoi uuid, p_jeton uuid, p_annuler boolean default false)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare t public.tournois; r public.tourneo_inscriptions;
begin
  select * into t from public.tournois where id=p_tournoi for update;
  select * into r from public.tourneo_inscriptions where tournoi_id=p_tournoi and jeton=p_jeton;
  if not found then return null; end if;
  if p_annuler then
    if coalesce((t.donnees->>'cree')::boolean,false) then raise exception 'Contactez l’organisateur après le démarrage'; end if;
    update public.tourneo_inscriptions set statut='annule',present=false where id=r.id returning * into r;
  end if;
  return jsonb_build_object('id',r.id,'nom',r.nom,'statut',r.statut,'present',r.present);
end $$;

create or replace function public.tourneo_traiter_inscription(p_tournoi uuid, p_id uuid, p_statut text, p_present boolean)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare t public.tournois; c public.tourneo_inscriptions_config; places integer; r public.tourneo_inscriptions;
begin
  select * into t from public.tournois where id=p_tournoi for update;
  if not found or t.user_id is distinct from auth.uid() or auth.uid() is null then raise exception 'Accès organisateur requis'; end if;
  select * into r from public.tourneo_inscriptions where id=p_id and tournoi_id=p_tournoi;
  if not found then raise exception 'Inscription introuvable'; end if;
  if p_statut not in ('accepte','refuse','en_attente','a_valider') or p_statut is null then raise exception 'Statut invalide'; end if;
  if coalesce((t.donnees->>'cree')::boolean,false) and p_statut<>r.statut then raise exception 'Les inscriptions sont closes'; end if;
  if p_statut in ('accepte','a_valider') and r.statut not in ('accepte','a_valider') then
    select * into c from public.tourneo_inscriptions_config where tournoi_id=p_tournoi;
    select count(*) into places from public.tourneo_inscriptions where tournoi_id=p_tournoi and statut in ('accepte','a_valider');
    if places+jsonb_array_length(coalesce(t.donnees->'equipes','[]'::jsonb))>=c.capacite then raise exception 'Capacité atteinte'; end if;
  end if;
  update public.tourneo_inscriptions set statut=p_statut,present=coalesce(p_present,false) and p_statut='accepte' where id=p_id;
end $$;

create or replace function public.tourneo_demarrer(p_tournoi uuid, p_donnees jsonb, p_nom text, p_sport text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare t public.tournois;
begin
  select * into t from public.tournois where id=p_tournoi for update;
  if not found or t.user_id is distinct from auth.uid() or auth.uid() is null then raise exception 'Accès organisateur requis'; end if;
  if coalesce((t.donnees->>'cree')::boolean,false) then raise exception 'Le tournoi a déjà démarré'; end if;
  if jsonb_typeof(p_donnees->'equipes') is distinct from 'array' or jsonb_typeof(p_donnees->'matchs') is distinct from 'array' or char_length(trim(p_nom)) not between 1 and 150 then raise exception 'Configuration du tournoi invalide'; end if;
  if jsonb_array_length(p_donnees->'equipes') not between 2 and 256 then raise exception 'Nombre de participants invalide'; end if;
  if exists(select 1 from public.tourneo_inscriptions r where r.tournoi_id=p_tournoi and r.statut='accepte' and not exists(select 1 from jsonb_array_elements(p_donnees->'equipes') e where e->>'id'='inscription:'||r.id::text)) then raise exception 'Nouvelles inscriptions acceptées : rechargez avant de démarrer'; end if;
  update public.tourneo_inscriptions_config set ouvert=false where tournoi_id=p_tournoi;
  update public.tournois set nom=p_nom,sport=p_sport,donnees=p_donnees||jsonb_build_object('cree',true) where id=p_tournoi;
  return p_tournoi;
end $$;

revoke all on function public.tourneo_configurer_inscriptions(uuid,boolean,integer,timestamptz,boolean), public.tourneo_infos_inscriptions(uuid), public.tourneo_inscrire(uuid,uuid,text,text,text[]), public.tourneo_mon_inscription(uuid,uuid,boolean), public.tourneo_traiter_inscription(uuid,uuid,text,boolean), public.tourneo_demarrer(uuid,jsonb,text,text) from public;
grant execute on function public.tourneo_infos_inscriptions(uuid), public.tourneo_inscrire(uuid,uuid,text,text,text[]), public.tourneo_mon_inscription(uuid,uuid,boolean) to anon,authenticated;
grant execute on function public.tourneo_configurer_inscriptions(uuid,boolean,integer,timestamptz,boolean), public.tourneo_traiter_inscription(uuid,uuid,text,boolean), public.tourneo_demarrer(uuid,jsonb,text,text) to authenticated;

-- 2026110902_evenements_v2.sql
create table if not exists public.tourneo_evenements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  nom text not null check (char_length(trim(nom)) between 1 and 100),
  created_at timestamptz not null default now()
);
create table if not exists public.tourneo_evenement_tournois (
  evenement_id uuid not null references public.tourneo_evenements(id) on delete cascade,
  tournoi_id uuid not null references public.tournois(id) on delete cascade,
  primary key(evenement_id,tournoi_id)
);
alter table public.tourneo_evenements enable row level security;
alter table public.tourneo_evenement_tournois enable row level security;
revoke all on public.tourneo_evenements,public.tourneo_evenement_tournois from anon;
grant select,insert,update,delete on public.tourneo_evenements,public.tourneo_evenement_tournois to authenticated;
drop policy if exists evenements_owner on public.tourneo_evenements;
create policy evenements_owner on public.tourneo_evenements for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists evenement_tournois_owner on public.tourneo_evenement_tournois;
create policy evenement_tournois_owner on public.tourneo_evenement_tournois for all to authenticated
using(exists(select 1 from public.tourneo_evenements e where e.id=evenement_id and e.user_id=auth.uid()))
with check(exists(select 1 from public.tourneo_evenements e where e.id=evenement_id and e.user_id=auth.uid()) and exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=auth.uid()));

-- 2026110903_arbitrage_v2.sql
create table if not exists public.tourneo_arbitres (
  tournoi_id uuid not null references public.tournois(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key(tournoi_id,user_id)
);
create table if not exists public.tourneo_scores_proposes (
  tournoi_id uuid not null references public.tournois(id) on delete cascade,
  match_id integer not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  score1 integer not null check(score1 between 0 and 1000000),
  score2 integer not null check(score2 between 0 and 1000000),
  statut text not null default 'propose' check(statut in ('propose','importe','ecarte')),
  updated_at timestamptz not null default now(),
  primary key(tournoi_id,match_id,user_id)
);
alter table public.tourneo_arbitres enable row level security;
alter table public.tourneo_scores_proposes enable row level security;
revoke all on public.tourneo_arbitres,public.tourneo_scores_proposes from anon,authenticated;
grant select,delete on public.tourneo_arbitres to authenticated;
grant select,update on public.tourneo_scores_proposes to authenticated;
drop policy if exists arbitres_lecture on public.tourneo_arbitres;
create policy arbitres_lecture on public.tourneo_arbitres for select to authenticated using(user_id=auth.uid() or exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=auth.uid()));
drop policy if exists arbitres_retrait on public.tourneo_arbitres;
create policy arbitres_retrait on public.tourneo_arbitres for delete to authenticated using(exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=auth.uid()));
drop policy if exists propositions_lecture on public.tourneo_scores_proposes;
create policy propositions_lecture on public.tourneo_scores_proposes for select to authenticated using(user_id=auth.uid() or exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=auth.uid()));
drop policy if exists propositions_traitement on public.tourneo_scores_proposes;
create policy propositions_traitement on public.tourneo_scores_proposes for update to authenticated using(exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=auth.uid())) with check(exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=auth.uid()));

create or replace function public.tourneo_ajouter_arbitre(p_tournoi uuid,p_code text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare t public.tournois; joueur uuid;
begin
  select * into t from public.tournois where id=p_tournoi for update;
  if not found or auth.uid() is null or t.user_id is distinct from auth.uid() then raise exception 'Accès organisateur requis';end if;
  select id into joueur from public.profiles where player_code=upper(trim(p_code));
  if joueur is null then raise exception 'Code joueur introuvable';end if;
  insert into public.tourneo_arbitres(tournoi_id,user_id)values(p_tournoi,joueur)on conflict do nothing;
end $$;
create or replace function public.tourneo_proposer_score(p_tournoi uuid,p_match integer,p_score1 integer,p_score2 integer)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare t public.tournois;
begin
  select * into t from public.tournois where id=p_tournoi for update;
  if not found or auth.uid() is null or not exists(select 1 from public.tourneo_arbitres where tournoi_id=p_tournoi and user_id=auth.uid())then raise exception 'Accès arbitre requis';end if;
  if not exists(select 1 from jsonb_array_elements(t.donnees->'matchs')m where (m->>'id')::integer=p_match)then raise exception 'Match introuvable';end if;
  if coalesce(t.donnees->'matchsValides','[]'::jsonb)@>jsonb_build_array(p_match)then raise exception 'Le résultat est déjà validé';end if;
  if t.donnees->'optionsV2'->>'score'='sets' then raise exception 'Les manches doivent être saisies et validées par l’organisateur';end if;
  if p_score1<0 or p_score2<0 or p_score1>1000000 or p_score2>1000000 then raise exception 'Score invalide';end if;
  insert into public.tourneo_scores_proposes(tournoi_id,match_id,user_id,score1,score2)values(p_tournoi,p_match,auth.uid(),p_score1,p_score2)
  on conflict(tournoi_id,match_id,user_id)do update set score1=excluded.score1,score2=excluded.score2,statut='propose',updated_at=now();
end $$;
create or replace function public.tourneo_mes_arbitrages()
returns jsonb language sql security definer set search_path=public,pg_temp as $$
select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'nom',t.nom,'equipes',t.donnees->'equipes','matchs',t.donnees->'matchs','valides',t.donnees->'matchsValides','score',t.donnees->'optionsV2'->>'score')),'[]'::jsonb)
from public.tournois t join public.tourneo_arbitres a on a.tournoi_id=t.id where a.user_id=auth.uid() and auth.uid() is not null;
$$;
revoke all on function public.tourneo_ajouter_arbitre(uuid,text),public.tourneo_proposer_score(uuid,integer,integer,integer),public.tourneo_mes_arbitrages()from public;
grant execute on function public.tourneo_ajouter_arbitre(uuid,text),public.tourneo_proposer_score(uuid,integer,integer,integer),public.tourneo_mes_arbitrages()to authenticated;

-- 2026110904_partage_v2.sql
-- Explicit public projection: no account owner, authentication data or registration token.
create or replace function public.tourneo_public_v2(p_id uuid)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
select jsonb_build_object('id',t.id,'nom',t.nom,'sport',t.sport,'donnees',jsonb_build_object(
  'equipes',coalesce((select jsonb_agg(jsonb_build_object('id',e->'id','profilId',e->'profilId','nom',e->'nom','emoji',e->'emoji','couleur',e->'couleur','photo',e->'photo'))from jsonb_array_elements(coalesce(t.donnees->'equipes','[]'::jsonb))e),'[]'::jsonb),
  'matchs',coalesce(t.donnees->'matchs','[]'::jsonb),'formatTournoi',t.donnees->'formatTournoi','optionsV2',t.donnees->'optionsV2',
  'matchsValides',t.donnees->'matchsValides','podiumPhotoUrl',t.donnees->'podiumPhotoUrl','podiumFinal',t.donnees->'podiumFinal','termine',t.donnees->'termine'
))from public.tournois t where t.id=p_id;
$$;
revoke all on function public.tourneo_public_v2(uuid)from public;
grant execute on function public.tourneo_public_v2(uuid)to anon,authenticated;

-- Public identity lookup deliberately excludes real names, city and photos.
create or replace function public.tourneo_profils_publics(p_code text default null, p_ids uuid[] default null)
returns table(id uuid,display_name text,player_code text,avatar_url text,favorite_color text)
language sql stable security definer set search_path=public,pg_temp as $$
 select p.id,p.display_name,p.player_code,null::text,p.favorite_color from public.profiles p
 where (p_code is not null and p.player_code=upper(trim(p_code)))
 or (auth.uid() is not null and cardinality(p_ids)<=256 and p.id=any(p_ids))
 limit 256;
$$;
revoke all on function public.tourneo_profils_publics(text,uuid[]) from public;
grant execute on function public.tourneo_profils_publics(text,uuid[]) to authenticated;

create or replace function public.tourneo_public_v2(p_id uuid)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
select jsonb_build_object('id',t.id,'nom',t.nom,'sport',t.sport,'donnees',jsonb_build_object(
  'equipes',coalesce((select jsonb_agg(jsonb_build_object('id',e->'id','profilId',e->'profilId','nom',e->'nom','emoji',e->'emoji','couleur',e->'couleur'))from jsonb_array_elements(coalesce(t.donnees->'equipes','[]'::jsonb))e),'[]'::jsonb),
  'matchs',coalesce(t.donnees->'matchs','[]'::jsonb),'formatTournoi',t.donnees->'formatTournoi','optionsV2',t.donnees->'optionsV2',
  'matchsValides',t.donnees->'matchsValides','termine',t.donnees->'termine'
))from public.tournois t where t.id=p_id and t.user_id=auth.uid();
$$;

revoke execute on function public.tourneo_public_v2(uuid) from anon;

create schema if not exists tourneo_private;
revoke all on schema tourneo_private from public,anon;
grant usage on schema tourneo_private to authenticated;
create table public.tourneo_preferences (
 user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
 notifications_sportives boolean not null default true,
 communications_tourneo boolean not null default false,
 consentement_promotion_at timestamptz,
 texte_agrandi boolean not null default false,
 animations_reduites boolean not null default false,
 updated_at timestamptz not null default now()
);
create table public.tourneo_notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 tournoi_id uuid references public.tournois(id) on delete cascade,
 type text not null check(type in ('inscription','statut_inscription','arbitrage','score')),
 message text not null,
 lu boolean not null default false,
 created_at timestamptz not null default now()
);
create index tourneo_notifications_user_date on public.tourneo_notifications(user_id,created_at desc);
create index tourneo_notifications_tournoi on public.tourneo_notifications(tournoi_id);
create table public.tourneo_evaluations (
 tournoi_id uuid not null references public.tournois(id) on delete cascade,
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 note integer not null check(note between 1 and 5),
 commentaire text not null default '' check(char_length(commentaire)<=1000),
 created_at timestamptz not null default now(),
 primary key(tournoi_id,user_id)
);
create index tourneo_evaluations_user on public.tourneo_evaluations(user_id);
alter table public.tourneo_preferences enable row level security;
alter table public.tourneo_notifications enable row level security;
alter table public.tourneo_evaluations enable row level security;
revoke all on public.tourneo_preferences,public.tourneo_notifications,public.tourneo_evaluations from anon,authenticated;
grant select,insert,update on public.tourneo_preferences to authenticated;
grant select,delete on public.tourneo_notifications to authenticated;
grant update(lu) on public.tourneo_notifications to authenticated;
grant select,insert,delete on public.tourneo_evaluations to authenticated;
grant update(note,commentaire) on public.tourneo_evaluations to authenticated;
create policy preferences_owner on public.tourneo_preferences for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy notifications_owner on public.tourneo_notifications for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create function tourneo_private.peut_evaluer(p_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select auth.uid() is not null and exists(
 select 1 from public.tournois t where t.id=p_id and t.user_id<>auth.uid()
 and t.donnees->>'termine'='true'
 and (
 exists(select 1 from public.player_results r where r.tournament_id=t.id and r.profile_id=auth.uid())
 or exists(select 1 from public.tourneo_inscriptions i where i.tournoi_id=t.id and i.user_id=auth.uid() and i.statut='accepte')
 or exists(select 1 from jsonb_array_elements(coalesce(t.donnees->'equipes','[]'::jsonb)) e where coalesce(e->>'profilId',e->>'id')=auth.uid()::text)
 ));
$$;
revoke all on function tourneo_private.peut_evaluer(uuid) from public,anon;
grant execute on function tourneo_private.peut_evaluer(uuid) to authenticated;
create policy evaluations_read on public.tourneo_evaluations for select to authenticated using(user_id=(select auth.uid()) or exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=(select auth.uid())));
create policy evaluations_insert on public.tourneo_evaluations for insert to authenticated with check(user_id=(select auth.uid()) and tourneo_private.peut_evaluer(tournoi_id));
create policy evaluations_update on public.tourneo_evaluations for update to authenticated using(user_id=(select auth.uid()) and tourneo_private.peut_evaluer(tournoi_id)) with check(user_id=(select auth.uid()) and tourneo_private.peut_evaluer(tournoi_id));
create policy evaluations_delete on public.tourneo_evaluations for delete to authenticated using(user_id=(select auth.uid()));
create function tourneo_private.horodater_preferences()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if TG_OP='INSERT' then
 new.consentement_promotion_at:=case when new.communications_tourneo then now() else null end;
 elsif new.communications_tourneo is distinct from old.communications_tourneo then
 new.consentement_promotion_at:=case when new.communications_tourneo then now() else null end;
 else new.consentement_promotion_at:=old.consentement_promotion_at;
 end if;
 new.updated_at:=now();
 return new;
end $$;
revoke all on function tourneo_private.horodater_preferences() from public,anon,authenticated;
create trigger preferences_timestamp before insert or update on public.tourneo_preferences for each row execute function tourneo_private.horodater_preferences();
create function tourneo_private.notifier()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare destinataire uuid; genre text; contenu text;
begin
 if TG_TABLE_NAME='tourneo_arbitres' then
 destinataire:=new.user_id; genre:='arbitrage'; contenu:='Un organisateur vous a attribué un tournoi à arbitrer.';
 elsif TG_TABLE_NAME='tourneo_scores_proposes' then
 select user_id into destinataire from public.tournois where id=new.tournoi_id;
 genre:='score'; contenu:='Un arbitre a proposé un résultat à valider.';
 elsif TG_TABLE_NAME='tourneo_inscriptions' and TG_OP='INSERT' then
 select user_id into destinataire from public.tournois where id=new.tournoi_id;
 genre:='inscription'; contenu:='Une nouvelle demande d’inscription est arrivée.';
 elsif TG_TABLE_NAME='tourneo_inscriptions' and TG_OP='UPDATE' then
 if new.statut is not distinct from old.statut then return new;end if;
 destinataire:=new.user_id; genre:='statut_inscription'; contenu:='Le statut de votre inscription a changé : '||new.statut||'.';
 end if;
 if destinataire is not null and coalesce((select notifications_sportives from public.tourneo_preferences where user_id=destinataire),true) then
 insert into public.tourneo_notifications(user_id,tournoi_id,type,message) values(destinataire,new.tournoi_id,genre,contenu);
 end if;
 return new;
end $$;
revoke all on function tourneo_private.notifier() from public,anon,authenticated;
create trigger notification_inscription after insert or update of statut on public.tourneo_inscriptions for each row execute function tourneo_private.notifier();
create trigger notification_arbitrage after insert on public.tourneo_arbitres for each row execute function tourneo_private.notifier();
create trigger notification_score after insert or update on public.tourneo_scores_proposes for each row execute function tourneo_private.notifier();

create index tourneo_arbitres_user on public.tourneo_arbitres(user_id);
create index tourneo_evenement_tournoi on public.tourneo_evenement_tournois(tournoi_id);
create index tourneo_evenements_user on public.tourneo_evenements(user_id);
create index tourneo_inscriptions_user on public.tourneo_inscriptions(user_id);
create index tourneo_scores_user on public.tourneo_scores_proposes(user_id);
alter policy inscriptions_config_owner on public.tourneo_inscriptions_config using(exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=(select auth.uid())));
alter policy inscriptions_owner on public.tourneo_inscriptions using(exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=(select auth.uid())));
alter policy evenements_owner on public.tourneo_evenements using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
alter policy evenement_tournois_owner on public.tourneo_evenement_tournois using(exists(select 1 from public.tourneo_evenements e where e.id=evenement_id and e.user_id=(select auth.uid()))) with check(exists(select 1 from public.tourneo_evenements e where e.id=evenement_id and e.user_id=(select auth.uid())) and exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=(select auth.uid())));
alter policy arbitres_lecture on public.tourneo_arbitres using(user_id=(select auth.uid()) or exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=(select auth.uid())));
alter policy arbitres_retrait on public.tourneo_arbitres using(exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=(select auth.uid())));
alter policy propositions_lecture on public.tourneo_scores_proposes using(user_id=(select auth.uid()) or exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=(select auth.uid())));
alter policy propositions_traitement on public.tourneo_scores_proposes using(exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=(select auth.uid()))) with check(exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=(select auth.uid())));

create or replace function tourneo_private.reference_publique(p_tournoi uuid,p_ref text)
returns text language sql immutable strict security invoker set search_path=pg_catalog as $$
 select case when left(p_ref,4)='duo:' then 'duo:'||(select string_agg('p-'||md5(p_tournoi::text||':'||x),'|' order by n) from unnest(string_to_array(substr(p_ref,5),'|')) with ordinality as refs(x,n))
 else 'p-'||md5(p_tournoi::text||':'||p_ref) end;
$$;
revoke all on function tourneo_private.reference_publique(uuid,text) from public,anon,authenticated;
-- Approuvé explicitement par l'utilisateur le 12 novembre 2026.
-- Le lien expose noms/pseudos, sport, matchs, scores et classement.
-- Aucune photo, profilId, donnée de contact ou jeton d'inscription.
create or replace function public.tourneo_public_v2(p_id uuid)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
select jsonb_build_object('id',t.id,'nom',t.nom,'sport',t.sport,'donnees',jsonb_build_object(
  'equipes',coalesce((select jsonb_agg(jsonb_build_object('id',tourneo_private.reference_publique(t.id,e->>'id'),'nom',e->'nom','emoji',e->'emoji','couleur',e->'couleur'))from jsonb_array_elements(coalesce(t.donnees->'equipes','[]'::jsonb))e),'[]'::jsonb),
  'matchs',coalesce((select jsonb_agg(jsonb_build_object('id',m->'id','journee',m->'journee','equipe1Id',tourneo_private.reference_publique(t.id,m->>'equipe1Id'),'equipe2Id',tourneo_private.reference_publique(t.id,m->>'equipe2Id'),'score1',m->'score1','score2',m->'score2','ordre',m->'ordre','branche',m->'branche','joueurs1Ids',(select coalesce(jsonb_agg(tourneo_private.reference_publique(t.id,x)),'[]'::jsonb) from jsonb_array_elements_text(coalesce(m->'joueurs1Ids','[]'::jsonb)) as refs(x)),'joueurs2Ids',(select coalesce(jsonb_agg(tourneo_private.reference_publique(t.id,x)),'[]'::jsonb) from jsonb_array_elements_text(coalesce(m->'joueurs2Ids','[]'::jsonb)) as refs(x)),'manches',coalesce((select jsonb_agg(jsonb_build_object('score1',s->'score1','score2',s->'score2')) from jsonb_array_elements(coalesce(m->'manches','[]'::jsonb)) s),'[]'::jsonb))) from jsonb_array_elements(coalesce(t.donnees->'matchs','[]'::jsonb)) m),'[]'::jsonb),'formatTournoi',t.donnees->'formatTournoi','optionsV2',(select coalesce(jsonb_object_agg(key,value),'{}'::jsonb)||jsonb_build_object('exemptions',(select coalesce(jsonb_agg(jsonb_build_object('ronde',ex->'ronde','id',tourneo_private.reference_publique(t.id,ex->>'id'))),'[]'::jsonb) from jsonb_array_elements(coalesce(t.donnees->'optionsV2'->'exemptions','[]'::jsonb)) ex)) from jsonb_each(coalesce(t.donnees->'optionsV2','{}'::jsonb)) where key=any(array['tirage','mode','score','setsGagnants','cibleManche','ecartManche','plafondManche','cibleDecisive','pointsVictoire','pointsNul','pointsDefaite','rondes','terrains','duree','repos','depart'])),
  'matchsValides',t.donnees->'matchsValides','termine',t.donnees->'termine'
))from public.tournois t where t.id=p_id;
$$;

grant execute on function public.tourneo_public_v2(uuid) to anon;

-- Public rankings use the sanitized tournament projection, not account identifiers.
revoke select on public.player_results from anon;
alter policy results_read on public.player_results to authenticated;

create table public.tourneo_groupes (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 nom text not null check(char_length(trim(nom)) between 1 and 100),
 type text not null default 'club' check(type in ('club','accompagnement')),
 created_at timestamptz not null default now()
);
create index tourneo_groupes_owner on public.tourneo_groupes(user_id);
create table public.tourneo_groupe_membres (
 groupe_id uuid not null references public.tourneo_groupes(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('accompagnateur','lecture')),
 primary key(groupe_id,user_id)
);
create index tourneo_groupe_membres_user on public.tourneo_groupe_membres(user_id);
create table public.tourneo_groupe_participants (
 id uuid primary key default gen_random_uuid(),
 groupe_id uuid not null references public.tourneo_groupes(id) on delete cascade,
 nom text not null check(char_length(trim(nom)) between 1 and 100),
 created_at timestamptz not null default now()
);
create unique index tourneo_groupe_nom_unique on public.tourneo_groupe_participants(groupe_id,lower(trim(nom)));
alter table public.tourneo_groupes enable row level security;
alter table public.tourneo_groupe_membres enable row level security;
alter table public.tourneo_groupe_participants enable row level security;
revoke all on public.tourneo_groupes,public.tourneo_groupe_membres,public.tourneo_groupe_participants from anon,authenticated;
grant select,insert,delete on public.tourneo_groupes to authenticated;
grant update(nom) on public.tourneo_groupes to authenticated;
grant select,delete on public.tourneo_groupe_membres to authenticated;
grant select,insert,delete on public.tourneo_groupe_participants to authenticated;
grant update(nom) on public.tourneo_groupe_participants to authenticated;
create function tourneo_private.role_groupe(p_groupe uuid)
returns text language sql stable security definer set search_path=public,pg_temp as $$
 select case when g.user_id=auth.uid() then 'proprietaire' else (select m.role from public.tourneo_groupe_membres m where m.groupe_id=g.id and m.user_id=auth.uid()) end
 from public.tourneo_groupes g where g.id=p_groupe and auth.uid() is not null;
$$;
revoke all on function tourneo_private.role_groupe(uuid) from public,anon;
grant execute on function tourneo_private.role_groupe(uuid) to authenticated;
create policy groupe_read on public.tourneo_groupes for select to authenticated using(tourneo_private.role_groupe(id) is not null);
create policy groupe_insert on public.tourneo_groupes for insert to authenticated with check(user_id=(select auth.uid()));
create policy groupe_update on public.tourneo_groupes for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy groupe_delete on public.tourneo_groupes for delete to authenticated using(user_id=(select auth.uid()));
create policy groupe_membres_read on public.tourneo_groupe_membres for select to authenticated using(user_id=(select auth.uid()) or tourneo_private.role_groupe(groupe_id)='proprietaire');
create policy groupe_membres_delete on public.tourneo_groupe_membres for delete to authenticated using(user_id=(select auth.uid()) or tourneo_private.role_groupe(groupe_id)='proprietaire');
create policy groupe_participants_read on public.tourneo_groupe_participants for select to authenticated using(tourneo_private.role_groupe(groupe_id) is not null);
create policy groupe_participants_insert on public.tourneo_groupe_participants for insert to authenticated with check(tourneo_private.role_groupe(groupe_id) in ('proprietaire','accompagnateur'));
create policy groupe_participants_update on public.tourneo_groupe_participants for update to authenticated using(tourneo_private.role_groupe(groupe_id) in ('proprietaire','accompagnateur')) with check(tourneo_private.role_groupe(groupe_id) in ('proprietaire','accompagnateur'));
create policy groupe_participants_delete on public.tourneo_groupe_participants for delete to authenticated using(tourneo_private.role_groupe(groupe_id) in ('proprietaire','accompagnateur'));
create function tourneo_private.verifier_quota_groupe()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or tourneo_private.role_groupe(new.groupe_id) not in ('proprietaire','accompagnateur') then raise exception 'Accès accompagnateur requis';end if;
 perform 1 from public.tourneo_groupes where id=new.groupe_id for update;
 if (select count(*) from public.tourneo_groupe_participants where groupe_id=new.groupe_id)>=256 then raise exception 'Le groupe est limité à 256 participants';end if;
 return new;
end $$;
revoke all on function tourneo_private.verifier_quota_groupe() from public,anon,authenticated;
create trigger groupe_quota before insert on public.tourneo_groupe_participants for each row execute function tourneo_private.verifier_quota_groupe();
create function public.tourneo_partager_groupe(p_groupe uuid,p_code text,p_role text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare membre uuid;
begin
 if auth.uid() is null or tourneo_private.role_groupe(p_groupe) is distinct from 'proprietaire' then raise exception 'Accès propriétaire requis';end if;
 if p_role is null or p_role not in ('accompagnateur','lecture') then raise exception 'Rôle invalide';end if;
 select id into membre from public.profiles where player_code=upper(trim(p_code));
 if membre is null then raise exception 'Code joueur introuvable';end if;
 if membre=auth.uid() then raise exception 'Vous êtes déjà propriétaire';end if;
 insert into public.tourneo_groupe_membres(groupe_id,user_id,role)values(p_groupe,membre,p_role)
 on conflict(groupe_id,user_id)do update set role=excluded.role;
end $$;
revoke all on function public.tourneo_partager_groupe(uuid,text,text) from public,anon;
grant execute on function public.tourneo_partager_groupe(uuid,text,text) to authenticated;

alter policy groupe_read on public.tourneo_groupes using(user_id=(select auth.uid()) or tourneo_private.role_groupe(id) is not null);
create or replace function tourneo_private.verifier_quota_groupe()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or coalesce(tourneo_private.role_groupe(new.groupe_id),'') not in ('proprietaire','accompagnateur') then raise exception 'Accès accompagnateur requis';end if;
 perform 1 from public.tourneo_groupes where id=new.groupe_id for update;
 if (select count(*) from public.tourneo_groupe_participants where groupe_id=new.groupe_id)>=256 then raise exception 'Le groupe est limité à 256 participants';end if;
 return new;
end $$;


alter table public.tournois add column termine_at timestamptz, add column photos_expirent_at timestamptz;
create function tourneo_private.dater_photos_tournoi()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if TG_OP='INSERT' then new.termine_at:=null;new.photos_expirent_at:=null;
 else new.termine_at:=old.termine_at;new.photos_expirent_at:=old.photos_expirent_at;end if;
 if new.termine_at is null and new.donnees->>'termine'='true' then
  new.termine_at:=now();
  new.photos_expirent_at:=now()+case when new.donnees->'optionsV2'->>'mode'='expert' then interval '90 days' else interval '15 days' end;
 end if;
 new.updated_at:=now();
 return new;
end $$;
revoke all on function tourneo_private.dater_photos_tournoi() from public,anon,authenticated;
create trigger date_conservation_photos before insert or update on public.tournois for each row execute function tourneo_private.dater_photos_tournoi();
create function public.tourneo_duree_photo(p_tournoi uuid)
returns integer language sql stable security invoker set search_path=public,pg_temp as $$
 select case when photos_expirent_at is null then 3600 else greatest(0,least(3600,floor(extract(epoch from photos_expirent_at-now()))::integer))end
 from public.tournois where id=p_tournoi and user_id=auth.uid();
$$;
revoke all on function public.tourneo_duree_photo(uuid) from public,anon;
grant execute on function public.tourneo_duree_photo(uuid) to authenticated;
alter policy media_owner_read on storage.objects using(
 bucket_id='tourneo-media' and (storage.foldername(name))[1]=(select auth.uid())::text
 and ((storage.foldername(name))[2] is distinct from 'tournois' or exists(select 1 from public.tournois t where t.id::text=(storage.foldername(name))[3] and t.user_id=(select auth.uid()) and (t.photos_expirent_at is null or t.photos_expirent_at>now())))
);
create table public.tourneo_jobs_photos (
 token uuid primary key default gen_random_uuid(),
 expires_at timestamptz not null default(now()+interval '10 minutes')
);
alter table public.tourneo_jobs_photos enable row level security;
revoke all on public.tourneo_jobs_photos from public,anon,authenticated;
grant select,insert,delete on public.tourneo_jobs_photos to service_role;
create function public.tourneo_consomme_job_photo(p_token uuid)
returns boolean language sql security invoker set search_path=public,pg_temp as $$
 with consomme as(delete from public.tourneo_jobs_photos where token=p_token and expires_at>now() returning token)
 select exists(select 1 from consomme);
$$;
create function public.tourneo_photos_a_supprimer()
returns table(name text) language sql stable security invoker set search_path=public,pg_temp as $$
 select o.name from storage.objects o
 left join public.tournois t on t.id::text=split_part(o.name,'/',3) and t.user_id::text=split_part(o.name,'/',1)
 where o.bucket_id='tourneo-media' and split_part(o.name,'/',2)='tournois'
 and ((t.id is not null and t.photos_expirent_at<=now()) or(t.id is null and o.created_at<now()-interval '1 day'))
 order by o.created_at,o.name limit 100;
$$;
create function public.tourneo_nettoyer_photos_inline()
returns void language sql security invoker set search_path=public,pg_temp as $$
 update public.tournois set donnees=(donnees-'podiumPhotoUrl')||
 case when jsonb_typeof(donnees->'podiumFinal')='array' then jsonb_build_object('podiumFinal',(select coalesce(jsonb_agg(e-'photo'),'[]'::jsonb) from jsonb_array_elements(donnees->'podiumFinal')e)) else '{}'::jsonb end
 where photos_expirent_at<=now() and (donnees?'podiumPhotoUrl' or exists(select 1 from jsonb_array_elements(case when jsonb_typeof(donnees->'podiumFinal')='array' then donnees->'podiumFinal' else '[]'::jsonb end)e where e?'photo'));
$$;
revoke all on function public.tourneo_consomme_job_photo(uuid),public.tourneo_photos_a_supprimer(),public.tourneo_nettoyer_photos_inline() from public,anon,authenticated;
grant execute on function public.tourneo_consomme_job_photo(uuid),public.tourneo_photos_a_supprimer(),public.tourneo_nettoyer_photos_inline() to service_role;
grant select,update on public.tournois to service_role;

create extension if not exists pg_cron;
create extension if not exists pg_net;
create function tourneo_private.planifier_purge_photos()
returns bigint language plpgsql security definer set search_path=public,pg_temp as $$
declare jeton uuid; requete bigint;
begin
 delete from public.tourneo_jobs_photos where expires_at<=now();
 insert into public.tourneo_jobs_photos default values returning token into jeton;
 select net.http_post(
  url:='https://kmjfmjhdnokkaiolxiin.supabase.co/functions/v1/purge-photos-v2',
  headers:='{"Content-Type":"application/json"}'::jsonb,
  body:=jsonb_build_object('token',jeton),
  timeout_milliseconds:=60000
 )into requete;
 return requete;
end $$;
revoke all on function tourneo_private.planifier_purge_photos() from public,anon,authenticated;
select cron.schedule('tourneo-v2-purge-photos','17 * * * *','select tourneo_private.planifier_purge_photos();');

create or replace function tourneo_private.dater_photos_tournoi()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if TG_OP='INSERT' then new.termine_at:=null;new.photos_expirent_at:=null;
 else new.termine_at:=old.termine_at;new.photos_expirent_at:=old.photos_expirent_at;end if;
 if new.termine_at is null and new.donnees->>'termine'='true' then
  new.termine_at:=now();
  new.photos_expirent_at:=now()+case when new.donnees->'optionsV2'->>'mode'='expert' then interval '90 days' else interval '15 days' end;
 end if;
 if new.photos_expirent_at<=now() then
  new.donnees:=(new.donnees-'podiumPhotoUrl')||
  case when jsonb_typeof(new.donnees->'podiumFinal')='array' then
   jsonb_build_object('podiumFinal',(select coalesce(jsonb_agg(e-'photo'),'[]'::jsonb) from jsonb_array_elements(new.donnees->'podiumFinal')e))
  else '{}'::jsonb end;
 end if;
 new.updated_at:=now();
 return new;
end $$;

-- V2 only. In-app calls do not imply push delivery or that a phone received anything.
create table public.tourneo_appels (
 id uuid primary key default gen_random_uuid(),
 tournoi_id uuid not null references public.tournois(id) on delete cascade,
 match_id integer not null check(match_id > 0),
 user_id uuid not null references auth.users(id) on delete cascade,
 organisateur_id uuid not null references auth.users(id) on delete cascade,
 message text not null check(char_length(message) <= 500),
 lu boolean not null default false,
 created_at timestamptz not null default now(),
 unique(tournoi_id,match_id,user_id)
);
create index tournoi_appels_user_date on public.tourneo_appels(user_id,created_at desc);
create index tournoi_appels_organisateur_date on public.tourneo_appels(organisateur_id,created_at desc);
alter table public.tourneo_appels enable row level security;
revoke all on public.tourneo_appels from public,anon,authenticated;
grant select on public.tourneo_appels to authenticated;
grant update(lu) on public.tourneo_appels to authenticated;
create policy appels_read on public.tourneo_appels for select to authenticated using(
 user_id=(select auth.uid()) or exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=(select auth.uid()))
);
create policy appels_mark_read on public.tourneo_appels for update to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

-- Needs definer privileges to read private opt-outs and insert recipient-owned rows.
-- Always authenticates the organizer, verifies ownership and derives recipients from the match.
create function tourneo_private.appel_match(p_tournoi uuid,p_match integer,p_envoyer boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.tournois; m jsonb; e jsonb; j text; cote text; ids text[]:='{}';
 destinataire uuid; appel public.tourneo_appels; etat text; permis boolean; termine boolean;
 resultat jsonb:='[]'::jsonb; deja boolean; total integer;
begin
 if auth.uid() is null then raise exception 'Accès organisateur requis';end if;
 if p_envoyer then select * into t from public.tournois where id=p_tournoi for update;
 else select * into t from public.tournois where id=p_tournoi;end if;
 if t.id is null or t.user_id is distinct from auth.uid() then raise exception 'Accès organisateur requis';end if;
 select x into m from jsonb_array_elements(coalesce(t.donnees->'matchs','[]'::jsonb)) x where x->>'id'=p_match::text limit 1;
 if p_match is null or p_match<1 or m is null then raise exception 'Rencontre introuvable';end if;
 termine:=coalesce(t.donnees->'matchsValides','[]'::jsonb) @> jsonb_build_array(p_match)
   or (coalesce(m->>'score1','') ~ '^[0-9]+$' and coalesce(m->>'score2','') ~ '^[0-9]+$');
 foreach cote in array array['1','2'] loop
   if jsonb_typeof(m->('joueurs'||cote||'Ids'))='array' and jsonb_array_length(m->('joueurs'||cote||'Ids'))>0 then
     ids:=ids||array(select jsonb_array_elements_text(m->('joueurs'||cote||'Ids')));
   elsif left(m->>('equipe'||cote||'Id'),4)='duo:' then
     ids:=ids||string_to_array(substr(m->>('equipe'||cote||'Id'),5),'|');
   else ids:=array_append(ids,m->>('equipe'||cote||'Id'));end if;
 end loop;
 select count(*) into total from public.tourneo_appels where organisateur_id=auth.uid() and created_at>now()-interval '5 minutes';
 for j in select distinct x from unnest(ids) x where x is not null loop
   select x into e from jsonb_array_elements(coalesce(t.donnees->'equipes','[]'::jsonb)) x where x->>'id'=j limit 1;
   select p.id into destinataire from public.profiles p where p.id::text=coalesce(e->>'profilId',e->>'id');
   permis:=coalesce((select notifications_sportives from public.tourneo_preferences where user_id=destinataire),true);
   select * into appel from public.tourneo_appels where tournoi_id=p_tournoi and match_id=p_match and user_id=destinataire;
   if destinataire is null then etat:='sans_profil';
   elsif appel.id is not null then etat:=case when appel.lu then 'lu' else 'depose' end;
   elsif not permis then etat:='desactive';
   elsif termine then etat:='match_termine';
   elsif total>=300 then etat:='temporise';
   else
     etat:='disponible';
     if p_envoyer then
       insert into public.tourneo_appels(tournoi_id,match_id,user_id,organisateur_id,message)
       values(p_tournoi,p_match,destinataire,t.user_id,'L’organisateur vous appelle pour le match '||p_match::text||' du tournoi « '||left(t.nom,120)||' ». Consultez la rencontre pour votre terrain et prévenez l’organisateur de votre présence.')
       on conflict(tournoi_id,match_id,user_id) do nothing;
       select * into appel from public.tourneo_appels where tournoi_id=p_tournoi and match_id=p_match and user_id=destinataire;
       etat:=case when appel.lu then 'lu' else 'depose' end;
       total:=total+1;
     end if;
   end if;
   resultat:=resultat||jsonb_build_array(jsonb_build_object('participant_id',j,'nom',coalesce(e->>'nom','Participant'),'statut',etat,'created_at',appel.created_at));
 end loop;
 return jsonb_build_object('match_id',p_match,'participants',resultat);
end $$;
revoke all on function tourneo_private.appel_match(uuid,integer,boolean) from public,anon;
grant execute on function tourneo_private.appel_match(uuid,integer,boolean) to authenticated;
create function public.tourneo_appel_match(p_tournoi uuid,p_match integer,p_envoyer boolean default false)
returns jsonb language sql security invoker set search_path='' as $$
 select tourneo_private.appel_match(p_tournoi,p_match,p_envoyer);
$$;
revoke all on function public.tourneo_appel_match(uuid,integer,boolean) from public,anon;
grant execute on function public.tourneo_appel_match(uuid,integer,boolean) to authenticated;

-- V2 : partager uniquement le terrain de jeu, sans ajouter de donnée personnelle.
create or replace function public.tourneo_public_v2(p_id uuid)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
select jsonb_build_object('id',t.id,'nom',t.nom,'sport',t.sport,'donnees',jsonb_build_object(
  'equipes',coalesce((select jsonb_agg(jsonb_build_object('id',tourneo_private.reference_publique(t.id,e->>'id'),'nom',e->'nom','emoji',e->'emoji','couleur',e->'couleur'))from jsonb_array_elements(coalesce(t.donnees->'equipes','[]'::jsonb))e),'[]'::jsonb),
  'matchs',coalesce((select jsonb_agg(jsonb_build_object('id',m->'id','journee',m->'journee','equipe1Id',tourneo_private.reference_publique(t.id,m->>'equipe1Id'),'equipe2Id',tourneo_private.reference_publique(t.id,m->>'equipe2Id'),'score1',m->'score1','score2',m->'score2','ordre',m->'ordre','terrain',m->'terrain','branche',m->'branche','joueurs1Ids',(select coalesce(jsonb_agg(tourneo_private.reference_publique(t.id,x)),'[]'::jsonb) from jsonb_array_elements_text(coalesce(m->'joueurs1Ids','[]'::jsonb)) as refs(x)),'joueurs2Ids',(select coalesce(jsonb_agg(tourneo_private.reference_publique(t.id,x)),'[]'::jsonb) from jsonb_array_elements_text(coalesce(m->'joueurs2Ids','[]'::jsonb)) as refs(x)),'manches',coalesce((select jsonb_agg(jsonb_build_object('score1',s->'score1','score2',s->'score2')) from jsonb_array_elements(coalesce(m->'manches','[]'::jsonb)) s),'[]'::jsonb))) from jsonb_array_elements(coalesce(t.donnees->'matchs','[]'::jsonb)) m),'[]'::jsonb),'formatTournoi',t.donnees->'formatTournoi','optionsV2',(select coalesce(jsonb_object_agg(key,value),'{}'::jsonb)||jsonb_build_object('exemptions',(select coalesce(jsonb_agg(jsonb_build_object('ronde',ex->'ronde','id',tourneo_private.reference_publique(t.id,ex->>'id'))),'[]'::jsonb) from jsonb_array_elements(coalesce(t.donnees->'optionsV2'->'exemptions','[]'::jsonb)) ex)) from jsonb_each(coalesce(t.donnees->'optionsV2','{}'::jsonb)) where key=any(array['tirage','mode','score','setsGagnants','cibleManche','ecartManche','plafondManche','cibleDecisive','pointsVictoire','pointsNul','pointsDefaite','rondes','terrains','duree','repos','depart'])),
  'matchsValides',t.donnees->'matchsValides','termine',t.donnees->'termine'
))from public.tournois t where t.id=p_id;
$$;

grant execute on function public.tourneo_public_v2(uuid) to anon;

-- Révision monotone : les sauvegardes utilisent une condition atomique sur la base lue.
alter table public.tournois add column revision bigint not null default 0 check (revision >= 0);
create or replace function tourneo_private.reviser_tournoi()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 new.revision:=case when TG_OP='INSERT' then 0 else old.revision+1 end;
 return new;
end $$;
create trigger revision_tournoi before insert or update on public.tournois for each row execute function tourneo_private.reviser_tournoi();

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

commit;
