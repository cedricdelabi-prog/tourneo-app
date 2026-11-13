begin;
insert into auth.users(id,aud,role)values('a1000000-0000-4000-8000-000000000001','authenticated','authenticated'),('a1000000-0000-4000-8000-000000000002','authenticated','authenticated'),('a1000000-0000-4000-8000-000000000003','authenticated','authenticated');
insert into public.tournois(id,user_id,nom,sport,donnees)values('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','Tennis','tennis','{"cree":true,"equipes":[],"matchs":[{"id":1}],"matchsValides":[],"optionsV2":{"score":"sets","setsGagnants":2,"cibleManche":6,"ecartManche":2,"plafondManche":7}}');
insert into public.tourneo_arbitres(tournoi_id,user_id)values('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000003',true);
do $$begin
 begin perform public.tourneo_proposer_manches('a2000000-0000-4000-8000-000000000001',1,'[{"score1":"6","score2":"4"},{"score1":"7","score2":"6"}]');raise exception 'Étranger autorisé';exception when raise_exception then if sqlerrm<>'Accès arbitre requis'then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
select public.tourneo_proposer_manches('a2000000-0000-4000-8000-000000000001',1,'[{"score1":"6","score2":"4","secret":"retirer"},{"score1":"7","score2":"6"}]');
do $$declare r jsonb;begin
 if not exists(select 1 from public.tourneo_scores_proposes where score1=2 and score2=0 and statut='propose'and jsonb_array_length(manches)=2 and manches::text not like '%secret%')then raise exception 'Sets mal transférés';end if;
 r:=public.tourneo_mes_arbitrages();if r->0->>'sport'<>'tennis'or(r->0->'regles'->>'setsGagnants')::int<>2 then raise exception 'Contexte de tennis absent';end if;
 begin perform public.tourneo_proposer_manches('a2000000-0000-4000-8000-000000000001',1,'[{"score1":"6","score2":"5"},{"score1":"6","score2":"1"}]');raise exception '6-5 accepté';exception when raise_exception then if sqlerrm='6-5 accepté'then raise;end if;end;
 begin perform public.tourneo_proposer_manches('a2000000-0000-4000-8000-000000000001',1,'[{"score1":"6","score2":"4"}]');raise exception 'Match incomplet accepté';exception when raise_exception then if sqlerrm='Match incomplet accepté'then raise;end if;end;
 begin perform public.tourneo_proposer_manches('a2000000-0000-4000-8000-000000000001',1,'[{"score1":"6","score2":"4"},{"score1":"6","score2":"4"},{"score1":"6","score2":"0"}]');raise exception 'Manche en trop acceptée';exception when raise_exception then if sqlerrm='Manche en trop acceptée'then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
do $$begin if (select donnees->'matchsValides'from public.tournois where id='a2000000-0000-4000-8000-000000000001')<>'[]'::jsonb then raise exception 'Transfert valide automatiquement le match';end if;end$$;
reset role;
update public.tournois set donnees=jsonb_set(donnees,'{matchsValides}','[1]')where id='a2000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
do $$begin
 begin perform public.tourneo_proposer_manches('a2000000-0000-4000-8000-000000000001',1,'[{"score1":"6","score2":"4"},{"score1":"6","score2":"4"}]');raise exception 'Match validé écrasé';exception when raise_exception then if sqlerrm<>'Le résultat est déjà validé'then raise;end if;end;
end$$;
reset role;
rollback;
