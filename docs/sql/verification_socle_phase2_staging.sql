-- TOURNEO V2 / PHASE 2 : inventaire exclusivement en lecture seule.
-- À lancer uniquement sur la COPIE V1 après les deux phases additives.
-- Toute ligne non conforme est bloquante; ne contient aucun nom/email/UUID personnel.
with verifications(item,ok) as (
 select 'v1_profil_trigger_preserve',exists(
  select 1 from pg_trigger where tgrelid='auth.users'::regclass
   and tgname='on_auth_user_created_tourneo' and not tgisinternal)
 union all select 'legacy_share_id_column',exists(
  select 1 from information_schema.columns
   where table_schema='public' and table_name='tournois' and column_name='partage_id')
 union all select 'legacy_is_public_column',exists(
  select 1 from information_schema.columns
   where table_schema='public' and table_name='tournois' and column_name='est_public')
 union all select 'historic_share_ids_not_missing',
  (select count(*) from public.tournois where partage_id is null)=0
 union all select 'historical_scores_json_valid',
  (select count(*) from public.tournois
   where jsonb_typeof(donnees) is distinct from 'object'
    or (donnees ? 'matchs' and jsonb_typeof(donnees->'matchs') is distinct from 'array'))=0
 union all select 'phase1_revision_column',exists(
  select 1 from information_schema.columns
   where table_schema='public' and table_name='tournois' and column_name='revision')
 union all select 'v2_player_results_exists',to_regclass('public.player_results') is not null
 union all select 'v2_player_results_rls',
  exists(select 1 from pg_class where oid=to_regclass('public.player_results') and relrowsecurity)
 union all select 'v2_player_results_owner_policies',
  (select count(*) from pg_policies
   where schemaname='public' and tablename='player_results')=4
 union all select 'v2_no_anonymous_result_write',
  not has_table_privilege('anon','public.player_results','insert')
 union all select 'v2_media_private',
  exists(select 1 from storage.buckets where id='tourneo-media'
   and public is false and file_size_limit=5242880)
 union all select 'v2_media_storage_rls',
  exists(select 1 from pg_class where oid=to_regclass('storage.objects') and relrowsecurity)
 union all select 'v2_media_owner_policies',
  (select count(*) from pg_policies where schemaname='storage'
  and tablename='objects' and policyname like 'media_owner_%')=4
 union all select 'v2_private_schema_exists',to_regnamespace('tourneo_private') is not null
)
select item,case when ok then 'OK' else 'STOP' end as status from verifications order by item;
-- Attention : ce socle ne couvre pas les 30+ autres tables/RPC V2.
-- Ce contrôle ne vaut ni validation Auth réelle ni permission de déploiement.
