-- Après la migration V2, les liens publics passent par les fonctions de projection.
-- Les clients V1 utilisent toujours get_tourneo_public(uuid).
begin;
do $$
begin
 if to_regprocedure('public.tourneo_public_compat_v2(uuid)') is null
 or not exists (
  select 1 from pg_proc
  where oid = 'public.get_tourneo_public(uuid)'::regprocedure
  and prosrc like '%public.tourneo_public_compat_v2%'
 ) then
  raise exception 'Projection publique compatible V1 requise';
 end if;
end $$;

drop policy if exists "Consulter un tournoi public" on public.tournois;
revoke select on public.tournois from public, anon;

do $$
begin
 if has_table_privilege('anon', 'public.tournois', 'SELECT')
 or not has_table_privilege('authenticated', 'public.tournois', 'SELECT')
 or not has_function_privilege('anon', 'public.get_tourneo_public(uuid)', 'EXECUTE')
 or not has_function_privilege('anon', 'public.tourneo_public_compat_v2(uuid)', 'EXECUTE')
 then
  raise exception 'Droits de lecture incompatibles avec la publication';
 end if;
end $$;
commit;
