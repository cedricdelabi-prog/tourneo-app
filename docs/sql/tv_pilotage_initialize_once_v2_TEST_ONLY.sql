-- Tourneo V2 test database kmjfmjhdnokkaiolxiin ONLY. Applied 2026-11-19.
-- Requires docs/sql/tv_pilotage_distant_v2_TEST_ONLY.sql and later heartbeat migration.
CREATE FUNCTION public.tv_pilotage_initialiser(p_tournoi_id uuid,p_reglages jsonb)
RETURNS TABLE(nouveaux_reglages jsonb,nouvelle_revision bigint)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF p_reglages IS NULL OR jsonb_typeof(p_reglages) IS DISTINCT FROM 'object'
    OR octet_length(p_reglages::text)>12000
    OR EXISTS (SELECT 1 FROM jsonb_object_keys(p_reglages) cle
      WHERE cle NOT IN ('secondes','pause','message','dureeAnnonce','annonceExpireA','appel','dureeAppel','appelExpireA','defilement','repriseA','afficherSponsors','pageSponsors','afficherMatchs','afficherClassement','afficherProgression','filtreMatchs','pageManuelle','debutDefilement'))
 THEN
  RAISE EXCEPTION 'Paramètres TV non autorisés.' USING ERRCODE='22023';
 END IF;
 RETURN QUERY
 INSERT INTO public.tourneo_tv_pilotage AS t(tournoi_id,reglages)
 VALUES (p_tournoi_id,p_reglages)
 ON CONFLICT (tournoi_id) DO UPDATE SET reglages=EXCLUDED.reglages
   WHERE t.reglages='{}'::jsonb
 RETURNING t.reglages,t.revision;
 IF NOT FOUND THEN
  RETURN QUERY SELECT t.reglages,t.revision
   FROM public.tourneo_tv_pilotage t WHERE t.tournoi_id=p_tournoi_id;
 END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.tv_pilotage_initialiser(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tv_pilotage_initialiser(uuid,jsonb) TO authenticated;
