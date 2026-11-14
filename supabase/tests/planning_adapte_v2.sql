begin;
insert into auth.users(id,aud,role)values('c1000000-0000-4000-8000-000000000001','authenticated','authenticated');
insert into public.tournois(id,user_id,nom,sport,donnees)values('c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','Planning public','petanque','{"equipes":[{"id":"private-player","profilId":"SECRET","nom":"Alpha"},{"id":"other","nom":"Beta"}],"matchs":[{"id":1,"journee":1,"equipe1Id":"private-player","equipe2Id":"other","score1":"13","score2":"7"}],"optionsV2":{"adaptationPlanning":{"debutMinimum":25,"email":"SECRET","terrainsFermes":[2,"SECRET"],"fixes":[{"matchId":1,"terrain":1,"debut":0,"fin":10,"profil":"SECRET"},{"matchId":"SECRET","terrain":1,"debut":10,"fin":20}]},"budgetMinutes":120,"participantsPrevus":8},"matchsValides":[1]}');
set local role anon;
do $$ declare r jsonb;begin
 r:=public.tourneo_public_v2('c2000000-0000-4000-8000-000000000001');
 if r::text like '%SECRET%' or r::text like '%private-player%' or r::text like '%participantsPrevus%' then raise exception 'Private planning data escaped';end if;
 if r#>>'{donnees,optionsV2,adaptationPlanning,debutMinimum}'<>'25' then raise exception 'Minimum start missing';end if;
 if r#>'{donnees,optionsV2,adaptationPlanning,terrainsFermes}'<>'[2]'::jsonb then raise exception 'Court filter failed';end if;
 if r#>'{donnees,optionsV2,adaptationPlanning,fixes}'<>'[{"matchId":1,"terrain":1,"debut":0,"fin":10}]'::jsonb then raise exception 'Frozen slots projection failed';end if;
 begin perform 1 from public.tournois where id='c2000000-0000-4000-8000-000000000001';if found then raise exception 'Anon can read source';end if;exception when insufficient_privilege then null;end;
end $$;
reset role;
update public.tournois set donnees=jsonb_set(donnees,'{optionsV2,adaptationPlanning}','{"debutMinimum":"SECRET","terrainsFermes":{},"fixes":{}}')where id='c2000000-0000-4000-8000-000000000001';
set local role anon;
do $$ declare r jsonb;begin r:=public.tourneo_public_v2('c2000000-0000-4000-8000-000000000001');if r::text like '%SECRET%'then raise exception 'Malformed adaptation escaped';end if;end $$;
reset role;
rollback;
