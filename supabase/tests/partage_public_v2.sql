begin;
insert into auth.users(id,aud,role)values('40000000-0000-4000-8000-000000000001','authenticated','authenticated');
insert into public.tournois(id,user_id,nom,sport,donnees)values(
'50000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','Test partage','petanque',
'{"equipes":[{"id":"40000000-0000-4000-8000-000000000002","profilId":"SECRET-PROFIL","nom":"Alpha","photo":"SECRET-PHOTO","email":"SECRET-CONTACT"},{"id":"invite","nom":"Beta"}],"matchs":[{"id":1,"journee":1,"terrain":2,"equipe1Id":"duo:40000000-0000-4000-8000-000000000002|invite","equipe2Id":"invite","joueurs1Ids":["40000000-0000-4000-8000-000000000002","invite"],"score1":"13","score2":"4","photo":"SECRET-MATCH-PHOTO"}],"optionsV2":{"score":"points","email":"SECRET-OPTION","exemptions":[{"ronde":1,"id":"invite","contact":"SECRET-EXEMPTION"}]},"podiumPhotoUrl":"SECRET-PODIUM","termine":true}');
set local role anon;
do $$
declare r jsonb;a text;b text;
begin
 r:=public.tourneo_public_v2('50000000-0000-4000-8000-000000000001');
 if r is null then raise exception 'Public access failed';end if;
 if r::text like '%SECRET%' or r::text like '%40000000-0000-4000-8000-00000000000%' then raise exception 'Private data escaped';end if;
 a:=r->'donnees'->'equipes'->0->>'id';b:=r->'donnees'->'equipes'->1->>'id';
 if r->'donnees'->'matchs'->0->>'equipe1Id'<>'duo:'||a||'|'||b then raise exception 'Rotation aliases inconsistent';end if;
 if r->'donnees'->'optionsV2'->'exemptions'->0->>'id'<>b then raise exception 'Bye alias inconsistent';end if;
 if r->'donnees'->'matchs'->0->>'terrain'<>'2' then raise exception 'Court missing';end if;
 if r->'donnees'->'matchs'->0->>'score1'<>'13' then raise exception 'Score missing';end if;
end $$;
reset role;
select 'Public access, private fields removed, participant IDs aliased, rotation and bye consistency: OK' as result;
rollback;
