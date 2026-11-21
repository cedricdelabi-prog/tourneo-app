-- Rencontres personnelles, limitées au joueur connecté.
begin;
create function public.tourneo_mes_participations()returns jsonb language plpgsql stable security definer set search_path='' as $$
declare t public.tournois;m jsonb;ids text[];noms jsonb;resultat jsonb:='[]';matches jsonb;begin
 if auth.uid()is null then raise exception 'Connexion requise';end if;
 for t in select * from public.tournois where donnees->>'cree'='true' loop
  select coalesce(array_agg(e->>'id'),'{}')into ids from jsonb_array_elements(case when jsonb_typeof(t.donnees->'equipes')='array'then t.donnees->'equipes'else'[]'end)e where coalesce(e->>'profilId',e->>'id')=auth.uid()::text;
  if cardinality(ids)=0 then continue;end if;
  matches:='[]';
  for m in select x from jsonb_array_elements(case when jsonb_typeof(t.donnees->'matchs')='array'then t.donnees->'matchs'else'[]'end)x loop
   if m->>'equipe1Id'=any(ids)or m->>'equipe2Id'=any(ids)or string_to_array(replace(m->>'equipe1Id','duo:',''),'|')&&ids or string_to_array(replace(m->>'equipe2Id','duo:',''),'|')&&ids or exists(select 1 from jsonb_array_elements_text(case when jsonb_typeof(m->'joueurs1Ids')='array'then m->'joueurs1Ids'else'[]'end)x where x=any(ids))or exists(select 1 from jsonb_array_elements_text(case when jsonb_typeof(m->'joueurs2Ids')='array'then m->'joueurs2Ids'else'[]'end)x where x=any(ids))then
    select jsonb_object_agg(cote,nom)into noms from(select cote,coalesce(string_agg(e->>'nom',' / '),'À déterminer')as nom from unnest(array['1','2'])cote left join lateral jsonb_array_elements(t.donnees->'equipes')e on e->>'id'=any(string_to_array(replace(m->>('equipe'||cote||'Id'),'duo:',''),'|'))group by cote)q;
    matches:=matches||jsonb_build_array(jsonb_build_object('id',m->'id','journee',m->'journee','terrain',m->'terrain','participant1',noms->>'1','participant2',noms->>'2','score1',case when coalesce(t.donnees->'matchsValides','[]')@>jsonb_build_array(m->'id')then m->'score1'else null end,'score2',case when coalesce(t.donnees->'matchsValides','[]')@>jsonb_build_array(m->'id')then m->'score2'else null end,'valide',coalesce(t.donnees->'matchsValides','[]')@>jsonb_build_array(m->'id')));
   end if;
  end loop;
  if jsonb_array_length(matches)>0 then resultat:=resultat||jsonb_build_array(jsonb_build_object('id',t.id,'nom',t.nom,'sport',t.sport,'matchs',matches));end if;
 end loop;return resultat;end$$;
revoke all on function public.tourneo_mes_participations() from public,anon,authenticated;
grant execute on function public.tourneo_mes_participations() to authenticated;

commit;
