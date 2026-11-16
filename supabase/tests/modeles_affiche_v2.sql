begin;
insert into auth.users(id,aud,role,email_confirmed_at) values
 ('a9000000-0000-4000-8000-000000000001','authenticated','authenticated',now()),
 ('a9000000-0000-4000-8000-000000000002','authenticated','authenticated',now());
set local role authenticated;
select set_config('request.jwt.claim.sub','a9000000-0000-4000-8000-000000000001',true);
insert into public.tourneo_modeles_affiche(id,user_id,nom,identite) values
 ('aa000000-0000-4000-8000-000000000001',auth.uid(),'Modèle privé','{"message":"Bienvenue"}');
select set_config('request.jwt.claim.sub','a9000000-0000-4000-8000-000000000002',true);
do $$begin
 if exists(select 1 from public.tourneo_modeles_affiche) then raise exception 'Modèle privé exposé';end if;
 begin
 insert into public.tourneo_modeles_affiche(user_id,nom) values('a9000000-0000-4000-8000-000000000001','Usurpation');
 raise exception 'Modèle créé pour autrui';
 exception when insufficient_privilege then null;end;
 update public.tourneo_modeles_affiche set nom='Altéré';
 delete from public.tourneo_modeles_affiche;
end $$;
select set_config('request.jwt.claim.sub','a9000000-0000-4000-8000-000000000001',true);
do $$begin
 if (select nom from public.tourneo_modeles_affiche where user_id=auth.uid())<>'Modèle privé' then raise exception 'Modèle modifié par autrui';end if;
 begin
 update public.tourneo_modeles_affiche set user_id='a9000000-0000-4000-8000-000000000002';
 raise exception 'Propriétaire réassigné';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role anon;
do $$begin
 if has_table_privilege('anon','public.tourneo_modeles_affiche','select') then raise exception 'Modèles anonymes';end if;
end $$;
rollback;
