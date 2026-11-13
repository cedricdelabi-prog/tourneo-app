alter table public.tourneo_scores_proposes add column manches jsonb check(manches is null or(jsonb_typeof(manches)='array'and jsonb_array_length(manches)between 1 and 9));
create function tourneo_private.proposer_manches(p_tournoi uuid,p_match integer,p_manches jsonb)returns void language plpgsql security definer set search_path='' as $$
declare t public.tournois;g integer;a integer;b integer;v1 integer:=0;v2 integer:=0;s jsonb;normalise jsonb:='[]';begin
 select * into t from public.tournois where id=p_tournoi for update;
 if t.id is null or auth.uid()is null or not exists(select 1 from public.tourneo_arbitres where tournoi_id=p_tournoi and user_id=auth.uid())then raise exception 'Accès arbitre requis';end if;
 if t.sport<>'tennis'or t.donnees->'optionsV2'->>'score'is distinct from 'sets'then raise exception 'Ce transfert est réservé au tennis en sets';end if;
 if not exists(select 1 from jsonb_array_elements(coalesce(t.donnees->'matchs','[]'))m where m->>'id'=p_match::text)then raise exception 'Match introuvable';end if;
 if coalesce(t.donnees->'matchsValides','[]')@>jsonb_build_array(p_match)then raise exception 'Le résultat est déjà validé';end if;
 g:=coalesce((t.donnees->'optionsV2'->>'setsGagnants')::integer,2);
 if g not between 1 and 5 or coalesce((t.donnees->'optionsV2'->>'cibleManche')::integer,6)not in(0,6)or coalesce((t.donnees->'optionsV2'->>'ecartManche')::integer,2)<>2 or coalesce((t.donnees->'optionsV2'->>'plafondManche')::integer,7)not in(0,7)or coalesce((t.donnees->'optionsV2'->>'cibleDecisive')::integer,0)<>0 then raise exception 'Barème personnalisé : saisie par l’organisateur requise';end if;
 if p_manches is null or jsonb_typeof(p_manches)<>'array'or jsonb_array_length(p_manches)not between 1 and 2*g-1 then raise exception 'Manches invalides';end if;
 for s in select x from jsonb_array_elements(p_manches)x loop
  if v1=g or v2=g then raise exception 'Manche après la fin du match';end if;
  if s->>'score1'is null or s->>'score2'is null or s->>'score1'!~'^[0-7]$'or s->>'score2'!~'^[0-7]$'then raise exception 'Score de set invalide';end if;
  a:=(s->>'score1')::integer;b:=(s->>'score2')::integer;
  if not((greatest(a,b)=6 and least(a,b)<=4)or(greatest(a,b)=7 and least(a,b)in(5,6)))then raise exception 'Le set doit se terminer à 6 jeux avec 2 jeux d’écart, 7–5 ou 7–6';end if;
  if a>b then v1:=v1+1;else v2:=v2+1;end if;
  normalise:=normalise||jsonb_build_array(jsonb_build_object('score1',a::text,'score2',b::text));
 end loop;
 if greatest(v1,v2)<>g then raise exception 'Match non terminé';end if;
 insert into public.tourneo_scores_proposes(tournoi_id,match_id,user_id,score1,score2,manches)values(p_tournoi,p_match,auth.uid(),v1,v2,normalise)
 on conflict(tournoi_id,match_id,user_id)do update set score1=excluded.score1,score2=excluded.score2,manches=excluded.manches,statut='propose',updated_at=now();
end$$;
create function public.tourneo_proposer_manches(p_tournoi uuid,p_match integer,p_manches jsonb)returns void language sql security invoker set search_path='' as $$select tourneo_private.proposer_manches(p_tournoi,p_match,p_manches)$$;
revoke all on function public.tourneo_proposer_manches(uuid,integer,jsonb),tourneo_private.proposer_manches(uuid,integer,jsonb)from public,anon;
grant execute on function public.tourneo_proposer_manches(uuid,integer,jsonb),tourneo_private.proposer_manches(uuid,integer,jsonb)to authenticated;
create or replace function public.tourneo_mes_arbitrages()
returns jsonb language sql security definer set search_path=public,pg_temp as $$
select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'nom',t.nom,'sport',t.sport,'equipes',t.donnees->'equipes','matchs',t.donnees->'matchs','valides',t.donnees->'matchsValides','score',t.donnees->'optionsV2'->>'score','regles',jsonb_build_object('setsGagnants',t.donnees->'optionsV2'->'setsGagnants','cibleManche',t.donnees->'optionsV2'->'cibleManche','ecartManche',t.donnees->'optionsV2'->'ecartManche','plafondManche',t.donnees->'optionsV2'->'plafondManche','cibleDecisive',t.donnees->'optionsV2'->'cibleDecisive'))),'[]'::jsonb)
from public.tournois t join public.tourneo_arbitres a on a.tournoi_id=t.id where a.user_id=auth.uid() and auth.uid()is not null;
$$;

create or replace function public.tourneo_proposer_score(p_tournoi uuid,p_match integer,p_score1 integer,p_score2 integer)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare t public.tournois;
begin
  select * into t from public.tournois where id=p_tournoi for update;
  if not found or auth.uid() is null or not exists(select 1 from public.tourneo_arbitres where tournoi_id=p_tournoi and user_id=auth.uid())then raise exception 'Accès arbitre requis';end if;
  if not exists(select 1 from jsonb_array_elements(t.donnees->'matchs')m where (m->>'id')::integer=p_match)then raise exception 'Match introuvable';end if;
  if coalesce(t.donnees->'matchsValides','[]'::jsonb)@>jsonb_build_array(p_match)then raise exception 'Le résultat est déjà validé';end if;
  if t.donnees->'optionsV2'->>'score'='sets' then raise exception 'Les manches doivent être saisies et validées par l’organisateur';end if;
  if p_score1<0 or p_score2<0 or p_score1>1000000 or p_score2>1000000 then raise exception 'Score invalide';end if;
  insert into public.tourneo_scores_proposes(tournoi_id,match_id,user_id,score1,score2)values(p_tournoi,p_match,auth.uid(),p_score1,p_score2)
  on conflict(tournoi_id,match_id,user_id)do update set score1=excluded.score1,score2=excluded.score2,manches=null,statut='propose',updated_at=now();
end $$;
