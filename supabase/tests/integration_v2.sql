begin;
insert into auth.users(id,aud,role) values('10000000-0000-4000-8000-000000000001','authenticated','authenticated'),('10000000-0000-4000-8000-000000000002','authenticated','authenticated');
insert into public.profiles(id,display_name,player_code) values('10000000-0000-4000-8000-000000000001','Test organisateur','TEST-OWNER'),('10000000-0000-4000-8000-000000000002','Test arbitre','TEST-REF');
insert into public.tournois(id,user_id,nom,donnees) values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Verification V2','{"equipes":[],"matchs":[{"id":1}],"cree":false}');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.tourneo_configurer_inscriptions('20000000-0000-4000-8000-000000000001',true,2,null,false);
select public.tourneo_ajouter_arbitre('20000000-0000-4000-8000-000000000001','TEST-REF');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$
begin
 if (select count(*) from public.tournois)<>0 then raise exception 'RLS tournois failed'; end if;
 if (select count(*) from public.profiles)<>1 then raise exception 'RLS profiles failed'; end if;
 begin
 perform public.tourneo_configurer_inscriptions('20000000-0000-4000-8000-000000000001',false,2,null,false);
 raise exception 'Unauthorized organizer accepted';
 exception when raise_exception then if sqlerrm<>'Accès organisateur requis' then raise; end if; end;
 perform public.tourneo_proposer_score('20000000-0000-4000-8000-000000000001',1,4,2);
end $$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$
declare r jsonb;
begin
 r:=public.tourneo_inscrire('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Alpha','individuel','{}');
 if r->>'statut'<>'accepte' then raise exception 'Acceptance failed';end if;
 r:=public.tourneo_inscrire('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','Beta','individuel','{}');
 r:=public.tourneo_inscrire('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000003','Gamma','individuel','{}');
 if r->>'statut'<>'en_attente' then raise exception 'Quota failed';end if;
 r:=public.tourneo_inscrire('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Alpha','individuel','{}');
 if r->>'statut'<>'accepte' then raise exception 'Idempotency failed';end if;
 r:=public.tourneo_mon_inscription('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',true);
 if r->>'statut'<>'annule' then raise exception 'Cancellation failed';end if;
 if not has_function_privilege('anon','public.tourneo_public_v2(uuid)','execute') then raise exception 'Approved public sharing unavailable';end if;
end $$;
reset role;
update public.tournois set donnees=donnees||'{"termine":true,"equipes":[{"profilId":"10000000-0000-4000-8000-000000000002"}]}'::jsonb where id='20000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
insert into public.tourneo_evaluations(tournoi_id,user_id,note,commentaire) values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',4,'Test temporaire');
update public.tourneo_evaluations set note=5 where tournoi_id='20000000-0000-4000-8000-000000000001';
do $$
begin
 if (select count(*) from public.tourneo_notifications)<>1 then raise exception 'Notification isolation failed';end if;
 begin
 update public.tourneo_notifications set message='forged';
 raise exception 'Notification message writable';
 exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$
begin
 if (select count(*) from public.tourneo_evaluations where note=5)<>1 then raise exception 'Organizer feedback unavailable';end if;
 if (select count(*) from public.tourneo_notifications)<>4 then raise exception 'Organizer notifications incorrect';end if;
 begin
 insert into public.tourneo_evaluations(tournoi_id,user_id,note)values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',5);
 raise exception 'Self-review accepted';
 exception when insufficient_privilege then null;end;
end $$;
insert into public.tourneo_preferences(user_id,communications_tourneo) values('10000000-0000-4000-8000-000000000001',true);
do $$
begin
 if not exists(select 1 from public.tourneo_preferences where consentement_promotion_at is not null) then raise exception 'Consent timestamp missing';end if;
end $$;
update public.tourneo_preferences set communications_tourneo=false,notifications_sportives=false;
do $$
begin
 if exists(select 1 from public.tourneo_preferences where consentement_promotion_at is not null) then raise exception 'Consent withdrawal failed';end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select public.tourneo_proposer_score('20000000-0000-4000-8000-000000000001',1,5,2);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$begin if (select count(*) from public.tourneo_notifications)<>4 then raise exception 'Sports opt-out ignored';end if;end $$;
reset role;
select 'Feedback, notifications isolation, self-review denial, consent/withdrawal, sports opt-out; RLS, organizer denial, referee score, quota, idempotency, cancellation, approved public sharing: OK' as result;
rollback;
