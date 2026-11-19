-- Tourneo sur copie V1 restauree : verification lecture seule apres partage phase 5.
-- Les URL et utilisateurs reels ne sont jamais exposes dans cette requete.
with v(item,ok) as (
 select 'v1_auth', (select count(*) from auth.users)>0
 union all select 'v1_tournois',(select count(*) from public.tournois)>0
 union all select 'v1_partages_preserves',not exists(select 1 from public.tournois where partage_id is null)
 union all select 'v1_partages_uniques',not exists(select 1 from public.tournois group by partage_id having count(*)>1)
 union all select 'v1_ancien_rpc_conserve',to_regprocedure('public.get_tourneo_public(uuid)') is not null
 union all select 'v2_public_rpc_sanitise',to_regprocedure('public.tourneo_public_v2(uuid)') is not null
 union all select 'v2_ancien_alias_rpc',to_regprocedure('public.tourneo_public_compat_v2(uuid)') is not null
 union all select 'v2_alias_reference_privee',to_regprocedure('tourneo_private.reference_publique(uuid,text)') is not null
 union all select 'v2_anon_public_access',has_function_privilege('anon','public.tourneo_public_v2(uuid)','EXECUTE')
 union all select 'v2_anon_legacy_alias_access',has_function_privilege('anon','public.tourneo_public_compat_v2(uuid)','EXECUTE')
 union all select 'v2_reference_not_exposed',not has_function_privilege('anon','tourneo_private.reference_publique(uuid,text)','EXECUTE')
)
select item, case when ok then 'OK' else 'STOP' end as status from v order by item;
-- Un controle de fonctions ne remplace pas un test HTTP RPC en role anon.
