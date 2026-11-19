-- Tourneo V2 test project kmjfmjhdnokkaiolxiin ONLY. Applied 2026-11-19.
-- Do not run on Tourneo V1 without a separate migration and explicit acceptance.
-- Requires docs/sql/tv_pilotage_distant_v2_TEST_ONLY.sql first.
CREATE FUNCTION public.tv_pilotage_appliquer(p_tournoi_id uuid,p_patch jsonb)
RETURNS TABLE(nouveaux_reglages jsonb,nouvelle_revision bigint)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF p_patch IS NULL OR jsonb_typeof(p_patch) IS DISTINCT FROM 'object'
    OR octet_length(p_patch::text)>12000
    OR EXISTS (SELECT 1 FROM jsonb_object_keys(p_patch) cle
       WHERE cle NOT IN ('secondes','pause','message','dureeAnnonce','annonceExpireA','appel','dureeAppel','appelExpireA','defilement','repriseA','afficherSponsors','pageSponsors','afficherMatchs','afficherClassement','afficherProgression','filtreMatchs','pageManuelle','debutDefilement'))
 THEN
  RAISE EXCEPTION 'Paramètres TV non autorisés.' USING ERRCODE='22023';
 END IF;
 RETURN QUERY
 INSERT INTO public.tourneo_tv_pilotage AS t(tournoi_id,reglages)
 VALUES (p_tournoi_id,p_patch)
 ON CONFLICT (tournoi_id) DO UPDATE SET reglages=t.reglages || EXCLUDED.reglages
 RETURNING t.reglages,t.revision;
END;
$$;
REVOKE ALL ON FUNCTION public.tv_pilotage_appliquer(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tv_pilotage_appliquer(uuid,jsonb) TO authenticated;
