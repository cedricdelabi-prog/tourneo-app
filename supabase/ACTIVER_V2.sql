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

commit;
