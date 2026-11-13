-- PostgREST safe-update requires a bounded UPDATE, even for a singleton table.
create or replace function tourneo_private.worker_android(p_projet text)returns void language plpgsql security definer set search_path='' as $$begin
 if p_projet is not null and p_projet!~'^[a-z][a-z0-9-]{4,62}$'then raise exception 'Projet invalide';end if;
 update tourneo_private.notifications_config set android_projet=p_projet where singleton=true;
end$$;
