-- Tourneo V2 : extension du schéma compatible avec les clients V1.
-- Les règles d'accès et les points d'entrée V1 sont conservés.
begin;
set local lock_timeout = '3s';

alter table public.tournois
  add column updated_at timestamptz not null default now(),
  add column termine_at timestamptz,
  add column photos_expirent_at timestamptz,
  add column revision bigint not null default 0;

alter table public.profiles
  add column ville_publique boolean not null default false;

commit;
