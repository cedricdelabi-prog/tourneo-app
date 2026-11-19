-- Tourneo V2 : vérifications en lecture seule sur staging V1 après phase 6.
-- Pas de noms de personnes, adresses, liens ni UUID remontés.
with v(item,ok) as (
 select 'v1_profiles_retained',(select count(*) from public.profiles)>0
 union all select 'v1_tournaments_retained',(select count(*) from public.tournois)>0
 union all select 'v1_historical_shares_retained',not exists(select 1 from public.tournois where partage_id is null)
 union all select 'v2_historical_link_rpc',to_regprocedure('public.tourneo_public_compat_v2(uuid)') is not null
 union all select 'groups_table_exists',to_regclass('public.tourneo_groupes') is not null
 union all select 'group_members_table_exists',to_regclass('public.tourneo_groupe_membres') is not null
 union all select 'group_participants_table_exists',to_regclass('public.tourneo_groupe_participants') is not null
 union all select 'groups_rls_enabled',not exists(
  select 1 from (values ('public.tourneo_groupes'),('public.tourneo_groupe_membres'),
  ('public.tourneo_groupe_participants')) as t(name)
  where not coalesce((select relrowsecurity from pg_class where oid=to_regclass(t.name)),false))
 union all select 'groups_no_anon_select',not exists(
  select 1 from (values ('public.tourneo_groupes'),('public.tourneo_groupe_membres'),
  ('public.tourneo_groupe_participants')) as t(name)
  where has_table_privilege('anon',t.name,'SELECT'))
 union all select 'groups_no_anon_insert',not exists(
  select 1 from (values ('public.tourneo_groupes'),('public.tourneo_groupe_membres'),
  ('public.tourneo_groupe_participants')) as t(name)
  where has_table_privilege('anon',t.name,'INSERT'))
 union all select 'owner_group_role_rpc',to_regprocedure('tourneo_private.role_groupe(uuid)') is not null
 union all select 'owner_group_role_not_anon',
  not has_function_privilege('anon','tourneo_private.role_groupe(uuid)','EXECUTE')
 union all select 'member_share_rpc',to_regprocedure('public.tourneo_partager_groupe(uuid,text,text)') is not null
 union all select 'member_share_rpc_not_anon',
  not has_function_privilege('anon','public.tourneo_partager_groupe(uuid,text,text)','EXECUTE')
 union all select 'language_column',exists(select 1 from information_schema.columns where table_schema='public' and table_name='tourneo_preferences' and column_name='langue')
 union all select 'individual_ranking_not_anon',
  not has_table_privilege('anon','public.player_results','SELECT')
 union all select 'individual_ranking_authenticated',
  has_table_privilege('authenticated','public.player_results','SELECT')
 union all select 'v1_signup_trigger_retained',exists(
  select 1 from pg_trigger where tgrelid='auth.users'::regclass and
   tgname='on_auth_user_created_tourneo' and not tgisinternal)
)
select item, case when ok then 'OK' else 'STOP' end as status from v order by item;
-- Ce n'est pas une preuve de restauration reelle ni de tests de connexion.
