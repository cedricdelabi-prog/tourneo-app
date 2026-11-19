-- TOURNEO V2 : PHASE 12 - ALBUM PRIVE ET CONSERVATION DES PHOTOS.
-- UNIQUEMENT SUR UNE COPIE V1 RESTAUREE DANS UN STAGING ISOLE.
-- Les dates de conservation ont deja ete ajoutees en phase 1 : pas de doublon.
-- Aucune activation du partage public dans cette phase.
-- Validation EXPLICITE sur la connexion staging, hors de ce fichier :
-- select set_config('tourneo.v1_copy_verified','true',false);
-- Jamais sur la V1 de production ni sur le projet V2 de test existant.
begin;
do $$
begin
 if current_setting('tourneo.v1_copy_verified',true) is distinct from 'true'
 then raise exception 'STAGING STOP: copie V1 restauree non explicitement confirmee'; end if;
 if to_regclass('public.tournois') is null
 or to_regclass('public.profiles') is null
 or to_regclass('public.tourneo_appels') is null
 or to_regclass('public.tourneo_modeles_affiche') is null
 or to_regprocedure('public.tourneo_mes_participations()') is null
 or to_regclass('storage.buckets') is null
 or to_regclass('storage.objects') is null
 or to_regprocedure('storage.foldername(text)') is null
 or not exists(select 1 from information_schema.columns where table_schema='public'
   and table_name='tournois' and column_name='photos_expirent_at')
 or not exists(select 1 from information_schema.columns where table_schema='public'
   and table_name='tournois' and column_name='termine_at')
 or not exists(select 1 from information_schema.columns where table_schema='storage'
   and table_name='objects' and column_name='created_at')
 or not exists(select 1 from storage.buckets
   where id='tourneo-media' and public is false)
 then raise exception 'STAGING STOP: phases 1 a 11 ou Storage incomplets'; end if;
 if (select count(*) from auth.users)=0
 or (select count(*) from public.tournois)=0
 or exists(select 1 from public.tournois where partage_id is null)
 or not exists(select 1 from pg_trigger where tgrelid='auth.users'::regclass
   and tgname='on_auth_user_created_tourneo' and not tgisinternal)
 then raise exception 'STAGING STOP: sauvegarde comptes ou anciens partages V1 non verifiee'; end if;
 if to_regclass('public.tourneo_album_photos') is not null
 or to_regclass('public.tourneo_jobs_photos') is not null
 or to_regprocedure('public.tourneo_duree_photo(uuid)') is not null
 or to_regprocedure('tourneo_private.dater_photos_tournoi()') is not null
 then raise exception 'STAGING STOP: phase 12 deja installee ou partielle'; end if;
end $$;

-- Mettre les dates de retention en place, sans re-ajouter les colonnes V1.
create function tourneo_private.dater_photos_tournoi()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
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
returns integer language sql stable security invoker set search_path=public,pg_temp as $$
 select case when photos_expirent_at is null then 3600 else greatest(0,least(3600,floor(extract(epoch from photos_expirent_at-now()))::integer))end
 from public.tournois where id=p_tournoi and user_id=auth.uid();
$$;
revoke all on function public.tourneo_duree_photo(uuid) from public,anon;
grant execute on function public.tourneo_duree_photo(uuid) to authenticated;
alter policy media_owner_read on storage.objects using(
 bucket_id='tourneo-media' and (storage.foldername(name))[1]=(select auth.uid())::text
 and ((storage.foldername(name))[2] is distinct from 'tournois' or exists(select 1 from public.tournois t where t.id::text=(storage.foldername(name))[3] and t.user_id=(select auth.uid()) and (t.photos_expirent_at is null or t.photos_expirent_at>now())))
);
create table public.tourneo_jobs_photos (
 token uuid primary key default gen_random_uuid(),
 expires_at timestamptz not null default(now()+interval '10 minutes')
);
alter table public.tourneo_jobs_photos enable row level security;
revoke all on public.tourneo_jobs_photos from public,anon,authenticated;
grant select,insert,delete on public.tourneo_jobs_photos to service_role;
create function public.tourneo_consomme_job_photo(p_token uuid)
returns boolean language sql security invoker set search_path=public,pg_temp as $$
 with consomme as(delete from public.tourneo_jobs_photos where token=p_token and expires_at>now() returning token)
 select exists(select 1 from consomme);
$$;
create function public.tourneo_photos_a_supprimer()
returns table(name text) language sql stable security invoker set search_path=public,pg_temp as $$
 select o.name from storage.objects o
 left join public.tournois t on t.id::text=split_part(o.name,'/',3) and t.user_id::text=split_part(o.name,'/',1)
 where o.bucket_id='tourneo-media' and split_part(o.name,'/',2)='tournois'
 and ((t.id is not null and t.photos_expirent_at<=now()) or(t.id is null and o.created_at<now()-interval '1 day'))
 order by o.created_at,o.name limit 100;
$$;
create function public.tourneo_nettoyer_photos_inline()
returns void language sql security invoker set search_path=public,pg_temp as $$
 update public.tournois set donnees=(donnees-'podiumPhotoUrl')||
 case when jsonb_typeof(donnees->'podiumFinal')='array' then jsonb_build_object('podiumFinal',(select coalesce(jsonb_agg(e-'photo'),'[]'::jsonb) from jsonb_array_elements(donnees->'podiumFinal')e)) else '{}'::jsonb end
 where photos_expirent_at<=now() and (donnees?'podiumPhotoUrl' or exists(select 1 from jsonb_array_elements(case when jsonb_typeof(donnees->'podiumFinal')='array' then donnees->'podiumFinal' else '[]'::jsonb end)e where e?'photo'));
$$;
revoke all on function public.tourneo_consomme_job_photo(uuid),public.tourneo_photos_a_supprimer(),public.tourneo_nettoyer_photos_inline() from public,anon,authenticated;
grant execute on function public.tourneo_consomme_job_photo(uuid),public.tourneo_photos_a_supprimer(),public.tourneo_nettoyer_photos_inline() to service_role;
grant select,update on public.tournois to service_role;

-- Empêcher la remise de photos en cache après l'échéance.
create or replace function tourneo_private.dater_photos_tournoi()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if TG_OP='INSERT' then new.termine_at:=null;new.photos_expirent_at:=null;
 else new.termine_at:=old.termine_at;new.photos_expirent_at:=old.photos_expirent_at;end if;
 if new.termine_at is null and new.donnees->>'termine'='true' then
  new.termine_at:=now();
  new.photos_expirent_at:=now()+case when new.donnees->'optionsV2'->>'mode'='expert' then interval '90 days' else interval '15 days' end;
 end if;
 if new.photos_expirent_at<=now() then
  new.donnees:=(new.donnees-'podiumPhotoUrl')||
  case when jsonb_typeof(new.donnees->'podiumFinal')='array' then
   jsonb_build_object('podiumFinal',(select coalesce(jsonb_agg(e-'photo'),'[]'::jsonb) from jsonb_array_elements(new.donnees->'podiumFinal')e))
  else '{}'::jsonb end;
 end if;
 new.updated_at:=now();
 return new;
end $$;

-- Organizer's private album reuses the existing private bucket and retention worker.
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


-- Uploads interdits apres expiration, y compris sur un chemin deja existant.
-- La suppression du fichier reste possible pour nettoyer un stockage ancien.
alter policy media_owner_insert on storage.objects with check (
 bucket_id='tourneo-media'
 and (storage.foldername(name))[1]=(select auth.uid())::text
 and ((storage.foldername(name))[2] is distinct from 'tournois'
  or exists(select 1 from public.tournois t
    where t.id::text=(storage.foldername(name))[3]
    and t.user_id=(select auth.uid())
    and (t.photos_expirent_at is null or t.photos_expirent_at>now())))
);
alter policy media_owner_update on storage.objects using (
 bucket_id='tourneo-media'
 and (storage.foldername(name))[1]=(select auth.uid())::text
 and ((storage.foldername(name))[2] is distinct from 'tournois'
  or exists(select 1 from public.tournois t
    where t.id::text=(storage.foldername(name))[3]
    and t.user_id=(select auth.uid())
    and (t.photos_expirent_at is null or t.photos_expirent_at>now())))
) with check (
 bucket_id='tourneo-media'
 and (storage.foldername(name))[1]=(select auth.uid())::text
 and ((storage.foldername(name))[2] is distinct from 'tournois'
  or exists(select 1 from public.tournois t
    where t.id::text=(storage.foldername(name))[3]
    and t.user_id=(select auth.uid())
    and (t.photos_expirent_at is null or t.photos_expirent_at>now())))
);

-- Les fichiers physiques ne doivent jamais etre supprimes par SQL :
-- le worker de purge utilise la Storage API et les RPC service_role.
commit;
