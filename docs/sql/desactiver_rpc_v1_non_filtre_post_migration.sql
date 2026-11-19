-- STAGING ONLY, after all V1 clients have been retired.
-- The legacy RPC returns unsanitized JSON; public V2 sharing must use the sanitized RPC.
begin;
do $$
begin
 if to_regprocedure('public.tourneo_public_compat_v2(uuid)') is null
 or to_regprocedure('public.tourneo_public_v2_internal(uuid)') is null
 or to_regprocedure('public.get_tourneo_public(uuid)') is null
 then raise exception 'V2 public security gates or V1 RPC missing; abort'; end if;
end $$;
revoke execute on function public.get_tourneo_public(uuid) from public,anon,authenticated;
do $$
begin
 if has_function_privilege('anon','public.get_tourneo_public(uuid)','EXECUTE')
 or has_function_privilege('authenticated','public.get_tourneo_public(uuid)','EXECUTE')
 then raise exception 'Legacy unsanitized RPC remains publicly executable';end if;
end $$;
commit;
