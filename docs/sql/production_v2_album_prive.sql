-- Album privé et conservation des photos. Le bucket doit déjà être privé.
begin;
set local lock_timeout = '3s';
do $$ begin
 if not exists(select 1 from storage.buckets where id='tourneo-media' and not public) then raise exception 'Stockage privé tourneo-media requis'; end if;
 if not (select relrowsecurity from pg_class where oid='storage.objects'::regclass) then raise exception 'Protection du stockage requise'; end if;
end $$;

create policy media_owner_read on storage.objects for select to authenticated using(bucket_id='tourneo-media' and (storage.foldername(name))[1]=(select auth.uid())::text
 and ((storage.foldername(name))[2] is distinct from 'tournois' or exists(
  select 1 from public.tournois t where t.id::text=(storage.foldername(name))[3]
   and t.user_id=(select auth.uid()) and (t.photos_expirent_at is null or t.photos_expirent_at>now())
 )));
create policy media_owner_insert on storage.objects for insert to authenticated with check(bucket_id='tourneo-media' and (storage.foldername(name))[1]=(select auth.uid())::text
 and ((storage.foldername(name))[2] is distinct from 'tournois' or exists(
  select 1 from public.tournois t where t.id::text=(storage.foldername(name))[3]
   and t.user_id=(select auth.uid()) and (t.photos_expirent_at is null or t.photos_expirent_at>now())
 )));
create policy media_owner_update on storage.objects for update to authenticated using(bucket_id='tourneo-media' and (storage.foldername(name))[1]=(select auth.uid())::text
 and ((storage.foldername(name))[2] is distinct from 'tournois' or exists(
  select 1 from public.tournois t where t.id::text=(storage.foldername(name))[3]
   and t.user_id=(select auth.uid()) and (t.photos_expirent_at is null or t.photos_expirent_at>now())
 ))) with check(bucket_id='tourneo-media' and (storage.foldername(name))[1]=(select auth.uid())::text
 and ((storage.foldername(name))[2] is distinct from 'tournois' or exists(
  select 1 from public.tournois t where t.id::text=(storage.foldername(name))[3]
   and t.user_id=(select auth.uid()) and (t.photos_expirent_at is null or t.photos_expirent_at>now())
 )));
create policy media_owner_delete on storage.objects for delete to authenticated
 using(bucket_id='tourneo-media' and (storage.foldername(name))[1]=(select auth.uid())::text);

create function tourneo_private.dater_photos_tournoi()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='INSERT' then new.termine_at:=null;new.photos_expirent_at:=null;
 else new.termine_at:=old.termine_at;new.photos_expirent_at:=old.photos_expirent_at;end if;
 if new.termine_at is null and new.donnees->>'termine'='true' then
  new.termine_at:=now();
  new.photos_expirent_at:=now()+case when new.donnees->'optionsV2'->>'mode'='expert' then interval '90 days' else interval '15 days' end;
 end if;
 new.updated_at:=now();
 return new;
end $$;
revoke all on function tourneo_private.dater_photos_tournoi() from public,anon,authenticated;
create trigger date_conservation_photos before insert or update on public.tournois for each row execute function tourneo_private.dater_photos_tournoi();
create function public.tourneo_duree_photo(p_tournoi uuid)
returns integer language sql stable security invoker set search_path='' as $$
 select case when photos_expirent_at is null then 3600 else greatest(0,least(3600,floor(extract(epoch from photos_expirent_at-now()))::integer))end
 from public.tournois where id=p_tournoi and user_id=auth.uid();
$$;
revoke all on function public.tourneo_duree_photo(uuid) from public,anon;
grant execute on function public.tourneo_duree_photo(uuid) to authenticated;
create table public.tourneo_album_photos(id uuid primary key default gen_random_uuid(),tournoi_id uuid not null references public.tournois(id)on delete cascade,user_id uuid not null references auth.users(id)on delete cascade,path text not null unique,legende text not null default ''check(char_length(legende)<=200),created_at timestamptz not null default now(),check(path=user_id::text||'/tournois/'||tournoi_id::text||'/album-'||id::text||'.jpg'));
create index album_owner on public.tourneo_album_photos(user_id,tournoi_id);
alter table public.tourneo_album_photos enable row level security;
revoke all on public.tourneo_album_photos from public,anon,authenticated;
grant select,insert,delete on public.tourneo_album_photos to authenticated;
create policy album_lecture on public.tourneo_album_photos for select to authenticated using(user_id=(select auth.uid())and exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=(select auth.uid())and(t.photos_expirent_at is null or t.photos_expirent_at>now())));
create policy album_ajout on public.tourneo_album_photos for insert to authenticated with check(user_id=(select auth.uid())and exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=(select auth.uid())and(t.photos_expirent_at is null or t.photos_expirent_at>now())));
create policy album_retrait on public.tourneo_album_photos for delete to authenticated using(user_id=(select auth.uid()));
create function tourneo_private.quota_album()returns trigger language plpgsql security invoker set search_path='' as $$begin
 perform pg_advisory_xact_lock(hashtext(new.tournoi_id::text));
 if(select count(*)from public.tourneo_album_photos where tournoi_id=new.tournoi_id)>=200 then raise exception 'Deux cents photos maximum par tournoi';end if;
 if not exists(select 1 from storage.objects where bucket_id='tourneo-media'and name=new.path)then raise exception 'Photo non transférée';end if;return new;end$$;
create trigger quota_album before insert on public.tourneo_album_photos for each row execute function tourneo_private.quota_album();


create table public.tourneo_album_config(
 tournoi_id uuid primary key references public.tournois(id)on delete cascade,
 partage boolean not null default false,
 telechargement boolean not null default true,
 cadre text not null default 'bandeau'check(cadre in('bandeau','cadre','sobre')),
 couleur text not null default 'bleu'check(couleur in('bleu','noir','clair')),
 titre text not null default ''check(char_length(titre)<=150),
 date_texte text not null default ''check(char_length(date_texte)<=120),
 organisateur text not null default ''check(char_length(organisateur)<=150),
 logo text not null default ''check(char_length(logo)<=750000 and(logo=''or logo~'^data:image/png;base64,[A-Za-z0-9+/=]+$')),
 updated_at timestamptz not null default now()
);
alter table public.tourneo_album_config enable row level security;
revoke all on public.tourneo_album_config from public,anon,authenticated;
grant select,insert,update on public.tourneo_album_config to authenticated;
create policy album_config_lecture on public.tourneo_album_config for select to authenticated using(exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=(select auth.uid())));
create policy album_config_ajout on public.tourneo_album_config for insert to authenticated with check(exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=(select auth.uid())and(t.photos_expirent_at is null or t.photos_expirent_at>now())));
create policy album_config_modification on public.tourneo_album_config for update to authenticated using(exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=(select auth.uid())))with check(exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=(select auth.uid())));

commit;
