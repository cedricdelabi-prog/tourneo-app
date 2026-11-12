begin;
create table if not exists public.tourneo_evenements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  nom text not null check (char_length(trim(nom)) between 1 and 100),
  created_at timestamptz not null default now()
);
create table if not exists public.tourneo_evenement_tournois (
  evenement_id uuid not null references public.tourneo_evenements(id) on delete cascade,
  tournoi_id uuid not null references public.tournois(id) on delete cascade,
  primary key(evenement_id,tournoi_id)
);
alter table public.tourneo_evenements enable row level security;
alter table public.tourneo_evenement_tournois enable row level security;
revoke all on public.tourneo_evenements,public.tourneo_evenement_tournois from anon;
grant select,insert,update,delete on public.tourneo_evenements,public.tourneo_evenement_tournois to authenticated;
drop policy if exists evenements_owner on public.tourneo_evenements;
create policy evenements_owner on public.tourneo_evenements for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists evenement_tournois_owner on public.tourneo_evenement_tournois;
create policy evenement_tournois_owner on public.tourneo_evenement_tournois for all to authenticated
using(exists(select 1 from public.tourneo_evenements e where e.id=evenement_id and e.user_id=auth.uid()))
with check(exists(select 1 from public.tourneo_evenements e where e.id=evenement_id and e.user_id=auth.uid()) and exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=auth.uid()));
commit;
