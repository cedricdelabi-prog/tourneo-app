-- TOURNEO V2 PHASE 7 : RECHERCHE DES PROFILS POUR JOUEURS ET GROUPES.
-- UNIQUEMENT COPIE V1 RESTAUREE SUR STAGING, après phases 1 à 6.
-- NE PAS lancer sur la production V1 ni sur la base V2 de test existante.
-- Confirmation à effectuer manuellement SUR LA CONNEXION STAGING :
-- select set_config('tourneo.v1_copy_verified','true',false);
-- Aucun profil V1 n'est mis à jour : lecture limitée et uniquement authentifiée.
begin;
do $$
begin
 if current_setting('tourneo.v1_copy_verified',true) is distinct from 'true'
 then raise exception 'STAGING STOP: copie restauree V1 non explicitement confirmee'; end if;
 if to_regclass('public.profiles') is null
 or to_regclass('public.tournois') is null
 or to_regclass('public.tourneo_groupes') is null
 or to_regclass('public.tourneo_groupe_membres') is null
 or to_regnamespace('tourneo_private') is null
 or to_regprocedure('public.tourneo_partager_groupe(uuid,text,text)') is null
 or to_regprocedure('public.tourneo_public_compat_v2(uuid)') is null
 or to_regprocedure('auth.uid()') is null
 then raise exception 'STAGING STOP: structures des phases precedentes incompletes'; end if;
 if not exists(select 1 from information_schema.columns
    where table_schema='public' and table_name='tournois' and column_name='partage_id')
 or not exists(select 1 from information_schema.columns
    where table_schema='public' and table_name='tournois' and column_name='est_public')
 or (select count(*) from auth.users)=0
 or (select count(*) from public.profiles)=0
 or exists(select 1 from public.tournois where partage_id is null)
 or not exists(select 1 from pg_trigger
    where tgrelid='auth.users'::regclass and tgname='on_auth_user_created_tourneo'
    and not tgisinternal)
 then raise exception 'STAGING STOP: identites ou anciens partages V1 manquants'; end if;
 if to_regprocedure('public.tourneo_profils_publics(text,uuid[])') is not null
 then raise exception 'STAGING STOP: phase 7 deja installee'; end if;
end $$;

-- Compatibilité avec app/joueur/[code] et app/groupes.
-- Seule une session connectée peut accéder au pseudonyme et au code joueur.
-- Aucun nom civil, email, ville ou photo ne peut être retourné.
create function public.tourneo_profils_publics(
 p_code text default null,
 p_ids uuid[] default null
)
returns table(
 id uuid,
 display_name text,
 player_code text,
 avatar_url text,
 favorite_color text
)
language sql stable security definer
set search_path = ''
as $$
 select p.id,p.display_name,p.player_code,null::text,p.favorite_color
 from public.profiles p
 where auth.uid() is not null
   and (
     (p_code is not null and char_length(trim(p_code)) between 1 and 128
      and p.player_code=upper(trim(p_code)))
     or
     (p_ids is not null and cardinality(p_ids) between 1 and 256
      and p.id=any(p_ids))
   )
 limit 256;
$$;
revoke all on function public.tourneo_profils_publics(text,uuid[]) from public,anon;
grant execute on function public.tourneo_profils_publics(text,uuid[]) to authenticated;
commit;
