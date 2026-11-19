-- Contrôle lecture seule du staging après phase 4 Tourneo.
-- Ne retourne ni UUID, ni pseudo, ni email, ni données de tournoi.
with v(item,ok) as (
 select 'v1_profiles', (select count(*) from public.profiles)>0
 union all select 'v1_tournaments',(select count(*) from public.tournois)>0
 union all select 'legacy_shares',not exists(select 1 from public.tournois where partage_id is null)
 union all select 'stage3_inscriptions',to_regclass('public.tourneo_inscriptions') is not null
 union all select 'stage3_scores',to_regclass('public.tourneo_scores_proposes') is not null
 union all select 'stage4_preferences',to_regclass('public.tourneo_preferences') is not null
 union all select 'stage4_notifications',to_regclass('public.tourneo_notifications') is not null
 union all select 'stage4_evaluations',to_regclass('public.tourneo_evaluations') is not null
 union all select 'stage4_rls_all',not exists(
  select 1 from (values ('public.tourneo_preferences'),('public.tourneo_notifications'),('public.tourneo_evaluations')) t(name)
  where not coalesce((select relrowsecurity from pg_class where oid=to_regclass(t.name)),false))
 union all select 'stage4_anon_no_insert',not exists(
  select 1 from (values ('public.tourneo_preferences'),('public.tourneo_notifications'),('public.tourneo_evaluations')) t(name)
  where has_table_privilege('anon',t.name,'INSERT'))
 union all select 'stage4_private_evaluation_rpc',to_regprocedure('tourneo_private.peut_evaluer(uuid)') is not null
 union all select 'stage4_evaluation_private_for_anon',
  not has_function_privilege('anon','tourneo_private.peut_evaluer(uuid)','EXECUTE')
 union all select 'stage4_preferences_timestamp',
  exists(select 1 from pg_trigger where tgrelid='public.tourneo_preferences'::regclass and tgname='preferences_timestamp' and not tgisinternal)
 union all select 'stage4_registration_notify',
  exists(select 1 from pg_trigger where tgrelid='public.tourneo_inscriptions'::regclass and tgname='notification_inscription' and not tgisinternal)
 union all select 'stage4_score_notify',
  exists(select 1 from pg_trigger where tgrelid='public.tourneo_scores_proposes'::regclass and tgname='notification_score' and not tgisinternal)
 union all select 'stage4_no_unfiltered_public_rpc',
  to_regprocedure('public.tourneo_public_v2(uuid)') is null
)
select item,case when ok then 'OK' else 'STOP' end as status from v order by item;
