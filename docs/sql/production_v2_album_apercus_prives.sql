-- Préparation des aperçus par le propriétaire. Aucun accès anonyme.
begin;

create table public.tourneo_album_partages(
 photo_id uuid primary key references public.tourneo_album_photos(id)on delete cascade,
 tournoi_id uuid not null references public.tournois(id)on delete cascade,
 user_id uuid not null references auth.users(id)on delete cascade,
 path text not null unique,
 check(path=user_id::text||'/tournois/'||tournoi_id::text||'/album-partage-'||photo_id::text||'.jpg')
);
create index album_partages_tournoi on public.tourneo_album_partages(tournoi_id);
alter table public.tourneo_album_partages enable row level security;
revoke all on public.tourneo_album_partages from public,anon,authenticated;
grant select,insert,update,delete on public.tourneo_album_partages to authenticated;
create policy album_partages_lecture on public.tourneo_album_partages for select to authenticated using(user_id=(select auth.uid()));
create policy album_partages_retrait on public.tourneo_album_partages for delete to authenticated using(user_id=(select auth.uid()));

alter table public.tourneo_album_partages add column apercu_path text unique;
alter table public.tourneo_album_partages add constraint album_apercu_chemin check(apercu_path is null or apercu_path=user_id::text||'/tournois/'||tournoi_id::text||'/album-apercu-'||photo_id::text||'.jpg');

-- The owner must have uploaded the preview before it can be registered for sharing.
create policy album_partages_ajout on public.tourneo_album_partages for insert to authenticated with check(user_id=(select auth.uid())and exists(select 1 from public.tourneo_album_photos p where p.id=photo_id and p.tournoi_id=tourneo_album_partages.tournoi_id and p.user_id=(select auth.uid()))and exists(select 1 from storage.objects o where o.bucket_id='tourneo-media'and o.name=tourneo_album_partages.path)and(apercu_path is null or exists(select 1 from storage.objects o where o.bucket_id='tourneo-media'and o.name=tourneo_album_partages.apercu_path)));
create policy album_partages_modification on public.tourneo_album_partages for update to authenticated using(user_id=(select auth.uid()))with check(user_id=(select auth.uid())and exists(select 1 from public.tourneo_album_photos p where p.id=photo_id and p.tournoi_id=tourneo_album_partages.tournoi_id and p.user_id=(select auth.uid()))and exists(select 1 from storage.objects o where o.bucket_id='tourneo-media'and o.name=tourneo_album_partages.path)and(apercu_path is null or exists(select 1 from storage.objects o where o.bucket_id='tourneo-media'and o.name=tourneo_album_partages.apercu_path)));

commit;
