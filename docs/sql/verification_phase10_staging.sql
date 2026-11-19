-- Phase 10 Tourneo : contrôle lecture seule sans exposer de données personnelles.
with checks(item,ok) as (
 select 'legacy_accounts_preserved',(select count(*) from auth.users)>0
 union all select 'legacy_tournaments_preserved',(select count(*) from public.tournois)>0
 union all select 'legacy_shared_links_preserved',not exists(select 1 from public.tournois where partage_id is null)
 union all select 'phase9_olympiades',to_regclass('public.tourneo_olympiades') is not null
 union all select 'participant_calls_table',to_regclass('public.tourneo_appels') is not null
 union all select 'participant_calls_rls',coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.tourneo_appels')),false)
 union all select 'participant_calls_anon_no_read',not has_table_privilege('anon','public.tourneo_appels','SELECT')
 union all select 'participant_calls_anon_no_update',not has_table_privilege('anon','public.tourneo_appels','UPDATE')
 union all select 'participant_calls_organiser_rpc',to_regprocedure('public.tourneo_appel_match(uuid,integer,boolean)') is not null
 union all select 'participant_calls_anon_blocked',not has_function_privilege('anon','public.tourneo_appel_match(uuid,integer,boolean)','EXECUTE')
 union all select 'participant_calls_authenticated',has_function_privilege('authenticated','public.tourneo_appel_match(uuid,integer,boolean)','EXECUTE')
 union all select 'poster_templates_table',to_regclass('public.tourneo_modeles_affiche') is not null
 union all select 'poster_templates_rls',coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.tourneo_modeles_affiche')),false)
 union all select 'poster_templates_owner_policy',exists(select 1 from pg_policies where schemaname='public' and tablename='tourneo_modeles_affiche' and policyname='modeles_affiche_proprietaire')
 union all select 'poster_templates_anon_blocked',not has_table_privilege('anon','public.tourneo_modeles_affiche','SELECT')
 union all select 'poster_templates_authenticated',has_table_privilege('authenticated','public.tourneo_modeles_affiche','INSERT')
)
select item,case when ok then 'OK' else 'STOP' end as status from checks order by item;
