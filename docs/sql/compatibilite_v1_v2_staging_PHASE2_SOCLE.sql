-- Tourneo V2 : PHASE 2 / BASE V1 RESTAURÉE SUR UN STAGING ISOLÉ UNIQUEMENT.
-- INTERDIT en production V1 ou sur le projet V2 déjà initialisé.
-- Le script préserve V1: auth.users, profiles, tournois, partage_id, est_public,
-- JSON des équipes/matchs et policies de partage existantes (durcissement en phase ultérieure).
-- Pré-requis : sauvegarde restaurable + phase 1 compatibilite_v1_v2_staging_DRAFT.sql.
-- Ne PAS exécuter les migrations V2 conçues pour une base vierge après ce script.
-- L'armement explicite doit être fait sur la CONNEXION de staging, jamais dans ce fichier :
-- select set_config('tourneo.v1_copy_verified','true',false);
-- Seul l'opérateur responsable de la copie restaurée doit activer ce drapeau.
begin;
do $
begin
 if current_setting('tourneo.v1_copy_verified',true) is distinct from 'true' then
  raise exception 'STAGING STOP: copie restaurée non explicitement confirmée';
 end if;
 if not exists(select 1 from pg_trigger
    where tgrelid='auth.users'::regclass and tgname='on_auth_user_created_tourneo'
      and not tgisinternal) then
  raise exception 'STAGING STOP: ancien déclencheur Auth de création de profil absent';
 end if;
 if to_regclass('public.profiles') is null
 or to_regclass('public.tournois') is null
 or to_regclass('storage.buckets') is null
 or to_regclass('storage.objects') is null
 or to_regprocedure('auth.uid()') is null then
  raise exception 'STAGING STOP: ancien schéma/Auth/Storage manquant';
 end if;
 if not exists(select 1 from information_schema.columns
    where table_schema='public' and table_name='tournois' and column_name='partage_id')
 or not exists(select 1 from information_schema.columns
    where table_schema='public' and table_name='tournois' and column_name='est_public')
 or not exists(select 1 from information_schema.columns
    where table_schema='public' and table_name='tournois' and column_name='revision')
 or not exists(select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='ville_publique')
 then raise exception 'STAGING STOP: phase 1 non validée ou anciens partages absents'; end if;
 if (select count(*) from auth.users)=0 or (select count(*) from public.tournois)=0
 or exists(select 1 from public.tournois where partage_id is null)
 or exists(select 1 from public.tournois t where not exists(select 1 from auth.users u where u.id=t.user_id))
 then raise exception 'STAGING STOP: restauration V1 incomplète ou tournois orphelins'; end if;
 if to_regclass('public.player_results') is not null
 or exists(select 1 from storage.buckets where id='tourneo-media')
 then raise exception 'STAGING STOP: éléments V2 déjà présents; ne pas relancer la phase 2 aveuglément'; end if;
end $$;

-- Recréer uniquement la table V2 manquante; aucun compte ou résultat historique réécrit.
create table public.player_results (
 id uuid primary key default gen_random_uuid(),
 tournament_id uuid not null references public.tournois(id) on delete cascade,
 profile_id uuid not null references public.profiles(id) on delete cascade,
 tournament_name text not null,
 sport text not null,
 placement integer not null check(placement between 1 and 256),
 points integer not null check(points between 0 and 100),
 created_at timestamptz not null default now(),
 unique(tournament_id,profile_id)
);
create index player_results_profile_id on public.player_results(profile_id);
alter table public.player_results enable row level security;
revoke all on public.player_results from anon,authenticated;
grant select on public.player_results to anon,authenticated;
grant insert,update,delete on public.player_results to authenticated;
create policy results_read on public.player_results for select to anon,authenticated using(true);
create policy results_owner_insert on public.player_results for insert to authenticated
 with check(exists(select 1 from public.tournois t
 where t.id=tournament_id and t.user_id=(select auth.uid())));
create policy results_owner_update on public.player_results for update to authenticated
 using(exists(select 1 from public.tournois t
 where t.id=tournament_id and t.user_id=(select auth.uid())))
 with check(exists(select 1 from public.tournois t
 where t.id=tournament_id and t.user_id=(select auth.uid())));
create policy results_owner_delete on public.player_results for delete to authenticated
 using(exists(select 1 from public.tournois t
 where t.id=tournament_id and t.user_id=(select auth.uid())));

-- Le bucket V1 n'existe pas : ajout d'un espace PRIVÉ, sans toucher aux objets V1.
-- Storage.objects reste sous RLS ; propriétaire seul si chemin <auth.uid>/...
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('tourneo-media','tourneo-media',false,5242880,
        array['image/jpeg','image/png','image/webp','image/gif']);
alter table storage.objects enable row level security;
create policy media_owner_read on storage.objects for select to authenticated
 using(bucket_id='tourneo-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy media_owner_insert on storage.objects for insert to authenticated
 with check(bucket_id='tourneo-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy media_owner_update on storage.objects for update to authenticated
 using(bucket_id='tourneo-media' and (storage.foldername(name))[1]=(select auth.uid())::text)
 with check(bucket_id='tourneo-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy media_owner_delete on storage.objects for delete to authenticated
 using(bucket_id='tourneo-media' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- Préparer l'espace privé requis par les fonctions V2 suivantes ; aucun RPC ajouté ici.
create schema if not exists tourneo_private;
revoke all on schema tourneo_private from public,anon;
grant usage on schema tourneo_private to authenticated;

do $$
begin
 if (select public from storage.buckets where id='tourneo-media') is distinct from false
 or (select file_size_limit from storage.buckets where id='tourneo-media') <> 5242880
 or (select count(*) from pg_policies
     where schemaname='public' and tablename='player_results') <> 4
 or (select count(*) from pg_policies
     where schemaname='storage' and tablename='objects'
       and policyname like 'media_owner_%') <> 4
 then raise exception 'STAGING STOP: protections du socle V2 manquantes'; end if;
end $$;
commit;

-- Phase 2 uniquement : ne remplace PAS les autres tables/RPC/triggers de la V2.
-- Étapes suivantes : migrations applicatives adaptées, partage filtré, tests Auth,
-- restauration/rollback et accord explicite avant toute production.
