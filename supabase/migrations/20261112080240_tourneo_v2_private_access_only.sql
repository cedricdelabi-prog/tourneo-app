-- Public identity lookup deliberately excludes real names, city and photos.
create or replace function public.tourneo_profils_publics(p_code text default null, p_ids uuid[] default null)
returns table(id uuid,display_name text,player_code text,avatar_url text,favorite_color text)
language sql stable security definer set search_path=public,pg_temp as $$
 select p.id,p.display_name,p.player_code,null::text,p.favorite_color from public.profiles p
 where (p_code is not null and p.player_code=upper(trim(p_code)))
 or (auth.uid() is not null and cardinality(p_ids)<=256 and p.id=any(p_ids))
 limit 256;
$$;
revoke all on function public.tourneo_profils_publics(text,uuid[]) from public;
grant execute on function public.tourneo_profils_publics(text,uuid[]) to authenticated;

create or replace function public.tourneo_public_v2(p_id uuid)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
select jsonb_build_object('id',t.id,'nom',t.nom,'sport',t.sport,'donnees',jsonb_build_object(
  'equipes',coalesce((select jsonb_agg(jsonb_build_object('id',e->'id','profilId',e->'profilId','nom',e->'nom','emoji',e->'emoji','couleur',e->'couleur'))from jsonb_array_elements(coalesce(t.donnees->'equipes','[]'::jsonb))e),'[]'::jsonb),
  'matchs',coalesce(t.donnees->'matchs','[]'::jsonb),'formatTournoi',t.donnees->'formatTournoi','optionsV2',t.donnees->'optionsV2',
  'matchsValides',t.donnees->'matchsValides','termine',t.donnees->'termine'
))from public.tournois t where t.id=p_id and t.user_id=auth.uid();
$$;

revoke execute on function public.tourneo_public_v2(uuid) from anon;
