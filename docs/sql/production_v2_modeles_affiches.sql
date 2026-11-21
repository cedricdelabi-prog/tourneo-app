begin;

-- Modèles d'affiches privés réutilisables, hors données de matchs.
-- Personal reusable designs. Tournament dates, participants and scores are never stored here.
create table public.tourneo_modeles_affiche (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 nom text not null check(char_length(btrim(nom)) between 1 and 100),
 sport text not null default 'petanque' check(char_length(sport) between 1 and 50),
 titre text not null default '' check(char_length(titre)<=150),
 lieu text not null default '' check(char_length(lieu)<=180),
 organisateur text not null default '' check(char_length(organisateur)<=150),
 identite jsonb not null default '{}' check(jsonb_typeof(identite)='object' and octet_length(identite::text)<=6100000)
);
create index on public.tourneo_modeles_affiche(user_id);
alter table public.tourneo_modeles_affiche enable row level security;
revoke all on public.tourneo_modeles_affiche from public,anon,authenticated;
grant select,insert,update,delete on public.tourneo_modeles_affiche to authenticated;
create policy modeles_affiche_proprietaire on public.tourneo_modeles_affiche for all to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
commit;
