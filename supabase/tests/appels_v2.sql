begin;
insert into auth.users(id,aud,role) values
 ('41000000-0000-4000-8000-000000000001','authenticated','authenticated'),
 ('41000000-0000-4000-8000-000000000002','authenticated','authenticated'),
 ('41000000-0000-4000-8000-000000000003','authenticated','authenticated'),
 ('41000000-0000-4000-8000-000000000004','authenticated','authenticated');
insert into public.profiles(id,display_name,player_code) values
 ('41000000-0000-4000-8000-000000000001','Organisateur test','CALL-OWNER'),
 ('41000000-0000-4000-8000-000000000002','Joueur test','CALL-PLAYER'),
 ('41000000-0000-4000-8000-000000000003','Joueur sans alertes','CALL-OPTOUT'),
 ('41000000-0000-4000-8000-000000000004','Étranger','CALL-STRANGER');
insert into public.tourneo_preferences(user_id,notifications_sportives) values('41000000-0000-4000-8000-000000000003',false);
insert into public.tournois(id,user_id,nom,donnees) values
 ('42000000-0000-4000-8000-000000000001','41000000-0000-4000-8000-000000000001','Test appels',
 '{"equipes":[{"id":"a","profilId":"41000000-0000-4000-8000-000000000002","nom":"Lié"},{"id":"b","profilId":"41000000-0000-4000-8000-000000000003","nom":"Retrait"},{"id":"c","nom":"Sans compte"},{"id":"d","nom":"Sans compte 2"}],"matchs":[{"id":1,"equipe1Id":"duo:a|b","equipe2Id":"duo:c|d","joueurs1Ids":["a","b"],"joueurs2Ids":["c","d"],"score1":"","score2":""},{"id":2,"equipe1Id":"a","equipe2Id":"c","score1":"2","score2":"0"}],"cree":true}');
set local role authenticated;
select set_config('request.jwt.claim.sub','41000000-0000-4000-8000-000000000004',true);
do $$begin
 begin perform public.tourneo_appel_match('42000000-0000-4000-8000-000000000001',1,true); raise exception 'Organizer check failed';
 exception when raise_exception then if sqlerrm<>'Accès organisateur requis' then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub','41000000-0000-4000-8000-000000000001',true);
do $$declare r jsonb;begin
 r:=public.tourneo_appel_match('42000000-0000-4000-8000-000000000001',1,false);
 if not exists(select 1 from jsonb_array_elements(r->'participants')x where x->>'statut'='disponible') then raise exception 'Eligible profile missing';end if;
 if (select count(*) from public.tourneo_appels)<>0 then raise exception 'Status query sent a notification';end if;
 r:=public.tourneo_appel_match('42000000-0000-4000-8000-000000000001',1,true);
 if (select count(*) from jsonb_array_elements(r->'participants')x where x->>'statut'='depose')<>1 then raise exception 'Call not deposited';end if;
 if (select count(*) from jsonb_array_elements(r->'participants')x where x->>'statut'='desactive')<>1 then raise exception 'Sports opt-out ignored';end if;
 if (select count(*) from jsonb_array_elements(r->'participants')x where x->>'statut'='sans_profil')<>2 then raise exception 'Manual players incorrectly alerted';end if;
 perform public.tourneo_appel_match('42000000-0000-4000-8000-000000000001',1,true);
 if (select count(*) from public.tourneo_appels)<>1 then raise exception 'Duplicate call';end if;
 r:=public.tourneo_appel_match('42000000-0000-4000-8000-000000000001',2,true);
 if not exists(select 1 from jsonb_array_elements(r->'participants')x where x->>'statut'='match_termine') then raise exception 'Completed match callable';end if;
 update public.tourneo_appels set lu=true;
 if exists(select 1 from public.tourneo_appels where lu) then raise exception 'Organizer forged read receipt';end if;
 begin insert into public.tourneo_appels(tournoi_id,match_id,user_id,organisateur_id,message)values('42000000-0000-4000-8000-000000000001',99,'41000000-0000-4000-8000-000000000002','41000000-0000-4000-8000-000000000001','forged'); raise exception 'Direct insert allowed';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','41000000-0000-4000-8000-000000000004',true);
do $$begin if (select count(*) from public.tourneo_appels)<>0 then raise exception 'Stranger can read calls';end if;end$$;
select set_config('request.jwt.claim.sub','41000000-0000-4000-8000-000000000002',true);
do $$begin
 if (select count(*) from public.tourneo_appels)<>1 then raise exception 'Recipient cannot read call';end if;
 update public.tourneo_appels set lu=true;
 if not exists(select 1 from public.tourneo_appels where lu) then raise exception 'Read receipt not saved';end if;
 begin update public.tourneo_appels set message='forged';raise exception 'Recipient changed message';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','41000000-0000-4000-8000-000000000001',true);
do $$declare r jsonb;begin
 r:=public.tourneo_appel_match('42000000-0000-4000-8000-000000000001',1,false);
 if not exists(select 1 from jsonb_array_elements(r->'participants')x where x->>'statut'='lu') then raise exception 'Organizer cannot see real read state';end if;
end$$;
reset role;
select 'Appels : propriétaire, consentement sportif, profils manuels/rotation, idempotence, RLS et état lu : OK' as result;
rollback;
