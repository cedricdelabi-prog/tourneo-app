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
