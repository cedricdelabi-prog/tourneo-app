-- Tourneo V2 : controle en lecture seule apres migration des profils.
-- Ni adresse, ni nom civil, ni email, ni avatar ne sont renvoyes.
with v(item,ok) as (
 select 'v1_existing_profiles',(select count(*) from public.profiles)>0
 union all select 'v1_existing_tournaments',(select count(*) from public.tournois)>0
 union all select 'v1_historical_shares_preserved',not exists(
  select 1 from public.tournois where partage_id is null)
 union all select 'v1_account_creation_trigger',exists(
  select 1 from pg_trigger where tgrelid='auth.users'::regclass
   and tgname='on_auth_user_created_tourneo' and not tgisinternal)
 union all select 'v2_groups_present',to_regclass('public.tourneo_groupes') is not null
 union all select 'v2_group_member_listing',to_regclass('public.tourneo_groupe_membres') is not null
 union all select 'v2_historical_public_alias',to_regprocedure('public.tourneo_public_compat_v2(uuid)') is not null
 union all select 'v2_authenticated_lookup',to_regprocedure('public.tourneo_profils_publics(text,uuid[])') is not null
 union all select 'v2_lookup_not_public',not has_function_privilege('anon','public.tourneo_profils_publics(text,uuid[])','EXECUTE')
 union all select 'v2_lookup_for_members',has_function_privilege('authenticated','public.tourneo_profils_publics(text,uuid[])','EXECUTE')
)
select item,case when ok then 'OK' else 'STOP' end as status from v order by item;
-- Les tests fonctionnels role anon sont dans tests/migration-profils-v2.cjs.
