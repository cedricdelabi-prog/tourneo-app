-- TOURNEO V2 PHASE 15 : PRISE EN COMPTE DES EQUIPES INSCRITES.
-- UNIQUEMENT COPIE V1 RESTAUREE SUR STAGING ISOLE APRES PHASES 1 A 14.
-- Ne pas appliquer à V1 production, ni à la base V2 test existante.
-- Confirmation manuelle explicite sur la connexion staging restaurée :
-- select set_config('tourneo.v1_copy_verified','true',false);
begin;
do $$
begin
 if current_setting('tourneo.v1_copy_verified',true) is distinct from 'true'
 then raise exception 'STAGING STOP: copie V1 restauree non explicitement confirmee'; end if;
 if to_regclass('public.tournois') is null
 or to_regclass('public.tourneo_inscriptions') is null
 or to_regclass('public.tourneo_inscriptions_config') is null
 or to_regclass('public.tourneo_album_config') is null
 or to_regclass('public.tourneo_groupes') is null
 or to_regprocedure('public.tourneo_demarrer(uuid,jsonb,text,text)') is null
 or to_regprocedure('public.tourneo_public_compat_v2(uuid)') is null
 or to_regprocedure('tourneo_private.projection_planning_v2_marqueur()') is null
 then raise exception 'STAGING STOP: phases 1 a 14 manquantes'; end if;
 if (select count(*) from auth.users)=0
 or (select count(*) from public.tournois)=0
 or exists(select 1 from public.tournois where partage_id is null)
 or not exists(select 1 from pg_trigger
   where tgrelid='auth.users'::regclass and tgname='on_auth_user_created_tourneo'
   and not tgisinternal)
 then raise exception 'STAGING STOP: données V1 ou liens historiques incomplets'; end if;
 if to_regprocedure('tourneo_private.equipes_inscrites_marqueur()') is not null
 then raise exception 'STAGING STOP: phase 15 déjà installée'; end if;
end $$;

-- Marqueur de migration non exposé aux clients.
create function tourneo_private.equipes_inscrites_marqueur()
returns boolean language sql stable set search_path='' as $$select true$$;
revoke all on function tourneo_private.equipes_inscrites_marqueur() from public,anon,authenticated;

-- Le remplacement conserve les tournois V1 inchangés à l'installation.
-- Seul l'organisateur peut démarrer; chaque inscription acceptée doit figurer
-- parmi les équipes, les profils individuels ou les membres d'équipe.
create or replace function public.tourneo_demarrer(p_tournoi uuid, p_donnees jsonb, p_nom text, p_sport text)
returns uuid language plpgsql security definer set search_path='' as $$
declare t public.tournois;
begin
  select * into t from public.tournois where id=p_tournoi for update;
  if not found or t.user_id is distinct from auth.uid() or auth.uid() is null then raise exception 'Accès organisateur requis'; end if;
  if coalesce((t.donnees->>'cree')::boolean,false) then raise exception 'Le tournoi a déjà démarré'; end if;
  if jsonb_typeof(p_donnees->'equipes') is distinct from 'array' or jsonb_typeof(p_donnees->'matchs') is distinct from 'array' or char_length(trim(p_nom)) not between 1 and 150 then raise exception 'Configuration du tournoi invalide'; end if;
  if jsonb_array_length(p_donnees->'equipes') not between 2 and 256 then raise exception 'Nombre de participants invalide'; end if;
  if exists(select 1 from public.tourneo_inscriptions r where r.tournoi_id=p_tournoi and r.statut='accepte' and not exists(select 1 from jsonb_array_elements(p_donnees->'equipes') e where e->>'id'='inscription:'||r.id::text
    or (r.type_participant='individuel' and r.user_id is not null and e->>'profilId'=r.user_id::text)
    or exists(select 1 from jsonb_array_elements(case when jsonb_typeof(e->'membresOrigine')='array' then e->'membresOrigine' else '[]'::jsonb end) m
      where m->>'id'='inscription:'||r.id::text or (r.type_participant='individuel' and r.user_id is not null and m->>'profilId'=r.user_id::text)))) then raise exception 'Nouvelles inscriptions acceptées : rechargez avant de démarrer'; end if;
  update public.tourneo_inscriptions_config set ouvert=false where tournoi_id=p_tournoi;
  update public.tournois set nom=p_nom,sport=p_sport,donnees=p_donnees||jsonb_build_object('cree',true) where id=p_tournoi;
  return p_tournoi;
end $$;

revoke all on function public.tourneo_demarrer(uuid,jsonb,text,text) from public,anon;
grant execute on function public.tourneo_demarrer(uuid,jsonb,text,text) to authenticated;

do $$
begin
 if has_function_privilege('anon','public.tourneo_demarrer(uuid,jsonb,text,text)','EXECUTE')
 or not has_function_privilege('authenticated','public.tourneo_demarrer(uuid,jsonb,text,text)','EXECUTE')
 or not exists(select 1 from pg_proc
   where oid='public.tourneo_demarrer(uuid,jsonb,text,text)'::regprocedure
   and prosecdef
   and exists(select 1 from unnest(coalesce(proconfig,'{}'::text[])) as p(setting)
     where setting like 'search_path=%'))
 then raise exception 'STAGING STOP: RPC de démarrage insuffisamment sécurisé'; end if;
end $$;
commit;
