-- Phase 13 Tourneo V2 : controle aggrege sur staging restaure, lecture seule.
with checks(item,ok) as (
 select 'legacy_tournaments',(select count(*) from public.tournois)>0
 union all select 'legacy_shares',not exists(select 1 from public.tournois where partage_id is null)
 union all select 'private_bucket',(select public is false from storage.buckets where id='tourneo-media')
 union all select 'originals_private_rls',coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.tourneo_album_photos')),false)
 union all select 'album_settings_table',to_regclass('public.tourneo_album_config') is not null
 union all select 'album_settings_rls',coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.tourneo_album_config')),false)
 union all select 'album_settings_anon_denied',not has_table_privilege('anon','public.tourneo_album_config','SELECT')
 union all select 'album_shares_table',to_regclass('public.tourneo_album_partages') is not null
 union all select 'album_shares_rls',coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.tourneo_album_partages')),false)
 union all select 'album_shares_anon_denied',not has_table_privilege('anon','public.tourneo_album_partages','SELECT')
 union all select 'album_default_private',not exists(select 1 from public.tourneo_album_config where partage is true)
 union all select 'preview_column',exists(select 1 from information_schema.columns where table_schema='public' and table_name='tourneo_album_partages' and column_name='apercu_path')
 union all select 'download_toggle',exists(select 1 from information_schema.columns where table_schema='public' and table_name='tourneo_album_config' and column_name='telechargement')
 union all select 'storage_get_policy',exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='album_images_partagees' and cmd='SELECT')
 union all select 'public_rpc_present',to_regprocedure('public.tourneo_album_public(uuid)') is not null
 union all select 'public_rpc_for_anon',has_function_privilege('anon','public.tourneo_album_public(uuid)','EXECUTE')
 union all select 'private_schema_not_anon',not has_schema_privilege('anon','tourneo_private','USAGE')
 union all select 'private_album_not_anonymous',not has_table_privilege('anon','public.tourneo_album_photos','SELECT')
)
select item,case when ok then 'OK' else 'STOP' end as status from checks order by item;
-- Supabase Storage réelle et la purge Edge doivent être testées séparément.
