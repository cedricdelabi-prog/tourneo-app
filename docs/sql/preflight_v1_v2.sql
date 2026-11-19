-- Tourneo V1 to V2 read-only preflight. Execute against V1 before any production change.
-- Expected snapshot 2026-11-19: 59 accounts, 59 profiles, 25 tournaments, 25 public links.
select
 (select count(*) from auth.users) as users_count,
 (select count(*) from public.profiles) as profiles_count,
 (select count(*) from public.tournois) as tournaments_count,
 (select count(*) from public.tournois where partage_id is not null and est_public) as public_shared,
 (select count(*) from public.tournois t left join auth.users u on u.id=t.user_id where u.id is null) as orphan_tournaments,
 (select count(*) from public.profiles p left join auth.users u on u.id=p.id where u.id is null) as orphan_profiles,
 (select count(*) from public.tournois where jsonb_typeof(donnees)<>'object') as invalid_json,
 (select count(*) from public.tournois where donnees ? 'equipes' and jsonb_typeof(donnees->'equipes')<>'array') as invalid_teams,
 (select count(*) from public.tournois where donnees ? 'matchs' and jsonb_typeof(donnees->'matchs')<>'array') as invalid_matches,
 (select count(*) from (select partage_id from public.tournois where partage_id is not null group by partage_id having count(*)>1) x) as duplicate_share_ids;
-- Any nonzero invalid/orphan/duplicate count is a STOP.
-- Do not run V2 schema migrations against V1 directly. Build a compatible, tested migration first.
