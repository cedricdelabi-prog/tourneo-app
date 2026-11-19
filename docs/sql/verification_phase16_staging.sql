-- TOURNEO V2 : vérification phase 16 (base V1 restaurée, lecture seule).
with checks(item,ok) as (
 select 'v1_accounts_restored',(select count(*) from auth.users)>0
 union all select 'v1_tournaments_restored',(select count(*) from public.tournois)>0
 union all select 'v1_links_intact',not exists(select 1 from public.tournois where partage_id is null)
 union all select 'previous_start_rpc',to_regprocedure('public.tourneo_demarrer(uuid,jsonb,text,text)') is not null
 union all select 'discussions_table',to_regclass('public.tourneo_discussions') is not null
 union all select 'discussions_rls',coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.tourneo_discussions')),false)
 union all select 'discussions_read_policy',exists(select 1 from pg_policies where schemaname='public' and tablename='tourneo_discussions' and policyname='discussions_lecture')
 union all select 'discussions_delete_policy',exists(select 1 from pg_policies where schemaname='public' and tablename='tourneo_discussions' and policyname='discussions_retrait')
 union all select 'discussions_anonymous_denied',not has_table_privilege('anon','public.tourneo_discussions','SELECT')
 union all select 'discussions_authenticated_select',has_table_privilege('authenticated','public.tourneo_discussions','SELECT')
 union all select 'discussions_direct_insert_denied',not has_table_privilege('authenticated','public.tourneo_discussions','INSERT')
 union all select 'discussions_private_role',to_regprocedure('tourneo_private.discussion_role(uuid)') is not null
 union all select 'discussions_role_auth_only',not has_function_privilege('anon','tourneo_private.discussion_role(uuid)','EXECUTE')
 union all select 'discussions_send_anon_denied',not has_function_privilege('anon','public.tourneo_discussion_envoyer(uuid,uuid,text,text)','EXECUTE')
 union all select 'discussions_send_authenticated',has_function_privilege('authenticated','public.tourneo_discussion_envoyer(uuid,uuid,text,text)','EXECUTE')
 union all select 'discussions_list_anon_denied',not has_function_privilege('anon','public.tourneo_discussion_tournois()','EXECUTE')
 union all select 'private_schema_not_anon',not has_schema_privilege('anon','tourneo_private','USAGE')
)
select item,case when ok then 'OK' else 'STOP' end as status from checks order by item;
