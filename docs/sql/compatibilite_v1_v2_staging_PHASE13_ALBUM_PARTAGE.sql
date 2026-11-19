-- TOURNEO V2 : PHASE 13 - ALBUM VOLONTAIRE, APERCUS SEULS.
-- UNIQUEMENT COPIE V1 RESTAUREE EN STAGING ISOLE, apres phases 1 a 12.
-- Ne jamais executer sur V1 production ni sur projet V2 test deja initialise.
-- Valider manuellement cette connexion de copie restauree :
-- select set_config('tourneo.v1_copy_verified','true',false);
-- Transaction atomique: aucun lecteur ne voit le helper intermediaire.
-- Les originaux sont exclus de l'acces public. Les copies derivees sont
-- accessibles seulement en cas d'opt-in (partage=true) non expire.
-- Les versions qualité nécessitent en plus (telechargement=true).
begin;
do $$
begin
 if current_setting('tourneo.v1_copy_verified',true) is distinct from 'true'
 then raise exception 'STAGING STOP: copie restauree V1 non confirmee'; end if;
 if to_regclass('public.tournois') is null or to_regclass('public.tourneo_album_photos') is null
 or to_regclass('public.tourneo_jobs_photos') is null
 or to_regprocedure('public.tourneo_mes_participations()') is null
 or to_regprocedure('public.tourneo_duree_photo(uuid)') is null
 or to_regnamespace('tourneo_private') is null
 or to_regprocedure('storage.allow_any_operation(text[])') is null
 or not exists(select 1 from storage.buckets where id='tourneo-media' and public is false)
 then raise exception 'STAGING STOP: phases 1 a 12/Storage incomplets'; end if;
 if (select count(*) from auth.users)=0 or (select count(*) from public.tournois)=0
 or exists(select 1 from public.tournois where partage_id is null)
 or not exists(select 1 from pg_trigger where tgrelid='auth.users'::regclass
   and tgname='on_auth_user_created_tourneo' and not tgisinternal)
 then raise exception 'STAGING STOP: comptes ou anciens liens V1 incomplets'; end if;
 if to_regclass('public.tourneo_album_config') is not null
 or to_regclass('public.tourneo_album_partages') is not null
 or to_regprocedure('public.tourneo_album_public(uuid)') is not null
 or to_regprocedure('tourneo_private.album_photo_partagee(text)') is not null
 or exists(select 1 from pg_policies where schemaname='storage'
   and tablename='objects' and policyname='album_images_partagees')
 then raise exception 'STAGING STOP: phase 13 deja installee ou schema partiel'; end if;
end $$;
-- Security definer du wrapper strictement borne a la projection publique:
-- anon ne doit pas obtenir USAGE du schema prive.
-- Explicit opt-in sharing of branded derivatives only; originals keep their existing private policies.
create table public.tourneo_album_config(
 tournoi_id uuid primary key references public.tournois(id)on delete cascade,
 partage boolean not null default false,
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
create policy album_partages_ajout on public.tourneo_album_partages for insert to authenticated with check(user_id=(select auth.uid())and exists(select 1 from public.tourneo_album_photos p where p.id=photo_id and p.tournoi_id=tourneo_album_partages.tournoi_id and p.user_id=(select auth.uid()))and exists(select 1 from storage.objects o where o.bucket_id='tourneo-media'and o.name=path));
create policy album_partages_modification on public.tourneo_album_partages for update to authenticated using(user_id=(select auth.uid()))with check(user_id=(select auth.uid())and exists(select 1 from public.tourneo_album_photos p where p.id=photo_id and p.tournoi_id=tourneo_album_partages.tournoi_id and p.user_id=(select auth.uid()))and exists(select 1 from storage.objects o where o.bucket_id='tourneo-media'and o.name=path));
create policy album_partages_retrait on public.tourneo_album_partages for delete to authenticated using(user_id=(select auth.uid()));
-- Non-exposed authorization helper for the deliberately public derived images.
create function tourneo_private.album_photo_partagee(p_path text)returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.tourneo_album_partages p join public.tourneo_album_config c on c.tournoi_id=p.tournoi_id join public.tournois t on t.id=p.tournoi_id where p.path=p_path and c.partage and(t.photos_expirent_at is null or t.photos_expirent_at>now()))
$$;
revoke all on function tourneo_private.album_photo_partagee(text)from public;
grant execute on function tourneo_private.album_photo_partagee(text)to anon,authenticated;
-- Read individual files only, never anonymously list/sign originals or other objects.
grant select on storage.objects to anon;
create policy album_images_partagees on storage.objects for select to anon,authenticated using(bucket_id='tourneo-media'and storage.allow_any_operation(array['object.get_authenticated','object.get_authenticated_info'])and tourneo_private.album_photo_partagee(name));
create function tourneo_private.album_public(p_tournoi uuid)returns jsonb language sql stable security definer set search_path='' as $$
 select case when exists(select 1 from public.tourneo_album_config c join public.tournois t on t.id=c.tournoi_id where c.tournoi_id=p_tournoi and c.partage and(t.photos_expirent_at is null or t.photos_expirent_at>now()))then jsonb_build_object('actif',true,'photos',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'path',p.path,'legende',a.legende,'created_at',a.created_at)order by a.created_at desc)from public.tourneo_album_partages p join public.tourneo_album_photos a on a.id=p.photo_id where p.tournoi_id=p_tournoi),'[]'::jsonb))else jsonb_build_object('actif',false,'photos','[]'::jsonb)end
$$;
create function public.tourneo_album_public(p_tournoi uuid)returns jsonb language sql stable security definer set search_path='' as $$select tourneo_private.album_public(p_tournoi)$$;
revoke all on function public.tourneo_album_public(uuid),tourneo_private.album_public(uuid)from public;
grant execute on function public.tourneo_album_public(uuid),tourneo_private.album_public(uuid)to anon,authenticated;

-- Durcissement sans fenêtre de publication: aperçu requis avant partage.
-- Public previews and quality downloads are different objects. Originals remain private.
alter table public.tourneo_album_config add column telechargement boolean not null default true;
alter table public.tourneo_album_partages add column apercu_path text unique;
alter table public.tourneo_album_partages add constraint album_apercu_chemin check(apercu_path is null or apercu_path=user_id::text||'/tournois/'||tournoi_id::text||'/album-apercu-'||photo_id::text||'.jpg');
-- A legacy quality image must never silently become the new watermarked preview.
update public.tourneo_album_config c set partage=false where exists(select 1 from public.tourneo_album_partages p where p.tournoi_id=c.tournoi_id and p.apercu_path is null);
create or replace function tourneo_private.album_photo_partagee(p_path text)returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.tourneo_album_partages p join public.tourneo_album_config c on c.tournoi_id=p.tournoi_id join public.tournois t on t.id=p.tournoi_id where p.apercu_path is not null and(p.apercu_path=p_path or(c.telechargement and p.path=p_path))and c.partage and(t.photos_expirent_at is null or t.photos_expirent_at>now()))
$$;
create or replace function tourneo_private.album_public(p_tournoi uuid)returns jsonb language sql stable security definer set search_path='' as $$
 select case when exists(select 1 from public.tourneo_album_config c join public.tournois t on t.id=c.tournoi_id where c.tournoi_id=p_tournoi and c.partage and(t.photos_expirent_at is null or t.photos_expirent_at>now()))then jsonb_build_object('actif',true,'telechargement',(select telechargement from public.tourneo_album_config where tournoi_id=p_tournoi),'photos',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'path',p.apercu_path,'telechargement_path',case when c.telechargement then p.path else null end,'legende',a.legende,'created_at',a.created_at)order by a.created_at desc,a.id)from public.tourneo_album_partages p join public.tourneo_album_photos a on a.id=p.photo_id join public.tourneo_album_config c on c.tournoi_id=p.tournoi_id where p.tournoi_id=p_tournoi and p.apercu_path is not null),'[]'::jsonb))else jsonb_build_object('actif',false,'telechargement',false,'photos','[]'::jsonb)end
$$;
-- The owner must have uploaded the preview before it can be registered for sharing.
drop policy album_partages_ajout on public.tourneo_album_partages;
drop policy album_partages_modification on public.tourneo_album_partages;
create policy album_partages_ajout on public.tourneo_album_partages for insert to authenticated with check(user_id=(select auth.uid())and exists(select 1 from public.tourneo_album_photos p where p.id=photo_id and p.tournoi_id=tourneo_album_partages.tournoi_id and p.user_id=(select auth.uid()))and exists(select 1 from storage.objects o where o.bucket_id='tourneo-media'and o.name=path)and(apercu_path is null or exists(select 1 from storage.objects o where o.bucket_id='tourneo-media'and o.name=apercu_path)));
create policy album_partages_modification on public.tourneo_album_partages for update to authenticated using(user_id=(select auth.uid()))with check(user_id=(select auth.uid())and exists(select 1 from public.tourneo_album_photos p where p.id=photo_id and p.tournoi_id=tourneo_album_partages.tournoi_id and p.user_id=(select auth.uid()))and exists(select 1 from storage.objects o where o.bucket_id='tourneo-media'and o.name=path)and(apercu_path is null or exists(select 1 from storage.objects o where o.bucket_id='tourneo-media'and o.name=apercu_path)));

-- Contrôles atomiques avant activation du partage.
do $$
begin
 if (select public from storage.buckets where id='tourneo-media') is distinct from false
 or not exists(select 1 from pg_policies where schemaname='storage'
   and tablename='objects' and policyname='album_images_partagees' and cmd='SELECT')
 or not (select relrowsecurity from pg_class where oid='public.tourneo_album_config'::regclass)
 or not (select relrowsecurity from pg_class where oid='public.tourneo_album_partages'::regclass)
 or has_table_privilege('anon','public.tourneo_album_photos','SELECT')
 or has_table_privilege('anon','public.tourneo_album_partages','SELECT')
 or has_table_privilege('anon','public.tourneo_album_config','SELECT')
 or has_schema_privilege('anon','tourneo_private','USAGE')
 or exists(select 1 from public.tourneo_album_config where partage is true)
 then raise exception 'STAGING STOP: protection de partage non suffisante'; end if;
end $$;
commit;
