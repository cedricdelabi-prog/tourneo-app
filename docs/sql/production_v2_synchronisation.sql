-- Compteur et horodatage des écritures futures sur les tournois.
begin;
set local lock_timeout = '3s';

create function tourneo_private.reviser_tournoi()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  new.revision := case when TG_OP = 'INSERT' then 0 else old.revision + 1 end;
  new.updated_at := now();
  return new;
end $$;

revoke all on function tourneo_private.reviser_tournoi() from public,anon,authenticated;
create trigger revision_tournoi before insert or update on public.tournois
  for each row execute function tourneo_private.reviser_tournoi();

commit;
