-- Palmarès V2 : seuls les résultats autorisés sont lisibles.
begin;
set local lock_timeout = '3s';

create table public.player_results (
 id uuid primary key default gen_random_uuid(),
 tournament_id uuid not null references public.tournois(id) on delete cascade,
 profile_id uuid not null references public.profiles(id) on delete cascade,
 tournament_name text not null,
 sport text not null,
 placement integer not null check(placement between 1 and 256),
 points integer not null check(points between 0 and 100),
 created_at timestamptz not null default now(),
 unique(tournament_id,profile_id)
);
create index player_results_profile_id on public.player_results(profile_id);
alter table public.player_results enable row level security;
revoke all on public.player_results from public,anon,authenticated;
grant select on public.player_results to authenticated;
grant insert,update,delete on public.player_results to authenticated;
create policy results_read on public.player_results for select to authenticated
 using(profile_id=(select auth.uid()) or exists(
  select 1 from public.tournois t
  where t.id=tournament_id and (t.est_public or t.user_id=(select auth.uid()))
 ));
create policy results_owner_insert on public.player_results for insert to authenticated
 with check(exists(select 1 from public.tournois t
 where t.id=tournament_id and t.user_id=(select auth.uid())));
create policy results_owner_update on public.player_results for update to authenticated
 using(exists(select 1 from public.tournois t
 where t.id=tournament_id and t.user_id=(select auth.uid())))
 with check(exists(select 1 from public.tournois t
 where t.id=tournament_id and t.user_id=(select auth.uid())));
create policy results_owner_delete on public.player_results for delete to authenticated
 using(exists(select 1 from public.tournois t
 where t.id=tournament_id and t.user_id=(select auth.uid())));

commit;
