-- Rollback-only test: migrated V1 signup trigger creates valid V2 profiles.
begin;
create or replace function public.handle_new_tourneo_user()
returns trigger language plpgsql security definer set search_path=''
as $$
declare code_joueur text; nom_affiche text;
begin
 code_joueur := 'TRN-' || upper(substr(replace(new.id::text,'-',''),1,4))
  || '-' || upper(substr(replace(new.id::text,'-',''),5,4));
 nom_affiche := left(coalesce(
  nullif(trim(new.raw_user_meta_data->>'display_name'),''),
  nullif(trim(new.raw_user_meta_data->>'full_name'),''),
  nullif(split_part(new.email,'@',1),''),
  'Joueur'
 ),100);
 insert into public.profiles(id,display_name,player_code,first_name,last_name,city,favorite_color)
 values(new.id,nom_affiche,code_joueur,
  nullif(new.raw_user_meta_data->>'first_name',''),
  nullif(new.raw_user_meta_data->>'last_name',''),
  nullif(new.raw_user_meta_data->>'city',''),
  '#3B82F6') on conflict(id) do nothing;
 return new;
end $$;
create trigger on_auth_user_created_tourneo after insert on auth.users
for each row execute function public.handle_new_tourneo_user();
insert into auth.users(id,aud,role,email,raw_user_meta_data) values
('82000000-0000-4000-8000-000000000001','authenticated','authenticated','example1@example.invalid',jsonb_build_object('display_name',repeat('A',180),'city','Calais')),
('82000000-0000-4000-8000-000000000002','authenticated','authenticated','example2@example.invalid','{}'::jsonb);
do $$
begin
 if (select count(*) from public.profiles where id in
 ('82000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000002'))<>2
 then raise exception 'Signup profiles missing'; end if;
 if (select char_length(display_name) from public.profiles where id='82000000-0000-4000-8000-000000000001')<>100
 then raise exception 'V2 display name length invalid'; end if;
 if (select player_code from public.profiles where id='82000000-0000-4000-8000-000000000001')<>'TRN-8200-0000'
 then raise exception 'Legacy player code changed'; end if;
 if (select display_name from public.profiles where id='82000000-0000-4000-8000-000000000002')<>'example2'
 then raise exception 'Email fallback missing'; end if;
end $$;
select 'Migrated V1 signup trigger creates valid V2 profiles: OK' as result;
rollback;
