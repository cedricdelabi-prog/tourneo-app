-- Gestion privée des olympiades.
begin;

create table public.tourneo_olympiades (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 nom text not null check(char_length(trim(nom)) between 1 and 100),
 donnees jsonb not null check(jsonb_typeof(donnees)='object' and octet_length(donnees::text)<=1000000),
 partage boolean not null default false,
 revision bigint not null default 0 check(revision>=0),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index olympiades_owner on public.tourneo_olympiades(user_id);
alter table public.tourneo_olympiades enable row level security;
revoke all on public.tourneo_olympiades from public,anon,authenticated;
grant select,insert,update,delete on public.tourneo_olympiades to authenticated;
create policy olympiades_owner on public.tourneo_olympiades for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create function tourneo_private.reviser_olympiade()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 new.revision := case when TG_OP='INSERT' then 0 else old.revision + 1 end;
 new.updated_at := now();
 return new;
end $$;
revoke all on function tourneo_private.reviser_olympiade() from public,anon,authenticated;
create trigger revision_olympiade before insert or update on public.tourneo_olympiades
 for each row execute function tourneo_private.reviser_olympiade();

commit;
