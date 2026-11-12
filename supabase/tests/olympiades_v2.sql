begin;
insert into auth.users(id,aud,role)values('80000000-0000-4000-8000-000000000001','authenticated','authenticated'),('80000000-0000-4000-8000-000000000002','authenticated','authenticated');
set local role authenticated;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000001',true);
insert into public.tourneo_olympiades(id,nom,donnees)values('81000000-0000-4000-8000-000000000001','Olympiades test','{"version":1,"nom":"Olympiades test","secret":"PRIVATE","equipes":[{"id":"80000000-0000-4000-8000-000000000001","nom":"Bleus","joueurs":["PRIVATE-MEMBRE"]},{"id":"b","nom":"Rouges","joueurs":[]}],"epreuves":[{"id":"r","nom":"Relais","unite":"secondes","sens":"moins","validee":true,"mesures":{"80000000-0000-4000-8000-000000000001":"10","b":"12"},"secret":"PRIVATE"},{"id":"l","nom":"PRIVATE-DRAFT","validee":false,"mesures":{}}]}');
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000002',true);
do $$begin
 if exists(select 1 from public.tourneo_olympiades) then raise exception 'Other owner can read';end if;
 update public.tourneo_olympiades set partage=true where id='81000000-0000-4000-8000-000000000001';if found then raise exception 'Other owner can update';end if;
end $$;
reset role;
set local role anon;
do $$begin
 if has_table_privilege('anon','public.tourneo_olympiades','SELECT') then raise exception 'Anon can read private table';end if;
 if public.tourneo_olympiade_publique('81000000-0000-4000-8000-000000000001') is not null then raise exception 'Private olympiad exposed';end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000001',true);
update public.tourneo_olympiades set partage=true where id='81000000-0000-4000-8000-000000000001' and revision=0;
reset role;
set local role anon;
do $$declare r jsonb;cle text;begin
 r:=public.tourneo_olympiade_publique('81000000-0000-4000-8000-000000000001');
 if r is null or r::text like '%PRIVATE%' or r::text like '%80000000-0000-4000-8000-000000000001%' then raise exception 'Public projection leaks private fields';end if;
 if jsonb_array_length(r->'epreuves')<>1 then raise exception 'Unvalidated results visible';end if;
 cle:=r->'equipes'->0->>'id';
 if r->'epreuves'->0->'mesures'->>cle<>'10' then raise exception 'Result identity lost';end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000001',true);
update public.tourneo_olympiades set partage=false where id='81000000-0000-4000-8000-000000000001' and revision=1;
reset role;
set local role anon;
do $$begin if public.tourneo_olympiade_publique('81000000-0000-4000-8000-000000000001') is not null then raise exception 'Revocation ignored';end if;end $$;
reset role;
rollback;
