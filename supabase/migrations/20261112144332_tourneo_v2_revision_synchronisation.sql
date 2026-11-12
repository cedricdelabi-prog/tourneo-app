-- Révision monotone : les sauvegardes utilisent une condition atomique sur la base lue.
alter table public.tournois add column revision bigint not null default 0 check (revision >= 0);
create or replace function tourneo_private.reviser_tournoi()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 new.revision:=case when TG_OP='INSERT' then 0 else old.revision+1 end;
 return new;
end $$;
create trigger revision_tournoi before insert or update on public.tournois for each row execute function tourneo_private.reviser_tournoi();
