-- PROPOSITION NON APPLIQUEE. Autorisation explicite requise.
-- Le lien expose noms/pseudos, sport, matchs, scores et classement.
-- Aucune photo, profilId, donnée de contact ou jeton d'inscription.
create or replace function public.tourneo_public_v2(p_id uuid)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
select jsonb_build_object('id',t.id,'nom',t.nom,'sport',t.sport,'donnees',jsonb_build_object(
  'equipes',coalesce((select jsonb_agg(jsonb_build_object('id',e->'id','nom',e->'nom','emoji',e->'emoji','couleur',e->'couleur'))from jsonb_array_elements(coalesce(t.donnees->'equipes','[]'::jsonb))e),'[]'::jsonb),
  'matchs',coalesce(t.donnees->'matchs','[]'::jsonb),'formatTournoi',t.donnees->'formatTournoi','optionsV2',t.donnees->'optionsV2',
  'matchsValides',t.donnees->'matchsValides','termine',t.donnees->'termine'
))from public.tournois t where t.id=p_id;
$$;

grant execute on function public.tourneo_public_v2(uuid) to anon;
