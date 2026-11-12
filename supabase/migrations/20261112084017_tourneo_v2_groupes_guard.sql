alter policy groupe_read on public.tourneo_groupes using(user_id=(select auth.uid()) or tourneo_private.role_groupe(id) is not null);
create or replace function tourneo_private.verifier_quota_groupe()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or coalesce(tourneo_private.role_groupe(new.groupe_id),'') not in ('proprietaire','accompagnateur') then raise exception 'Accès accompagnateur requis';end if;
 perform 1 from public.tourneo_groupes where id=new.groupe_id for update;
 if (select count(*) from public.tourneo_groupe_participants where groupe_id=new.groupe_id)>=256 then raise exception 'Le groupe est limité à 256 participants';end if;
 return new;
end $$;
