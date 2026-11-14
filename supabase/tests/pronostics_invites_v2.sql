begin;
insert into auth.users(id,email,email_confirmed_at)values('f1000000-0000-4000-8000-000000000001','owner@example.invalid',now()),('f1000000-0000-4000-8000-000000000002','voter@example.invalid',now());
insert into public.tournois(id,user_id,nom,sport,donnees)values('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001','Pronostics libres','petanque','{"cree":false,"equipes":[{"id":"a","nom":"Alpha"},{"id":"b","nom":"Bravo"},{"id":"c","nom":"Charlie"}],"matchs":[]}');
set local role authenticated;select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000001',true);
select public.tourneo_pronostics_configurer('f2000000-0000-4000-8000-000000000001',true,'vainqueur',null);
set local role anon;select set_config('request.jwt.claim.sub','',true);
do $$declare r jsonb;alias text;begin
 r:=public.tourneo_pronostics_lecture('f2000000-0000-4000-8000-000000000001');if(r->>'invites_autorises')::boolean is not true then raise exception 'Invités absents';end if;alias:=r#>>'{equipes,0,id}';
 begin perform public.tourneo_pronostics_invite_voter('f2000000-0000-4000-8000-000000000001','f3000000-0000-4000-8000-000000000001','   ',array[alias]);raise exception 'Nom vide accepté';exception when raise_exception then if sqlerrm not like 'Indiquez votre nom%'then raise;end if;end;
 r:=public.tourneo_pronostics_invite_voter('f2000000-0000-4000-8000-000000000001','f3000000-0000-4000-8000-000000000001','Spectateur libre',array[alias]);
 if(r->>'nombre')::integer<>1 or r->>'mon_nom'<>'Spectateur libre'or r->'mon_choix'<>to_jsonb(array[alias])then raise exception 'Vote invité manquant';end if;
 r:=public.tourneo_pronostics_invite_lecture('f2000000-0000-4000-8000-000000000001','f3000000-0000-4000-8000-000000000002');if r->'mon_choix'<>'null'::jsonb then raise exception 'Choix autre navigateur exposé';end if;
 r:=public.tourneo_pronostics_lecture('f2000000-0000-4000-8000-000000000001');if r::text like '%Spectateur libre%'or r::text like '%f3000000%'then raise exception 'Identité/jeton exposé avant résultats';end if;
 r:=public.tourneo_pronostics_invite_voter('f2000000-0000-4000-8000-000000000001','f3000000-0000-4000-8000-000000000001','Nom corrigé',array[alias]);if(r->>'nombre')::integer<>1 then raise exception 'Double vote au même jeton';end if;
 begin select * from tourneo_private.pronostics_invites;raise exception 'Table privée accessible';exception when insufficient_privilege then null;end;
end$$;
set local role authenticated;select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000001',true);
do $$begin begin perform public.tourneo_pronostics_configurer('f2000000-0000-4000-8000-000000000001',true,'podium_ordre',null);raise exception 'Règles modifiées après vote invité';exception when raise_exception then if sqlerrm not like 'Des pronostics existent%'then raise;end if;end;end$$;
select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000002',true);
do $$declare r jsonb;begin
 r:=public.tourneo_pronostics_lecture('f2000000-0000-4000-8000-000000000001');perform public.tourneo_pronostics_voter('f2000000-0000-4000-8000-000000000001',array[r#>>'{equipes,0,id}']);
 r:=public.tourneo_pronostics_invite_voter('f2000000-0000-4000-8000-000000000001','f3000000-0000-4000-8000-000000000003','Ancien compte conservé',array[r#>>'{equipes,0,id}']);if(r->>'nombre')::integer<>2 or r->>'mon_nom'<>'Ancien compte conservé'then raise exception 'Ancien compte dupliqué';end if;
end$$;
reset role;
-- Simulate the organizer's validated final result; no real user tournament is changed.
update public.tournois set donnees=jsonb_set(jsonb_set(jsonb_set(donnees,'{cree}','true'),'{termine}','true'),'{matchs}','[{"id":1,"equipe1Id":"a","equipe2Id":"b","score1":"13","score2":"8"}]')||'{"matchsValides":[1]}'::jsonb where id='f2000000-0000-4000-8000-000000000001';
set local role anon;select set_config('request.jwt.claim.sub','',true);
do $$declare r jsonb;begin r:=public.tourneo_pronostics_invite_lecture('f2000000-0000-4000-8000-000000000001','f3000000-0000-4000-8000-000000000001');begin perform public.tourneo_pronostics_invite_voter('f2000000-0000-4000-8000-000000000001','f3000000-0000-4000-8000-000000000001','Tardif',array[r#>>'{equipes,0,id}']);raise exception 'Vote tardif accepté';exception when raise_exception then if sqlerrm<>'Les pronostics sont fermés'then raise;end if;end;end$$;
set local role authenticated;select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000001',true);
do $$declare rev bigint;begin select revision into rev from public.tournois where id='f2000000-0000-4000-8000-000000000001';perform public.tourneo_pronostics_publier('f2000000-0000-4000-8000-000000000001',rev,array['a','b','c']);end$$;
set local role anon;select set_config('request.jwt.claim.sub','',true);
do $$declare r jsonb;begin
 r:=public.tourneo_pronostics_invite_lecture('f2000000-0000-4000-8000-000000000001','f3000000-0000-4000-8000-000000000001');if jsonb_array_length(r->'classement')<>2 or(r#>>'{mon_rang,rang}')::integer<>1 then raise exception 'Classement commun erroné: %',r;end if;
 if r::text like '%f3000000%'or r::text like '%f1000000%'then raise exception 'Identifiants ou jetons publics';end if;
 perform public.tourneo_pronostics_invite_retirer('f2000000-0000-4000-8000-000000000001','f3000000-0000-4000-8000-000000000002');r:=public.tourneo_pronostics_lecture('f2000000-0000-4000-8000-000000000001');if(r->>'nombre')::integer<>2 then raise exception 'Autre jeton supprime vote';end if;
 r:=public.tourneo_pronostics_invite_retirer('f2000000-0000-4000-8000-000000000001','f3000000-0000-4000-8000-000000000001');if(r->>'nombre')::integer<>1 then raise exception 'Retrait personnel non appliqué';end if;
end$$;
reset role;rollback;
