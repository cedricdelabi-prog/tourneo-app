-- Verify cross-player lookup survives owner-only profiles RLS, without exposing private columns.
-- Runs on a disposable V2 schema and rolls back all fixtures.
begin;
insert into auth.users(id,aud,role) values
('81000000-0000-4000-8000-000000000001','authenticated','authenticated'),
('81000000-0000-4000-8000-000000000002','authenticated','authenticated');
insert into public.profiles(id,display_name,player_code,city,ville_publique) values
('81000000-0000-4000-8000-000000000001','Test organisateur','TRN-8100-0001','Ville privee',false),
('81000000-0000-4000-8000-000000000002','Test participant','TRN-8100-0002','Ville secrete',false);
set local role authenticated;
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000001',true);
do $$
declare resultat jsonb; participant uuid:='81000000-0000-4000-8000-000000000002'; ligne jsonb;
begin
 if exists(select 1 from public.profiles where id=participant) then
  raise exception 'Owner RLS bypassed: participant profile directly readable';
 end if;
 select tourneo_private.profils_identites('TRN-8100-0002',null,null) into resultat;
 if jsonb_array_length(resultat)<>1 then raise exception 'Participant lookup broken';end if;
 ligne:=resultat->0;
 if ligne->>'id'<>participant::text or ligne->>'player_code'<>'TRN-8100-0002' then
  raise exception 'Player identity lookup mismatch';end if;
 if ligne ? 'email' or ligne ? 'first_name' or ligne ? 'last_name'
 or ligne->>'city' is not null or ligne->>'avatar_url' is not null then
  raise exception 'Private profile data escaped';end if;
 select to_jsonb(p) into ligne from public.tourneo_profils_publics('TRN-8100-0002',null) p limit 1;
 if ligne->>'id'<>participant::text or ligne->>'avatar_url' is not null then
  raise exception 'Public player code lookup broken or private avatar exposed';end if;
end $$;
reset role;
select 'Cross-player lookup with owner RLS and privacy: OK' as result;
rollback;
