create or replace function tourneo_private.reference_publique(p_tournoi uuid,p_ref text)
returns text language sql immutable strict security invoker set search_path=pg_catalog as $$
 select case when left(p_ref,4)='duo:' then 'duo:'||(select string_agg('p-'||md5(p_tournoi::text||':'||x),'|' order by n) from unnest(string_to_array(substr(p_ref,5),'|')) with ordinality as refs(x,n))
 else 'p-'||md5(p_tournoi::text||':'||p_ref) end;
$$;
revoke all on function tourneo_private.reference_publique(uuid,text) from public,anon,authenticated;
-- Approuvé explicitement par l'utilisateur le 12 novembre 2026.
-- Le lien expose noms/pseudos, sport, matchs, scores et classement.
-- Aucune photo, profilId, donnée de contact ou jeton d'inscription.
create or replace function public.tourneo_public_v2(p_id uuid)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
select jsonb_build_object('id',t.id,'nom',t.nom,'sport',t.sport,'donnees',jsonb_build_object(
  'equipes',coalesce((select jsonb_agg(jsonb_build_object('id',tourneo_private.reference_publique(t.id,e->>'id'),'nom',e->'nom','emoji',e->'emoji','couleur',e->'couleur'))from jsonb_array_elements(coalesce(t.donnees->'equipes','[]'::jsonb))e),'[]'::jsonb),
  'matchs',coalesce((select jsonb_agg(jsonb_build_object('id',m->'id','journee',m->'journee','equipe1Id',tourneo_private.reference_publique(t.id,m->>'equipe1Id'),'equipe2Id',tourneo_private.reference_publique(t.id,m->>'equipe2Id'),'score1',m->'score1','score2',m->'score2','ordre',m->'ordre','branche',m->'branche','joueurs1Ids',(select coalesce(jsonb_agg(tourneo_private.reference_publique(t.id,x)),'[]'::jsonb) from jsonb_array_elements_text(coalesce(m->'joueurs1Ids','[]'::jsonb)) as refs(x)),'joueurs2Ids',(select coalesce(jsonb_agg(tourneo_private.reference_publique(t.id,x)),'[]'::jsonb) from jsonb_array_elements_text(coalesce(m->'joueurs2Ids','[]'::jsonb)) as refs(x)),'manches',coalesce((select jsonb_agg(jsonb_build_object('score1',s->'score1','score2',s->'score2')) from jsonb_array_elements(coalesce(m->'manches','[]'::jsonb)) s),'[]'::jsonb))) from jsonb_array_elements(coalesce(t.donnees->'matchs','[]'::jsonb)) m),'[]'::jsonb),'formatTournoi',t.donnees->'formatTournoi','optionsV2',(select coalesce(jsonb_object_agg(key,value),'{}'::jsonb)||jsonb_build_object('exemptions',(select coalesce(jsonb_agg(jsonb_build_object('ronde',ex->'ronde','id',tourneo_private.reference_publique(t.id,ex->>'id'))),'[]'::jsonb) from jsonb_array_elements(coalesce(t.donnees->'optionsV2'->'exemptions','[]'::jsonb)) ex)) from jsonb_each(coalesce(t.donnees->'optionsV2','{}'::jsonb)) where key=any(array['tirage','mode','score','setsGagnants','cibleManche','ecartManche','plafondManche','cibleDecisive','pointsVictoire','pointsNul','pointsDefaite','rondes','terrains','duree','repos','depart'])),
  'matchsValides',t.donnees->'matchsValides','termine',t.donnees->'termine'
))from public.tournois t where t.id=p_id;
$$;

grant execute on function public.tourneo_public_v2(uuid) to anon;
