-- Contrôle en lecture seule sur la copie restaurée après phase 9.
with checks(item,ok) as (
 select 'v1_tournaments',(select count(*) from public.tournois)>0
 union all select 'v1_shares',not exists(select 1 from public.tournois where partage_id is null)
 union all select 'v1_trigger_retained',exists(select 1 from pg_trigger where tgrelid='auth.users'::regclass and tgname='on_auth_user_created_tourneo' and not tgisinternal)
 union all select 'v1_revision_trigger',exists(select 1 from pg_trigger where tgrelid='public.tournois'::regclass and tgname='revision_tournoi' and not tgisinternal)
 union all select 'olympiades_table',to_regclass('public.tourneo_olympiades') is not null
 union all select 'olympiades_rls',exists(select 1 from pg_class where oid='public.tourneo_olympiades'::regclass and relrowsecurity)
 union all select 'olympiades_owner_policy',exists(select 1 from pg_policies where schemaname='public' and tablename='tourneo_olympiades' and policyname='olympiades_owner')
 union all select 'olympiades_anon_table_denied',not has_table_privilege('anon','public.tourneo_olympiades','SELECT')
 union all select 'olympiades_revision_trigger',exists(select 1 from pg_trigger where tgrelid='public.tourneo_olympiades'::regclass and tgname='revision_olympiade' and not tgisinternal)
 union all select 'olympiades_public_rpc',to_regprocedure('public.tourneo_olympiade_publique(uuid)') is not null
 union all select 'olympiades_public_rpc_anon',has_function_privilege('anon','public.tourneo_olympiade_publique(uuid)','EXECUTE')
 union all select 'olympiades_private_rpc_denied',not has_function_privilege('anon','tourneo_private.olympiade_publique(uuid)','EXECUTE')
 union all select 'olympiades_private_schema_denied',not has_schema_privilege('anon','tourneo_private','USAGE')
 union all select 'tennis_rpc_preserved',to_regprocedure('public.tourneo_proposer_manches(uuid,integer,jsonb)') is not null
)
select item, case when ok then 'OK' else 'STOP' end as status from checks order by item;
