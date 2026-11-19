-- TOURNEO V2 PHASE 16 : DISCUSSIONS PRIVEES PAR TOURNOI
-- APPLIQUER UNIQUEMENT SUR UNE COPIE V1 RESTAUREE EN STAGING ISOLE.
-- Jamais sur la production V1 ni sur la base V2 de test active.
-- Pré-requis : phases 1 à 15 et validation de la connexion staging hors script :
-- select set_config('tourneo.v1_copy_verified','true',false);
-- Les messages ne sont visibles que par les membres autorisés, selon audience.
-- La modération et les sanctions administrateur feront l'objet de la phase suivante.
begin;
do $$
begin
 if current_setting('tourneo.v1_copy_verified',true) is distinct from 'true'
 then raise exception 'STAGING STOP: copie restauree V1 non confirmee'; end if;
 if to_regclass('public.tournois') is null
 or to_regclass('public.profiles') is null
 or to_regclass('public.tourneo_inscriptions') is null
 or to_regclass('public.tourneo_arbitres') is null
 or to_regclass('public.tourneo_album_config') is null
 or to_regprocedure('public.tourneo_demarrer(uuid,jsonb,text,text)') is null
 or to_regprocedure('tourneo_private.equipes_inscrites_marqueur()') is null
 or to_regprocedure('tourneo_private.projection_planning_v2_marqueur()') is null
 or to_regprocedure('public.tourneo_public_compat_v2(uuid)') is null
 then raise exception 'STAGING STOP: phases 1 a 15 manquantes'; end if;
 if not exists(select 1 from information_schema.columns where table_schema='auth'
    and table_name='users' and column_name='deleted_at')
 or not exists(select 1 from information_schema.columns where table_schema='auth'
    and table_name='users' and column_name='banned_until')
 or (select count(*) from auth.users)=0
 or (select count(*) from public.tournois)=0
 or exists(select 1 from public.tournois where partage_id is null)
 or not exists(select 1 from pg_trigger where tgrelid='auth.users'::regclass
    and tgname='on_auth_user_created_tourneo' and not tgisinternal)
 then raise exception 'STAGING STOP: Auth ou liens historiques V1 incomplets'; end if;
 if to_regclass('public.tourneo_discussions') is not null
 or to_regprocedure('tourneo_private.discussion_role(uuid)') is not null
 or to_regprocedure('public.tourneo_discussion_envoyer(uuid,uuid,text,text)') is not null
 then raise exception 'STAGING STOP: phase 16 deja installee ou incomplète'; end if;
end $$;

-- Portage sans modification des profils, tournois ni messages historiques V1.
-- Dedicated V2 project only. Shared tournament conversations, no public access.
create table public.tourneo_discussions (
 id uuid primary key,
 tournoi_id uuid not null references public.tournois(id) on delete cascade,
 auteur_id uuid not null references auth.users(id) on delete cascade,
 auteur_nom text not null check(char_length(auteur_nom) between 1 and 100),
 audience text not null check(audience in ('tous','joueurs','arbitres','organisateur')),
 contenu text not null check(char_length(trim(contenu)) between 1 and 2000),
 created_at timestamptz not null default now()
);
create index discussions_tournoi_date on public.tourneo_discussions(tournoi_id,created_at desc,id);
create index discussions_auteur_date on public.tourneo_discussions(auteur_id,created_at desc);
alter table public.tourneo_discussions enable row level security;
revoke all on public.tourneo_discussions from public,anon,authenticated;
grant select,delete on public.tourneo_discussions to authenticated;

create function tourneo_private.discussion_role(p_tournoi uuid) returns text
language sql stable security definer set search_path='' as $$
 select case
 when (select auth.uid()) is null then null
 when not exists(select 1 from auth.users u where u.id=(select auth.uid()) and u.deleted_at is null and (u.banned_until is null or u.banned_until<now())) then null
 when t.user_id=(select auth.uid()) then 'organisateur'
 when exists(select 1 from public.tourneo_arbitres a where a.tournoi_id=t.id and a.user_id=(select auth.uid())) then 'arbitres'
 when exists(select 1 from public.tourneo_inscriptions i where i.tournoi_id=t.id and i.user_id=(select auth.uid()) and i.statut='accepte')
 or exists(select 1 from jsonb_array_elements(coalesce(t.donnees->'equipes','[]'::jsonb)) e where coalesce(e->>'profilId',e->>'id')=(select auth.uid())::text) then 'joueurs'
 else null end from public.tournois t where t.id=p_tournoi
$$;
create function tourneo_private.discussion_visible(p_tournoi uuid,p_auteur uuid,p_audience text) returns boolean
language sql stable security invoker set search_path='' as $$
 select coalesce(r is not null and (r='organisateur' or p_auteur=(select auth.uid()) or p_audience='tous' or p_audience=r),false)
 from (select tourneo_private.discussion_role(p_tournoi) r) s
$$;
create policy discussions_lecture on public.tourneo_discussions for select to authenticated
using(tourneo_private.discussion_visible(tournoi_id,auteur_id,audience));
create policy discussions_retrait on public.tourneo_discussions for delete to authenticated
using(tourneo_private.discussion_role(tournoi_id) is not null and (auteur_id=(select auth.uid()) or tourneo_private.discussion_role(tournoi_id)='organisateur'));

create function tourneo_private.discussion_envoyer(p_id uuid,p_tournoi uuid,p_audience text,p_contenu text) returns uuid
language plpgsql security definer set search_path='' as $$
declare role_tournoi text; ancien public.tourneo_discussions; nom text;
begin
 role_tournoi:=tourneo_private.discussion_role(p_tournoi);
 if role_tournoi is null then raise exception 'Accès réservé aux membres du tournoi'; end if;
 if p_audience is null or p_audience not in ('tous','joueurs','arbitres','organisateur') or (role_tournoi<>'organisateur' and p_audience not in ('tous','organisateur',role_tournoi)) then raise exception 'Destinataires non autorisés'; end if;
 if p_id is null or p_contenu is null or char_length(trim(p_contenu)) not between 1 and 2000 then raise exception 'Message invalide (1 à 2 000 caractères)'; end if;
 perform pg_advisory_xact_lock(hashtext((select auth.uid())::text));
 select * into ancien from public.tourneo_discussions where id=p_id;
 if found then
  if ancien.auteur_id=(select auth.uid()) and ancien.tournoi_id=p_tournoi and ancien.audience=p_audience and ancien.contenu=trim(p_contenu) then return ancien.id;end if;
  raise exception 'Identifiant de message déjà utilisé';
 end if;
 if (select count(*) from public.tourneo_discussions where auteur_id=(select auth.uid()) and created_at>now()-interval '1 minute')>=10 then raise exception 'Trop de messages. Patientez une minute.'; end if;
 select display_name into nom from public.profiles where id=(select auth.uid());
 insert into public.tourneo_discussions(id,tournoi_id,auteur_id,auteur_nom,audience,contenu)
 values(p_id,p_tournoi,(select auth.uid()),coalesce(nullif(trim(nom),''),'Joueur'),p_audience,trim(p_contenu));
 return p_id;
end $$;
create function tourneo_private.discussion_tournois() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'nom',nom,'role',role_tournoi) order by nom),'[]'::jsonb)
 from (select t.id,t.nom,tourneo_private.discussion_role(t.id) role_tournoi from public.tournois t) s
 where role_tournoi is not null
$$;
create function public.tourneo_discussion_envoyer(p_id uuid,p_tournoi uuid,p_audience text,p_contenu text) returns uuid
language sql security invoker set search_path='' as $$select tourneo_private.discussion_envoyer(p_id,p_tournoi,p_audience,p_contenu)$$;
create function public.tourneo_discussion_tournois() returns jsonb
language sql stable security invoker set search_path='' as $$select tourneo_private.discussion_tournois()$$;
revoke all on function tourneo_private.discussion_role(uuid),tourneo_private.discussion_visible(uuid,uuid,text),tourneo_private.discussion_envoyer(uuid,uuid,text,text),tourneo_private.discussion_tournois(),public.tourneo_discussion_envoyer(uuid,uuid,text,text),public.tourneo_discussion_tournois() from public,anon;
grant execute on function tourneo_private.discussion_role(uuid),tourneo_private.discussion_visible(uuid,uuid,text),tourneo_private.discussion_envoyer(uuid,uuid,text,text),tourneo_private.discussion_tournois(),public.tourneo_discussion_envoyer(uuid,uuid,text,text),public.tourneo_discussion_tournois() to authenticated;

-- Vérification transactionnelle des autorisations.
do $$
begin
 if not exists(select 1 from pg_class where oid='public.tourneo_discussions'::regclass and relrowsecurity)
 or has_table_privilege('anon','public.tourneo_discussions','SELECT')
 or has_table_privilege('anon','public.tourneo_discussions','DELETE')
 or has_table_privilege('authenticated','public.tourneo_discussions','INSERT')
 or has_function_privilege('anon','public.tourneo_discussion_envoyer(uuid,uuid,text,text)','EXECUTE')
 or has_function_privilege('anon','public.tourneo_discussion_tournois()','EXECUTE')
 or not has_function_privilege('authenticated','public.tourneo_discussion_envoyer(uuid,uuid,text,text)','EXECUTE')
 or has_schema_privilege('anon','tourneo_private','USAGE')
 then raise exception 'STAGING STOP: securite des discussions non conforme'; end if;
end $$;
commit;
