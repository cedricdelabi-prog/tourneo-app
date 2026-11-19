-- TOURNEO: read-only V2 schema verification on the EXISTING V2 TEST database.
-- Expected: all rows returned with status = OK.
with checks as (
 select 'profiles.ville_publique' as item, exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='ville_publique') as valid
 union all select 'tournois.updated_at',exists(select 1 from information_schema.columns where table_schema='public' and table_name='tournois' and column_name='updated_at')
 union all select 'tournois.revision',exists(select 1 from information_schema.columns where table_schema='public' and table_name='tournois' and column_name='revision')
 union all select 'tournois.termine_at',exists(select 1 from information_schema.columns where table_schema='public' and table_name='tournois' and column_name='termine_at')
 union all select 'tournois.photos_expirent_at',exists(select 1 from information_schema.columns where table_schema='public' and table_name='tournois' and column_name='photos_expirent_at')
 union all select 'tourneo_public_v2(uuid)',to_regprocedure('public.tourneo_public_v2(uuid)') is not null
 union all select 'tourneo_private.reviser_tournoi()',to_regprocedure('tourneo_private.reviser_tournoi()') is not null
 union all select 'tourneo_inscriptions',to_regclass('public.tourneo_inscriptions') is not null
 union all select 'tourneo_evenements',to_regclass('public.tourneo_evenements') is not null
 union all select 'tourneo_notifications',to_regclass('public.tourneo_notifications') is not null
 union all select 'tourneo_preferences',to_regclass('public.tourneo_preferences') is not null
 union all select 'tourneo_album_photos',to_regclass('public.tourneo_album_photos') is not null
)
select item,case when valid then 'OK' else 'MISSING' end as status from checks order by item;
