-- STAGING ONLY after V2 RPCs and share compatibility are installed and tested.
-- Replace legacy broad SELECT policies with V2 owner-only RLS.
-- Anonymous sharing must use sanitized public.tourneo_public_v2 /
-- public.tourneo_public_compat_v2, not SELECT on public.tournois.
begin;
do $$
begin
 if to_regprocedure('public.tourneo_public_compat_v2(uuid)') is null
 or to_regprocedure('public.tourneo_public_v2_internal(uuid)') is null
 then raise exception 'Public V2 sharing security gates missing: do not change RLS';
 end if;
end $$;
drop policy if exists "Consulter un tournoi public" on public.tournois;
drop policy if exists "Lire ses tournois" on public.tournois;
drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "tournois_owner" on public.tournois;
drop policy if exists "profiles_owner" on public.profiles;
create policy "tournois_owner" on public.tournois for all to authenticated
 using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "profiles_owner" on public.profiles for all to authenticated
 using (id=(select auth.uid())) with check (id=(select auth.uid()));
-- Existing own-row INSERT/UPDATE/DELETE policies remain; they do not widen SELECT.
-- Privileges must be separately audited: RLS alone is not a substitute for GRANT/REVOKE.
commit;
