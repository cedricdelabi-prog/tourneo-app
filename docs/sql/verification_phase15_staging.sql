-- Tourneo V2, phase 15 : contrôle lecture seule sur copie V1 restaurée.
with checks(item,ok) as (
 select 'v1_tournaments',(select count(*) from public.tournois)>0
 union all select 'v1_shared_ids',not exists(select 1 from public.tournois where partage_id is null)
 union all select 'v1_auth_trigger',exists(select 1 from pg_trigger where tgrelid='auth.users'::regclass and tgname='on_auth_user_created_tourneo' and not tgisinternal)
 union all select 'v2_accepted_registrations',to_regclass('public.tourneo_inscriptions') is not null
 union all select 'v2_registration_settings',to_regclass('public.tourneo_inscriptions_config') is not null
 union all select 'v2_start_rpc',to_regprocedure('public.tourneo_demarrer(uuid,jsonb,text,text)') is not null
 union all select 'v2_start_anon_denied',not has_function_privilege('anon','public.tourneo_demarrer(uuid,jsonb,text,text)','EXECUTE')
 union all select 'v2_start_owner_authenticated',has_function_privilege('authenticated','public.tourneo_demarrer(uuid,jsonb,text,text)','EXECUTE')
 union all select 'v2_start_secure_function',exists(select 1 from pg_proc
    where oid='public.tourneo_demarrer(uuid,jsonb,text,text)'::regprocedure
    and prosecdef and exists(select 1 from unnest(coalesce(proconfig,'{}'::text[])) p(setting) where setting like 'search_path=%'))
 union all select 'v2_registration_marker',to_regprocedure('tourneo_private.equipes_inscrites_marqueur()') is not null
 union all select 'v2_registration_marker_not_anon',not has_function_privilege('anon','tourneo_private.equipes_inscrites_marqueur()','EXECUTE')
 union all select 'v2_private_planning_retained',to_regprocedure('tourneo_private.projection_planning_v2_marqueur()') is not null
 union all select 'v2_share_compatibility_retained',to_regprocedure('public.tourneo_public_compat_v2(uuid)') is not null
)
select item,case when ok then 'OK' else 'STOP' end as status from checks order by item;
