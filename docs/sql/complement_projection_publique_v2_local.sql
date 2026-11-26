-- Complement de projection publique V2, copie locale uniquement.
-- La production conserve la verification serveur et le filtre des tournois publics.
BEGIN;
DO $$
BEGIN
 IF current_database() <> 'tourneo_v2_essai' THEN RAISE EXCEPTION 'COPIE LOCALE UNIQUEMENT'; END IF;
 IF to_regclass('tourneo_private.pronostics_invites') IS NULL THEN RAISE EXCEPTION 'Migration de base absente'; END IF;
END $$;
SET LOCAL ROLE postgres;
CREATE OR REPLACE FUNCTION public.tourneo_public_v2(p_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
select jsonb_build_object('id',t.id,'nom',t.nom,'sport',t.sport,'donnees',jsonb_build_object(
  'equipes',coalesce((select jsonb_agg(jsonb_build_object('id',tourneo_private.reference_publique(t.id,e->>'id'),'nom',e->'nom','emoji',case when jsonb_typeof(e->'emoji')='string' and char_length(e->>'emoji')<=16 then e->'emoji' else null end,'couleur',case when e->>'couleur' ~ '^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?))from jsonb_array_elements(coalesce(t.donnees->'equipes','[]'::jsonb))e),'[]'::jsonb),
  'matchs',coalesce((select jsonb_agg(jsonb_build_object('id',m->'id','journee',m->'journee','equipe1Id',tourneo_private.reference_publique(t.id,m->>'equipe1Id'),'equipe2Id',tourneo_private.reference_publique(t.id,m->>'equipe2Id'),'score1',m->'score1','score2',m->'score2','ordre',m->'ordre','terrain',m->'terrain','branche',m->'branche','joueurs1Ids',(select coalesce(jsonb_agg(tourneo_private.reference_publique(t.id,x)),'[]'::jsonb) from jsonb_array_elements_text(coalesce(m->'joueurs1Ids','[]'::jsonb)) as refs(x)),'joueurs2Ids',(select coalesce(jsonb_agg(tourneo_private.reference_publique(t.id,x)),'[]'::jsonb) from jsonb_array_elements_text(coalesce(m->'joueurs2Ids','[]'::jsonb)) as refs(x)),'manches',coalesce((select jsonb_agg(jsonb_build_object('score1',s->'score1','score2',s->'score2')) from jsonb_array_elements(coalesce(m->'manches','[]'::jsonb)) s),'[]'::jsonb))) from jsonb_array_elements(coalesce(t.donnees->'matchs','[]'::jsonb)) m),'[]'::jsonb),'formatTournoi',t.donnees->'formatTournoi','optionsV2',(select coalesce(jsonb_object_agg(key,value),'{}'::jsonb)||jsonb_build_object('adaptationPlanning',case when jsonb_typeof(t.donnees->'optionsV2'->'adaptationPlanning')='object' then jsonb_build_object(
 'debutMinimum',case when jsonb_typeof(t.donnees#>'{optionsV2,adaptationPlanning,debutMinimum}')='number' then t.donnees#>'{optionsV2,adaptationPlanning,debutMinimum}' else '0'::jsonb end,
 'terrainsFermes',(select coalesce(jsonb_agg(n),'[]'::jsonb)from jsonb_array_elements(case when jsonb_typeof(t.donnees#>'{optionsV2,adaptationPlanning,terrainsFermes}')='array' then t.donnees#>'{optionsV2,adaptationPlanning,terrainsFermes}' else '[]'::jsonb end)n where jsonb_typeof(n)='number'),
 'fixes',(select coalesce(jsonb_agg(jsonb_build_object('matchId',f->'matchId','terrain',f->'terrain','debut',f->'debut','fin',f->'fin')),'[]'::jsonb)from jsonb_array_elements(case when jsonb_typeof(t.donnees#>'{optionsV2,adaptationPlanning,fixes}')='array' then t.donnees#>'{optionsV2,adaptationPlanning,fixes}' else '[]'::jsonb end)f where jsonb_typeof(f->'matchId')='number' and jsonb_typeof(f->'terrain')='number' and jsonb_typeof(f->'debut')='number' and jsonb_typeof(f->'fin')='number')
 ) else null end,'exemptions',(select coalesce(jsonb_agg(jsonb_build_object('ronde',ex->'ronde','id',tourneo_private.reference_publique(t.id,ex->>'id'))),'[]'::jsonb) from jsonb_array_elements(coalesce(t.donnees->'optionsV2'->'exemptions','[]'::jsonb)) ex)) from jsonb_each(coalesce(t.donnees->'optionsV2','{}'::jsonb)) where key=any(array['tirage','mode','score','setsGagnants','cibleManche','ecartManche','plafondManche','cibleDecisive','pointsVictoire','pointsNul','pointsDefaite','rondes','terrains','duree','repos','depart'])),
  'matchsValides',t.donnees->'matchsValides','termine',t.donnees->'termine'
))from public.tournois t where t.id=p_id and t.est_public is true;
$function$
 then e->'couleur' else null end))from jsonb_array_elements(coalesce(t.donnees->'equipes','[]'::jsonb))e),'[]'::jsonb),
  'matchs',coalesce((select jsonb_agg(jsonb_build_object('id',m->'id','journee',m->'journee','equipe1Id',tourneo_private.reference_publique(t.id,m->>'equipe1Id'),'equipe2Id',tourneo_private.reference_publique(t.id,m->>'equipe2Id'),'score1',m->'score1','score2',m->'score2','ordre',m->'ordre','terrain',m->'terrain','branche',m->'branche','joueurs1Ids',(select coalesce(jsonb_agg(tourneo_private.reference_publique(t.id,x)),'[]'::jsonb) from jsonb_array_elements_text(coalesce(m->'joueurs1Ids','[]'::jsonb)) as refs(x)),'joueurs2Ids',(select coalesce(jsonb_agg(tourneo_private.reference_publique(t.id,x)),'[]'::jsonb) from jsonb_array_elements_text(coalesce(m->'joueurs2Ids','[]'::jsonb)) as refs(x)),'manches',coalesce((select jsonb_agg(jsonb_build_object('score1',s->'score1','score2',s->'score2')) from jsonb_array_elements(coalesce(m->'manches','[]'::jsonb)) s),'[]'::jsonb))) from jsonb_array_elements(coalesce(t.donnees->'matchs','[]'::jsonb)) m),'[]'::jsonb),'formatTournoi',t.donnees->'formatTournoi','optionsV2',(select coalesce(jsonb_object_agg(key,value),'{}'::jsonb)||jsonb_build_object('adaptationPlanning',case when jsonb_typeof(t.donnees->'optionsV2'->'adaptationPlanning')='object' then jsonb_build_object(
 'debutMinimum',case when jsonb_typeof(t.donnees#>'{optionsV2,adaptationPlanning,debutMinimum}')='number' then t.donnees#>'{optionsV2,adaptationPlanning,debutMinimum}' else '0'::jsonb end,
 'terrainsFermes',(select coalesce(jsonb_agg(n),'[]'::jsonb)from jsonb_array_elements(case when jsonb_typeof(t.donnees#>'{optionsV2,adaptationPlanning,terrainsFermes}')='array' then t.donnees#>'{optionsV2,adaptationPlanning,terrainsFermes}' else '[]'::jsonb end)n where jsonb_typeof(n)='number'),
 'fixes',(select coalesce(jsonb_agg(jsonb_build_object('matchId',f->'matchId','terrain',f->'terrain','debut',f->'debut','fin',f->'fin')),'[]'::jsonb)from jsonb_array_elements(case when jsonb_typeof(t.donnees#>'{optionsV2,adaptationPlanning,fixes}')='array' then t.donnees#>'{optionsV2,adaptationPlanning,fixes}' else '[]'::jsonb end)f where jsonb_typeof(f->'matchId')='number' and jsonb_typeof(f->'terrain')='number' and jsonb_typeof(f->'debut')='number' and jsonb_typeof(f->'fin')='number')
 ) else null end,'exemptions',(select coalesce(jsonb_agg(jsonb_build_object('ronde',ex->'ronde','id',tourneo_private.reference_publique(t.id,ex->>'id'))),'[]'::jsonb) from jsonb_array_elements(coalesce(t.donnees->'optionsV2'->'exemptions','[]'::jsonb)) ex)) from jsonb_each(coalesce(t.donnees->'optionsV2','{}'::jsonb)) where key=any(array['tirage','mode','score','setsGagnants','cibleManche','ecartManche','plafondManche','cibleDecisive','pointsVictoire','pointsNul','pointsDefaite','rondes','terrains','duree','repos','depart'])),
  'matchsValides',t.donnees->'matchsValides','termine',t.donnees->'termine'
))from public.tournois t where t.id=p_id and t.est_public is true;
$function$
;
RESET ROLE;
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM public.tournois WHERE est_public IS TRUE AND public.tourneo_public_compat_v2(id) IS NULL) THEN RAISE EXCEPTION 'Lien public invalide'; END IF;
 IF EXISTS (SELECT 1 FROM public.tournois WHERE est_public IS NOT TRUE AND public.tourneo_public_v2(id) IS NOT NULL) THEN RAISE EXCEPTION 'Tournoi prive expose'; END IF;
 IF has_function_privilege('anon','public.get_tourneo_public(uuid)','EXECUTE') THEN RAISE EXCEPTION 'Ancienne RPC exposee'; END IF;
 IF has_function_privilege('anon','public.tourneo_public_v2(uuid)','EXECUTE') THEN RAISE EXCEPTION 'RPC directe exposee'; END IF;
 IF EXISTS (SELECT 1 FROM public.tournois t WHERE est_public IS TRUE AND NOT (public.tourneo_public_compat_v2(t.id)->'donnees'->'optionsV2' ? 'adaptationPlanning')) THEN RAISE EXCEPTION 'Planning absent de la projection'; END IF;
END $$;
-- Test de confidentialité avec un tournoi existant, dans une sous-transaction annulee.
DO $$
DECLARE v uuid;
BEGIN
 SELECT id INTO v FROM public.tournois WHERE est_public IS TRUE LIMIT 1;
 IF v IS NULL THEN RAISE EXCEPTION 'Aucun tournoi public a tester'; END IF;
 BEGIN
  UPDATE public.tournois SET est_public=false WHERE id=v;
  IF public.tourneo_public_v2(v) IS NOT NULL OR public.tourneo_public_compat_v2(v) IS NOT NULL THEN RAISE EXCEPTION 'Fuite de tournoi prive'; END IF;
  RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='annulation test prive';
 EXCEPTION WHEN SQLSTATE 'P0002' THEN
  IF SQLERRM<>'annulation test prive' THEN RAISE; END IF;
 END;
END $$;
COMMIT;
SELECT 'PROJECTION PUBLIQUE V2 : OK' AS resultat;
