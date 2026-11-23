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

-- Only a coarse range of confirmed accounts. No user identifiers or anonymous visitor tracking.
create or replace function tourneo_private.communaute_publique()returns jsonb language plpgsql stable security definer set search_path='' as $declare n bigint;pas bigint;begin
 select count(*)into n from auth.users where email_confirmed_at is not null and deleted_at is null and not coalesce(is_anonymous,false)and(banned_until is null or banned_until<=now());
 pas:=case when n<100 then 10 when n<1000 then 100 else 1000 end;
 return jsonb_build_object('minimum',(n/pas)*pas,'maximum',(n/pas)*pas+pas-1,'mesure','comptes_confirmes');
end$;
-- Exposed wrapper remains explicitly bounded; anon never receives broad USAGE on tourneo_private.
create or replace function public.tourneo_communaute_publique()returns jsonb language sql stable security definer set search_path='' as $select tourneo_private.communaute_publique()$;
revoke all on function public.tourneo_communaute_publique(),tourneo_private.communaute_publique()from public,anon,authenticated;
grant execute on function public.tourneo_communaute_publique()to anon,authenticated;

-- Moderation is limited to albums already explicitly shared. No privilege to private originals.
create function tourneo_private.admin_albums_partages(p_page integer)returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if tourneo_private.role_admin()is distinct from 'superadmin'then raise exception 'Accès super administrateur requis';end if;
 if p_page is null or p_page<0 or p_page>10000 then raise exception 'Page invalide';end if;
 return(select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb)from(select t.id,t.nom,count(p.photo_id)as photos,max(a.created_at)as derniere_photo from public.tournois t join public.tourneo_album_config c on c.tournoi_id=t.id join public.tourneo_album_partages p on p.tournoi_id=t.id join public.tourneo_album_photos a on a.id=p.photo_id where c.partage and p.apercu_path is not null and(t.photos_expirent_at is null or t.photos_expirent_at>now())group by t.id,t.nom order by max(a.created_at)desc,t.id limit 30 offset p_page*30)q);
end$$;
create function tourneo_private.admin_ouvrir_album(p_tournoi uuid,p_motif text)returns jsonb language plpgsql security definer set search_path='' as $$declare r jsonb;begin
 if tourneo_private.role_admin()is distinct from 'superadmin'then raise exception 'Accès super administrateur requis';end if;
 if p_motif is null or char_length(trim(p_motif))not between 3 and 300 then raise exception 'Motif requis (3 à 300 caractères)';end if;
 r:=tourneo_private.album_public(p_tournoi);
 if not coalesce((r->>'actif')::boolean,false)then raise exception 'Album non partagé ou expiré';end if;
 insert into tourneo_private.journal_admin(acteur_id,cible_id,action,motif,apres)select auth.uid(),t.user_id,'consultation_album_partage',trim(p_motif),jsonb_build_object('tournoi_id',p_tournoi,'fin_consultation',now()+interval '5 minutes')from public.tournois t where t.id=p_tournoi;
 -- No quality download paths are needed for moderation.
 return jsonb_build_object('tournoi_id',p_tournoi,'expire_at',now()+interval '5 minutes','photos',coalesce((select jsonb_agg(jsonb_build_object('id',p->>'id','path',p->>'path','legende',p->>'legende'))from jsonb_array_elements(r->'photos')p),'[]'::jsonb));
end$$;
create function public.tourneo_admin_albums_partages(p_page integer default 0)returns jsonb language sql stable security invoker set search_path='' as $$select tourneo_private.admin_albums_partages(p_page)$$;
create function public.tourneo_admin_ouvrir_album(p_tournoi uuid,p_motif text)returns jsonb language sql security invoker set search_path='' as $$select tourneo_private.admin_ouvrir_album(p_tournoi,p_motif)$$;
revoke all on function public.tourneo_admin_albums_partages(integer),tourneo_private.admin_albums_partages(integer),public.tourneo_admin_ouvrir_album(uuid,text),tourneo_private.admin_ouvrir_album(uuid,text)from public,anon;
grant execute on function public.tourneo_admin_albums_partages(integer),tourneo_private.admin_albums_partages(integer),public.tourneo_admin_ouvrir_album(uuid,text),tourneo_private.admin_ouvrir_album(uuid,text)to authenticated;
