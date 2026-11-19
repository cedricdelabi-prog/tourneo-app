-- TOURNEO : contrôles lecture seule après phase 14, sur copie V1 restaurée.
-- Ne retourne aucune information personnelle ni contenu JSON.
with v(item,ok) as (
 select 'v1_tournaments_preserved',(select count(*) from public.tournois)>0
 union all select 'v1_old_links_preserved',not exists(select 1 from public.tournois where partage_id is null)
 union all select 'v1_old_links_unique',not exists(select 1 from public.tournois group by partage_id having count(*)>1)
 union all select 'v1_signup_trigger_retained',exists(select 1 from pg_trigger where tgrelid='auth.users'::regclass and tgname='on_auth_user_created_tourneo' and not tgisinternal)
 union all select 'v1_old_rpc_not_modified',to_regprocedure('public.get_tourneo_public(uuid)') is not null
 union all select 'v2_public_planning_projection',to_regprocedure('public.tourneo_public_v2(uuid)') is not null
 union all select 'v2_compatibility_rpc',to_regprocedure('public.tourneo_public_compat_v2(uuid)') is not null
 union all select 'v2_planning_marker',to_regprocedure('tourneo_private.projection_planning_v2_marqueur()') is not null
 union all select 'v2_anon_public_rpc',has_function_privilege('anon','public.tourneo_public_v2(uuid)','EXECUTE')
 union all select 'v2_anon_legacy_alias',has_function_privilege('anon','public.tourneo_public_compat_v2(uuid)','EXECUTE')
 union all select 'v2_private_schema_not_anon',not has_schema_privilege('anon','tourneo_private','USAGE')
 union all select 'v2_planning_marker_not_anon',not has_function_privilege('anon','tourneo_private.projection_planning_v2_marqueur()','EXECUTE')
 union all select 'v2_planning_definer_safe_search_path',exists(select 1 from pg_proc where oid='public.tourneo_public_v2(uuid)'::regprocedure and prosecdef and exists(select 1 from unnest(coalesce(proconfig,'{}'::text[])) as setting(value) where setting.value like 'search_path=%'))
 union all select 'v2_private_album_preserved',to_regclass('public.tourneo_album_photos') is not null
 union all select 'v2_shared_album_preserved',to_regclass('public.tourneo_album_partages') is not null
)
select item,case when ok then 'OK' else 'STOP' end as status from v order by item;
-- Les tests sur vrai HTTP/Supabase et restauration V1 restent indispensables.
