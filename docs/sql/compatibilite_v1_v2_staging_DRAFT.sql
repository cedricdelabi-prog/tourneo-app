-- TOURNEO V2 PRODUCTION: PHASE 1 COMPATIBILITY (DRAFT; DO NOT EXECUTE ON PRODUCTION)
-- This is an additive schema-only starting point, NOT the full V2 migration.
-- Run ONLY on a RESTORED STAGING COPY after verified full Auth/DB/Storage backup.
-- Preserves partage_id and est_public; avoids dropping V1 columns.
begin;
do $$
begin
 if to_regclass('public.tournois') is null or to_regclass('public.profiles') is null then
   raise exception 'V1 tables missing';
 end if;
 if (select count(*) from auth.users) <> 59 or (select count(*) from public.tournois) <> 25 then
   raise exception 'Expected restored staging snapshot not found; stop before changing schema';
 end if;
 if (select count(*) from public.tournois where partage_id is not null) <> 25 then
   raise exception 'Legacy sharing IDs not restored';
 end if;
end $$;
alter table public.tournois add column if not exists updated_at timestamptz not null default now();
alter table public.tournois add column if not exists termine_at timestamptz;
alter table public.tournois add column if not exists photos_expirent_at timestamptz;
alter table public.tournois add column if not exists revision bigint not null default 0;
alter table public.profiles add column if not exists ville_publique boolean not null default false;
-- Do not drop V1 columns partage_id / est_public. Existing sharing URLs must continue to resolve.
-- Do not alter existing RLS policies or grants without separately tested security review.
-- Later V2 migrations require a complete ordered dependency and security audit.
commit;
