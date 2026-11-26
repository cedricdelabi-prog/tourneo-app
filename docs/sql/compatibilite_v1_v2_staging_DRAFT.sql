-- TOURNEO V2 PRODUCTION: PHASE 1 COMPATIBILITY (DRAFT; DO NOT EXECUTE ON PRODUCTION)
-- This is an additive schema-only starting point, NOT the full V2 migration.
-- Run ONLY on a RESTORED STAGING COPY after verified full Auth/DB/Storage backup.
-- Requires the verified-staging session flag set OUTSIDE this file on the same connection.
-- Preserves partage_id and est_public; avoids dropping V1 columns.
begin;
do $$
begin
 if current_setting('tourneo.v1_copy_verified',true) is distinct from 'true'
 then raise exception 'STAGING STOP: copie restauree non explicitement confirmee'; end if;
 if to_regclass('public.tournois') is null or to_regclass('public.profiles') is null then
   raise exception 'V1 tables missing';
 end if;
 if (select count(*) from auth.users)=0 or (select count(*) from public.tournois)=0 then
   raise exception 'Expected populated V1 staging snapshot not found';
 end if;
 if exists(select 1 from public.tournois where partage_id is null) then
   raise exception 'Legacy sharing IDs not restored';
 end if;
 if exists(select 1 from public.tournois t where not exists(select 1 from auth.users u where u.id=t.user_id))
 or exists(select 1 from public.profiles p where not exists(select 1 from auth.users u where u.id=p.id))
 then raise exception 'Orphaned V1 data: abort'; end if;
end $$;
alter table public.tournois add column if not exists updated_at timestamptz not null default now();
alter table public.tournois add column if not exists termine_at timestamptz;
alter table public.tournois add column if not exists photos_expirent_at timestamptz;
alter table public.tournois add column if not exists revision bigint not null default 0;
alter table public.profiles add column if not exists ville_publique boolean not null default false;
-- Align the safe V2 constraints only after checking the existing V1 data.
-- Constraints are named independently from V1 to avoid accidental replacement.
do $$
begin
 if exists(select 1 from public.tournois where char_length(trim(nom)) not between 1 and 150)
 or exists(select 1 from public.tournois where jsonb_typeof(donnees)<>'object')
 or exists(select 1 from public.profiles where char_length(trim(display_name)) not between 1 and 100) then
   raise exception 'Legacy data violates V2 constraints; migration aborted';
 end if;
end $$;
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
