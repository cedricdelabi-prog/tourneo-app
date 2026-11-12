alter table public.tournois add column termine_at timestamptz, add column photos_expirent_at timestamptz;
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
