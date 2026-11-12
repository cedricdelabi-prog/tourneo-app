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
 if has_function_privilege('anon','public.tourneo_public_v2(uuid)','execute') then raise exception 'Public sharing should be blocked';end if;
end $$;
reset role;
select 'RLS, organizer denial, referee score, quota, idempotency, cancellation, private sharing: OK' as result;
rollback;
