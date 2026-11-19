-- Phase 17 Tourneo : état de sécurité sur staging, lecture seule.
with checks(item,ok) as (
 select 'legacy_accounts',(select count(*) from auth.users)>0
 union all select 'legacy_tournaments',(select count(*) from public.tournois)>0
 union all select 'legacy_links',not exists(select 1 from public.tournois where partage_id is null)
 union all select 'messages_table',to_regclass('public.tourneo_discussions') is not null
 union all select 'messages_masked_column',exists(select 1 from information_schema.columns where table_schema='public' and table_name='tourneo_discussions' and column_name='masque')
 union all select 'messages_private_rls',coalesce((select relrowsecurity from pg_class where oid='public.tourneo_discussions'::regclass),false)
 union all select 'moderation_admins_private',to_regclass('tourneo_private.administrateurs') is not null and not has_table_privilege('anon','tourneo_private.administrateurs','SELECT')
 union all select 'moderation_admins_rls',coalesce((select relrowsecurity from pg_class where oid='tourneo_private.administrateurs'::regclass),false)
 union all select 'moderation_no_default_admin',(select count(*) from tourneo_private.administrateurs)=0
 union all select 'moderation_journal_private',to_regclass('tourneo_private.journal_admin') is not null and not has_table_privilege('authenticated','tourneo_private.journal_admin','SELECT')
 union all select 'moderation_reports_private',to_regclass('tourneo_private.signalements_discussions') is not null and not has_table_privilege('authenticated','tourneo_private.signalements_discussions','SELECT')
 union all select 'moderation_sanctions_private',to_regclass('tourneo_private.sanctions_discussions') is not null and not has_table_privilege('authenticated','tourneo_private.sanctions_discussions','SELECT')
 union all select 'moderation_role_service',to_regprocedure('tourneo_private.role_admin()') is not null
 union all select 'moderation_send_report',to_regprocedure('public.tourneo_discussion_signaler(uuid,uuid,text,text)') is not null
 union all select 'moderation_queue_rpc',to_regprocedure('public.tourneo_moderation_liste(text,integer)') is not null
 union all select 'moderation_decisions_rpc',to_regprocedure('public.tourneo_moderation_decider(uuid,text,text)') is not null
 union all select 'moderation_report_anon_denied',not has_function_privilege('anon','public.tourneo_discussion_signaler(uuid,uuid,text,text)','EXECUTE')
 union all select 'moderation_decision_anon_denied',not has_function_privilege('anon','public.tourneo_moderation_decider(uuid,text,text)','EXECUTE')
 union all select 'moderation_private_schema',not has_schema_privilege('anon','tourneo_private','USAGE')
)
select item,case when ok then 'OK' else 'STOP' end as status from checks order by item;
