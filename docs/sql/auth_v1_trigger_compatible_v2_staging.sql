-- STAGING ONLY: V1 auth trigger must remain compatible with V2 profile name checks.
-- Preserve the V1 profile creation trigger and existing user identities.
-- Run after the additive V2 profile constraints on a restored V1 staging copy.
begin;
do $$
begin
 if not exists (
 select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid
 join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='auth' and c.relname='users' and t.tgname='on_auth_user_created_tourneo'
 ) then raise exception 'V1 signup trigger absent: stop migration'; end if;
end $$;
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
  '#3B82F6')
 on conflict(id) do nothing;
 return new;
end $$;
commit;
