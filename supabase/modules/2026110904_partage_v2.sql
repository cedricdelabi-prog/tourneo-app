begin;
-- Explicit public projection: no account owner, authentication data or registration token.
create or replace function public.tourneo_public_v2(p_id uuid)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
select jsonb_build_object('id',t.id,'nom',t.nom,'sport',t.sport,'donnees',jsonb_build_object(
  'equipes',coalesce((select jsonb_agg(jsonb_build_object('id',e->'id','profilId',e->'profilId','nom',e->'nom','emoji',e->'emoji','couleur',e->'couleur','photo',e->'photo'))from jsonb_array_elements(coalesce(t.donnees->'equipes','[]'::jsonb))e),'[]'::jsonb),
  'matchs',coalesce(t.donnees->'matchs','[]'::jsonb),'formatTournoi',t.donnees->'formatTournoi','optionsV2',t.donnees->'optionsV2',
  'matchsValides',t.donnees->'matchsValides','podiumPhotoUrl',t.donnees->'podiumPhotoUrl','podiumFinal',t.donnees->'podiumFinal','termine',t.donnees->'termine'
))from public.tournois t where t.id=p_id;
$$;
revoke all on function public.tourneo_public_v2(uuid)from public;
grant execute on function public.tourneo_public_v2(uuid)to anon,authenticated;
commit;
