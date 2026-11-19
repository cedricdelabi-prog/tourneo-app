-- Tourneo V1 copie restaurée : phase 12 en lecture seule.
with v(item,ok) as (
 select 'legacy_accounts',(select count(*) from auth.users)>0
 union all select 'legacy_tournaments',(select count(*) from public.tournois)>0
 union all select 'historical_links',not exists(select 1 from public.tournois where partage_id is null)
 union all select 'media_private_bucket',(select public is false from storage.buckets where id='tourneo-media')
 union all select 'expiry_column',exists(select 1 from information_schema.columns where table_schema='public' and table_name='tournois' and column_name='photos_expirent_at')
 union all select 'retention_trigger',exists(select 1 from pg_trigger where tgrelid='public.tournois'::regclass and tgname='date_conservation_photos' and not tgisinternal)
 union all select 'media_read_policy',exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='media_owner_read')
 union all select 'media_insert_policy',exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='media_owner_insert')
 union all select 'media_update_policy',exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='media_owner_update')
 union all select 'album_private_table',to_regclass('public.tourneo_album_photos') is not null
 union all select 'album_rls',coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.tourneo_album_photos')),false)
 union all select 'album_anon_denied',not has_table_privilege('anon','public.tourneo_album_photos','SELECT')
 union all select 'album_owner_policy',exists(select 1 from pg_policies where schemaname='public' and tablename='tourneo_album_photos' and policyname='album_lecture')
 union all select 'album_quota_trigger',exists(select 1 from pg_trigger where tgrelid='public.tourneo_album_photos'::regclass and tgname='quota_album' and not tgisinternal)
 union all select 'photo_jobs',to_regclass('public.tourneo_jobs_photos') is not null
 union all select 'photo_jobs_anon_denied',not has_table_privilege('anon','public.tourneo_jobs_photos','SELECT')
 union all select 'photo_purge_rpc_anon_denied',not has_function_privilege('anon','public.tourneo_photos_a_supprimer()','EXECUTE')
 union all select 'photo_expiry_rpc',to_regprocedure('public.tourneo_duree_photo(uuid)') is not null
 union all select 'public_album_not_installed',to_regprocedure('public.tourneo_album_public(uuid)') is null
)
select item,case when ok then 'OK' else 'STOP' end as status from v order by item;
