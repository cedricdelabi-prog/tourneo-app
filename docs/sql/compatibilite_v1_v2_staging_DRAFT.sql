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
-- Align the safe V2 constraints only after checking the existing V1 data.
-- Constraints are named independently from V1 to avoid accidental replacement.
do $
begin
 if exists(select 1 from public.tournois where char_length(trim(nom)) not between 1 and 150)
 or exists(select 1 from public.tournois where jsonb_typeof(donnees)<>'object')
 or exists(select 1 from public.profiles where char_length(trim(display_name)) not between 1 and 100) then
   raise exception 'Legacy data violates V2 constraints; migration aborted';
 end if;
end $;
alter table public.tournois add constraint tourneo_v2_compat_nom_check check (char_length(trim(nom)) between 1 and 150);
alter table public.tournois add constraint tourneo_v2_compat_donnees_check check (jsonb_typeof(donnees)='object');
alter table public.tournois add constraint tourneo_v2_compat_revision_check check (revision>=0);
alter table public.profiles add constraint tourneo_v2_compat_display_name_check check (char_length(trim(display_name)) between 1 and 100);
-- Do not drop V1 columns partage_id / est_public. Existing sharing URLs must continue to resolve.
-- Note: legacy get_tourneo_public returns raw JSON, while V2 tourneo_public_v2 sanitizes it.
-- Keep legacy endpoint unchanged until a separately validated compatibility/security plan exists.
-- Do not alter existing RLS policies or grants without separately tested security review.
-- Later V2 migrations require a complete ordered dependency and security audit.
commit;
