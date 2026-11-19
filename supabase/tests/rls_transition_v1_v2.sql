-- RLS transition regression on disposable V2 schema. Every operation is rolled back.
begin;
create policy "Consulter un tournoi public" on public.tournois for select to anon,authenticated using (true);
create policy "Lire ses tournois" on public.tournois for select to authenticated using (true);
create policy "profiles_select_authenticated" on public.profiles for select to authenticated using (true);
create function public.tourneo_public_v2_internal(p_id uuid) returns jsonb language sql stable as $$select null::jsonb$$;
create function public.tourneo_public_compat_v2(p_id uuid) returns jsonb language sql stable as $$select null::jsonb$$;
do $$
begin
 if to_regprocedure('public.tourneo_public_compat_v2(uuid)') is null
 or to_regprocedure('public.tourneo_public_v2_internal(uuid)') is null
 then raise exception 'Public V2 sharing security gates missing'; end if;
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
do $$
begin
 if exists(select 1 from pg_policies where schemaname='public'
 and ((tablename='tournois' and policyname in ('Consulter un tournoi public','Lire ses tournois'))
 or (tablename='profiles' and policyname='profiles_select_authenticated')))
 then raise exception 'Legacy broad read policy still present'; end if;
 if (select count(*) from pg_policies where schemaname='public'
 and ((tablename='tournois' and policyname='tournois_owner' and cmd='ALL' and qual like '%user_id%')
 or (tablename='profiles' and policyname='profiles_owner' and cmd='ALL' and qual like '%id%')))<>2
 then raise exception 'Owner policies missing'; end if;
end $$;
select 'RLS transition removes legacy broad reads and preserves owner rules: OK' as result;
rollback;
