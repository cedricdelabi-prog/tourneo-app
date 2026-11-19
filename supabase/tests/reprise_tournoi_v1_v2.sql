-- Simulate an existing V1 tournament in the V2 schema, including legacy share ID.
-- Rollback-only; tests ownership, JSON preservation and revision tracking.
begin;
alter table public.tournois add column partage_id uuid unique;
alter table public.tournois add column est_public boolean not null default true;
insert into auth.users(id,aud,role) values
('83000000-0000-4000-8000-000000000001','authenticated','authenticated'),
('83000000-0000-4000-8000-000000000002','authenticated','authenticated');
insert into public.tournois(id,user_id,nom,sport,donnees,partage_id,est_public)
values('83100000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001',
'Tournoi V1 repris','petanque',
'{"equipes":[{"nom":"Equipe ancienne"}],"matchs":[{"id":"M1","score":0}],"options":{"ancienne_option":true}}'::jsonb,
'83200000-0000-4000-8000-000000000001',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','83000000-0000-4000-8000-000000000001',true);
do $$
declare avant jsonb; apres jsonb; revision_avant bigint; revision_apres bigint;
begin
 select donnees,revision into avant,revision_avant from public.tournois
 where id='83100000-0000-4000-8000-000000000001';
 if avant->'options'->>'ancienne_option'<>'true' then raise exception 'V1 options missing';end if;
 update public.tournois set donnees=jsonb_set(donnees,'{matchs,0,score}','3'::jsonb)
 where id='83100000-0000-4000-8000-000000000001';
 select donnees,revision into apres,revision_apres from public.tournois
 where id='83100000-0000-4000-8000-000000000001';
 if apres->'matchs'->0->>'score'<>'3' or apres->'options'<>avant->'options'
 or apres->'equipes'<>avant->'equipes'
 then raise exception 'V1 JSON lost during V2 edit';end if;
 if revision_apres<=revision_avant then raise exception 'V2 revision not incremented';end if;
end $$;
select set_config('request.jwt.claim.sub','83000000-0000-4000-8000-000000000002',true);
do $$ begin
 if exists(select 1 from public.tournois where id='83100000-0000-4000-8000-000000000001')
 then raise exception 'Non-owner can read V1 tournament';end if;
 update public.tournois set nom='Intrusion' where id='83100000-0000-4000-8000-000000000001';
 if found then raise exception 'Non-owner modified V1 tournament';end if;
end $$;
reset role;
select 'V1 tournament JSON, V2 revision and ownership: OK' as result;
rollback;
