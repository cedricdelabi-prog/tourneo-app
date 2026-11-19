-- TOURNEO PHASE 8 : contrôle d'installation sur staging, lecture seule.
with v(item,ok) as (
 select 'v1_tournaments',(select count(*) from public.tournois)>0
 union all select 'v1_shares',not exists(select 1 from public.tournois where partage_id is null)
 union all select 'v2_player_profiles',to_regprocedure('public.tourneo_profils_publics(text,uuid[])') is not null
 union all select 'tennis_scores_table',to_regclass('public.tourneo_scores_proposes') is not null
 union all select 'tennis_manches_column',exists(select 1 from information_schema.columns where table_schema='public' and table_name='tourneo_scores_proposes' and column_name='manches')
 union all select 'tennis_rpc',to_regprocedure('public.tourneo_proposer_manches(uuid,integer,jsonb)') is not null
 union all select 'tennis_private_validator',to_regprocedure('tourneo_private.proposer_manches(uuid,integer,jsonb)') is not null
 union all select 'tennis_anonymous_denied',not has_function_privilege('anon','public.tourneo_proposer_manches(uuid,integer,jsonb)','EXECUTE')
 union all select 'tennis_authenticated_enabled',has_function_privilege('authenticated','public.tourneo_proposer_manches(uuid,integer,jsonb)','EXECUTE')
 union all select 'tennis_private_anonymous_denied',not has_function_privilege('anon','tourneo_private.proposer_manches(uuid,integer,jsonb)','EXECUTE')
 union all select 'tennis_scores_rls',exists(select 1 from pg_class where oid='public.tourneo_scores_proposes'::regclass and relrowsecurity)
 union all select 'v1_sharing_rpc',to_regprocedure('public.tourneo_public_compat_v2(uuid)') is not null
)
select item,case when ok then 'OK' else 'STOP' end as status from v order by item;
