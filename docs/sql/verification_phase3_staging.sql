-- Tourneo V1 copie restauree apres phase 3 : EXCLUSIVEMENT LECTURE SEULE.
-- Ne retourne aucune donnee personnelle, UUID, URL ou JSON.
with verifications(item,ok) as (
 select 'v1_accounts_preserved',(select count(*) from auth.users)>0
 union all select 'v1_tournaments_preserved',(select count(*) from public.tournois)>0
 union all select 'legacy_shares_preserved',not exists(select 1 from public.tournois where partage_id is null)
 union all select 'v1_auth_trigger_present',exists(
  select 1 from pg_trigger where tgrelid='auth.users'::regclass
   and tgname='on_auth_user_created_tourneo' and not tgisinternal)
 union all select 'v2_stage2_results_preserved',to_regclass('public.player_results') is not null
 union all select 'v2_stage3_config',to_regclass('public.tourneo_inscriptions_config') is not null
 union all select 'v2_stage3_inscriptions',to_regclass('public.tourneo_inscriptions') is not null
 union all select 'v2_stage3_events',to_regclass('public.tourneo_evenements') is not null
 union all select 'v2_stage3_event_tournaments',to_regclass('public.tourneo_evenement_tournois') is not null
 union all select 'v2_stage3_referees',to_regclass('public.tourneo_arbitres') is not null
 union all select 'v2_stage3_scores',to_regclass('public.tourneo_scores_proposes') is not null
 union all select 'v2_stage3_all_tables_rls',not exists(
  select 1 from (values
   ('public.tourneo_inscriptions_config'),('public.tourneo_inscriptions'),
   ('public.tourneo_evenements'),('public.tourneo_evenement_tournois'),
   ('public.tourneo_arbitres'),('public.tourneo_scores_proposes')) as t(name)
  where not coalesce((select relrowsecurity from pg_class where oid=to_regclass(t.name)),false))
 union all select 'v2_stage3_anon_no_table_insert',not exists(
  select 1 from (values
   ('public.tourneo_inscriptions_config'),('public.tourneo_inscriptions'),
   ('public.tourneo_evenements'),('public.tourneo_evenement_tournois'),
   ('public.tourneo_arbitres'),('public.tourneo_scores_proposes')) as t(name)
  where has_table_privilege('anon',t.name,'INSERT'))
 union all select 'v2_stage3_owner_rpc_present',
  to_regprocedure('public.tourneo_configurer_inscriptions(uuid,boolean,integer,timestamptz,boolean)') is not null
 union all select 'v2_stage3_anon_cannot_start',
  not has_function_privilege('anon','public.tourneo_demarrer(uuid,jsonb,text,text)','EXECUTE')
 union all select 'v2_stage3_public_rpc_not_installed',
  to_regprocedure('public.tourneo_public_v2(uuid)') is null
)
select item,case when ok then 'OK' else 'STOP' end as status from verifications order by item;
-- Ce controle ne prouve ni une restauration réelle, ni la migration complète.
