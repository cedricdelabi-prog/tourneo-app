-- Avis V2 réservés aux participants d’un tournoi terminé.
begin;
set local lock_timeout = '3s';

create table public.tourneo_evaluations (
 tournoi_id uuid not null references public.tournois(id) on delete cascade,
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 note integer not null check(note between 1 and 5),
 commentaire text not null default '' check(char_length(commentaire)<=1000),
 created_at timestamptz not null default now(),
 primary key(tournoi_id,user_id)
);
create index tourneo_evaluations_user on public.tourneo_evaluations(user_id);
alter table public.tourneo_evaluations enable row level security;
revoke all on public.tourneo_evaluations from public,anon,authenticated;
grant select,insert,delete on public.tourneo_evaluations to authenticated;
grant update(note,commentaire) on public.tourneo_evaluations to authenticated;

create function tourneo_private.peut_evaluer(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
 select 1 from public.tournois t where t.id=p_id and t.user_id<>auth.uid()
 and t.donnees->>'termine'='true'
 and (
 exists(select 1 from public.player_results r where r.tournament_id=t.id and r.profile_id=auth.uid())
 or exists(select 1 from public.tourneo_inscriptions i where i.tournoi_id=t.id and i.user_id=auth.uid() and i.statut='accepte')
 or exists(select 1 from jsonb_array_elements(coalesce(t.donnees->'equipes','[]'::jsonb)) e where coalesce(e->>'profilId',e->>'id')=auth.uid()::text)
 ));
$$;
revoke all on function tourneo_private.peut_evaluer(uuid) from public,anon;
grant execute on function tourneo_private.peut_evaluer(uuid) to authenticated;
create policy evaluations_read on public.tourneo_evaluations for select to authenticated using(user_id=(select auth.uid()) or exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=(select auth.uid())));
create policy evaluations_insert on public.tourneo_evaluations for insert to authenticated with check(user_id=(select auth.uid()) and tourneo_private.peut_evaluer(tournoi_id));
create policy evaluations_update on public.tourneo_evaluations for update to authenticated using(user_id=(select auth.uid()) and tourneo_private.peut_evaluer(tournoi_id)) with check(user_id=(select auth.uid()) and tourneo_private.peut_evaluer(tournoi_id));
create policy evaluations_delete on public.tourneo_evaluations for delete to authenticated using(user_id=(select auth.uid()));

commit;
