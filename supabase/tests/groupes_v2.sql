begin;
insert into auth.users(id,aud,role) values('60000000-0000-4000-8000-000000000001','authenticated','authenticated'),('60000000-0000-4000-8000-000000000002','authenticated','authenticated'),('60000000-0000-4000-8000-000000000003','authenticated','authenticated');
insert into public.profiles(id,display_name,player_code)values('60000000-0000-4000-8000-000000000001','Propriétaire','GROUPE-OWNER'),('60000000-0000-4000-8000-000000000002','Accompagnateur','GROUPE-HELPER');
set local role authenticated;
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000001',true);
insert into public.tourneo_groupes(id,user_id,nom)values('70000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','Groupe test') returning nom;
insert into public.tourneo_groupe_participants(groupe_id,nom)values('70000000-0000-4000-8000-000000000001','Alpha');
select public.tourneo_partager_groupe('70000000-0000-4000-8000-000000000001','GROUPE-HELPER','lecture');
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000002',true);
do $$
begin
 if(select count(*)from public.tourneo_groupes)<>1 or(select count(*)from public.tourneo_groupe_participants)<>1 then raise exception 'Shared read failed';end if;
 begin
 insert into public.tourneo_groupe_participants(groupe_id,nom)values('70000000-0000-4000-8000-000000000001','Denied');
 raise exception 'Read-only member wrote to roster';
 exception when raise_exception then if sqlerrm<>'Accès accompagnateur requis' then raise;end if;end;
 begin
 perform public.tourneo_partager_groupe('70000000-0000-4000-8000-000000000001','GROUPE-OWNER','accompagnateur');
 raise exception 'Member granted permissions';
 exception when raise_exception then if sqlerrm<>'Accès propriétaire requis' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000001',true);
select public.tourneo_partager_groupe('70000000-0000-4000-8000-000000000001','GROUPE-HELPER','accompagnateur');
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000002',true);
insert into public.tourneo_groupe_participants(groupe_id,nom)values('70000000-0000-4000-8000-000000000001','Beta');
insert into public.tourneo_groupe_participants(groupe_id,nom) select '70000000-0000-4000-8000-000000000001'::uuid,'Participant '||n from generate_series(3,256) n;
do $$
begin
 begin
 insert into public.tourneo_groupe_participants(groupe_id,nom)values('70000000-0000-4000-8000-000000000001','Participant 257');
 raise exception 'Group quota bypassed';
 exception when raise_exception then if sqlerrm<>'Le groupe est limité à 256 participants' then raise;end if;end;
 begin
 update public.tourneo_groupes set user_id='60000000-0000-4000-8000-000000000002' where id='70000000-0000-4000-8000-000000000001';
 raise exception 'Ownership reassignment accepted';
 exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000003',true);
do $$begin if(select count(*)from public.tourneo_groupes)<>0 or(select count(*)from public.tourneo_groupe_participants)<>0 then raise exception 'Outsider read private group';end if;end $$;
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000001',true);
delete from public.tourneo_groupe_membres where groupe_id='70000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000002',true);
do $$begin if(select count(*)from public.tourneo_groupe_participants)<>0 then raise exception 'Revocation failed';end if;end $$;
reset role;
select 'Group creation/returning, shared read, edit denial, role upgrade, outsider isolation and access revocation: OK' as result;
rollback;
