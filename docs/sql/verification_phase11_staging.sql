-- Tourneo V2, phase 11 : lecture seule et sans données personnelles.
with checks(item,ok) as (
 select 'v1_tournaments_preserved',(select count(*) from public.tournois)>0
 union all select 'v1_links_preserved',not exists(select 1 from public.tournois where partage_id is null)
 union all select 'v1_account_trigger_preserved',exists(select 1 from pg_trigger
  where tgrelid='auth.users'::regclass and tgname='on_auth_user_created_tourneo' and not tgisinternal)
 union all select 'stage10_calls',to_regclass('public.tourneo_appels') is not null
 union all select 'stage10_templates',to_regclass('public.tourneo_modeles_affiche') is not null
 union all select 'stage11_private_rpc',to_regprocedure('tourneo_private.mes_participations()') is not null
 union all select 'stage11_public_wrapper',to_regprocedure('public.tourneo_mes_participations()') is not null
 union all select 'stage11_wrapper_anon_denied',not has_function_privilege('anon','public.tourneo_mes_participations()','EXECUTE')
 union all select 'stage11_private_anon_denied',not has_function_privilege('anon','tourneo_private.mes_participations()','EXECUTE')
 union all select 'stage11_wrapper_authenticated',has_function_privilege('authenticated','public.tourneo_mes_participations()','EXECUTE')
 union all select 'stage11_private_authenticated',has_function_privilege('authenticated','tourneo_private.mes_participations()','EXECUTE')
 union all select 'stage11_share_compatibility',to_regprocedure('public.tourneo_public_compat_v2(uuid)') is not null
)
select item,case when ok then 'OK' else 'STOP' end as status from checks order by item;
