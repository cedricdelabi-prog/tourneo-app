begin;
insert into auth.users(id,aud,role) values('91000000-0000-4000-8000-000000000001','authenticated','authenticated');
insert into public.tournois(id,user_id,nom,donnees) values('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','Équipes QR','{"cree":false,"equipes":[],"matchs":[]}');
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
select public.tourneo_configurer_inscriptions('92000000-0000-4000-8000-000000000001',true,10,null,false);
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select public.tourneo_inscrire('92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001','Alice','individuel','{}');
reset role;
do $$
declare ident text;
begin
 select 'inscription:'||id::text into ident from public.tourneo_inscriptions where tournoi_id='92000000-0000-4000-8000-000000000001';
 perform set_config('test.inscrit',ident,true);
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
do $$
declare d jsonb;
begin
 d:=jsonb_build_object('equipes',jsonb_build_array(jsonb_build_object('id','bleus','membresOrigine','[]'::jsonb),jsonb_build_object('id','rouges')),'matchs','[]'::jsonb);
 begin
 perform public.tourneo_demarrer('92000000-0000-4000-8000-000000000001',d,'Équipes QR','petanque');
 raise exception 'Missing accepted registration allowed';
 exception when raise_exception then if sqlerrm<>'Nouvelles inscriptions acceptées : rechargez avant de démarrer' then raise;end if;end;
 d:=jsonb_set(d,'{equipes,0,membresOrigine}',jsonb_build_array(jsonb_build_object('id',current_setting('test.inscrit'))));
 perform public.tourneo_demarrer('92000000-0000-4000-8000-000000000001',d,'Équipes QR','petanque');
 if not (select (donnees->>'cree')::boolean from public.tournois where id='92000000-0000-4000-8000-000000000001') then raise exception 'Grouped launch failed';end if;
end $$;
rollback;
