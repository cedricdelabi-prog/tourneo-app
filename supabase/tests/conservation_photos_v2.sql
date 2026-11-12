begin;
insert into auth.users(id,aud,role)values('a0000000-0000-4000-8000-000000000001','authenticated','authenticated');
set local role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',true);
insert into public.tournois(id,user_id,nom,donnees,termine_at,photos_expirent_at)values
('b0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','Simple','{"termine":true,"podiumPhotoUrl":"data:image/png;base64,TEST","podiumFinal":[{"nom":"A","photo":"TEST"}]}','2000-01-01','2099-01-01'),
('b0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000001','Expert','{"termine":true,"optionsV2":{"mode":"expert"}}',null,null),
('b0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000001','En cours','{"termine":false}',null,null);
do $$
begin
 if not exists(select 1 from public.tournois where nom='Simple' and termine_at=now() and photos_expirent_at=now()+interval '15 days')then raise exception 'Simple retention wrong';end if;
 if not exists(select 1 from public.tournois where nom='Expert' and photos_expirent_at=now()+interval '90 days')then raise exception 'Expert retention wrong';end if;
 if not exists(select 1 from public.tournois where nom='En cours' and termine_at is null and photos_expirent_at is null)then raise exception 'Active tournament expiry started early';end if;
end $$;
update public.tournois set donnees=donnees||'{"optionsV2":{"mode":"expert"}}'::jsonb,photos_expirent_at=now()+interval '365 days' where nom='Simple';
do $$begin if not exists(select 1 from public.tournois where nom='Simple' and photos_expirent_at=now()+interval '15 days')then raise exception 'Client extended retention';end if;end $$;
reset role;
alter table public.tournois disable trigger date_conservation_photos;
update public.tournois set termine_at=now()-interval '16 days',photos_expirent_at=now()-interval '1 day' where nom='Simple';
alter table public.tournois enable trigger date_conservation_photos;
insert into storage.objects(bucket_id,name)values
('tourneo-media','a0000000-0000-4000-8000-000000000001/profil-test.png'),
('tourneo-media','a0000000-0000-4000-8000-000000000001/tournois/b0000000-0000-4000-8000-000000000001/expire.png'),
('tourneo-media','a0000000-0000-4000-8000-000000000001/tournois/b0000000-0000-4000-8000-000000000002/expert.png'),
('tourneo-media','a0000000-0000-4000-8000-000000000001/tournois/b0000000-0000-4000-8000-000000000003/actif.png');
set local role authenticated;
do $$
begin
 if public.tourneo_duree_photo('b0000000-0000-4000-8000-000000000001')<>0 then raise exception 'Expired link can be signed';end if;
 if public.tourneo_duree_photo('b0000000-0000-4000-8000-000000000002')<>3600 then raise exception 'Expert link unavailable';end if;
 if(select count(*)from storage.objects)<>3 then raise exception 'Expired Storage policy wrong or avatar blocked';end if;
end $$;
update public.tournois set donnees=donnees||'{"podiumPhotoUrl":"STALE-CACHE","podiumFinal":[{"nom":"A","photo":"STALE-CACHE"}]}'::jsonb where nom='Simple';
do $$begin if exists(select 1 from public.tournois where nom='Simple' and donnees::text like '%STALE-CACHE%')then raise exception 'Expired cached photo restored';end if;end $$;
reset role;
select tourneo_private.planifier_purge_photos();
set local role service_role;
do $$
declare j uuid;
begin
 if(select count(*)from public.tourneo_photos_a_supprimer())<>1 then raise exception 'Purge candidate selection wrong';end if;
 if not exists(select 1 from public.tourneo_photos_a_supprimer()where name like '%/expire.png') then raise exception 'Wrong photo selected';end if;
 select token into j from public.tourneo_jobs_photos limit 1;
 if public.tourneo_consomme_job_photo(j) is distinct from true then raise exception 'Job auth failed';end if;
 if public.tourneo_consomme_job_photo(j) is distinct from false then raise exception 'Job replay accepted';end if;
 perform public.tourneo_nettoyer_photos_inline();
end $$;
reset role;
select '15/90 days after finish, immutable deadlines, active tournament and avatar preservation, expired access denied, stale cache blocked, purge candidates and one-use job auth: OK' as result;
rollback;
