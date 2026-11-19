-- Tourneo V1 : verification agregee des anciens liens, lecture seule.
-- Ne renvoie ni nom, ni ID, ni email, ni contenu de tournoi.
select
 count(*)::int as tournois,
 count(*) filter(where est_public is true)::int as publics,
 count(*) filter(where partage_id is not null)::int as partage_presents,
 count(*) filter(where partage_id is distinct from id)::int as partage_distincts,
 count(*) filter(where est_public is true and exists(select 1 from public.get_tourneo_public(t.id)))::int as liens_uuid_reconnus_v1,
 count(*) filter(where est_public is true and partage_id is not null and exists(select 1 from public.get_tourneo_public(t.partage_id)))::int as alias_reconnus_v1,
 count(*) filter(where est_public is false and exists(select 1 from public.get_tourneo_public(t.id)))::int as prives_visibles_via_rpc
from public.tournois t;
