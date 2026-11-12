begin;
insert into auth.users(id,aud,role)values('70000000-0000-4000-8000-000000000001','authenticated','authenticated'),('70000000-0000-4000-8000-000000000002','authenticated','authenticated');
insert into public.tournois(id,user_id,nom,revision)values('71000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','Avant',999);
set local role authenticated;
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000001',true);
do $$
declare n integer;r bigint;
begin
 select revision into r from public.tournois where id='71000000-0000-4000-8000-000000000001';
 if r<>0 then raise exception 'Revision forged on insert';end if;
 update public.tournois set nom='Appareil A',revision=999 where id='71000000-0000-4000-8000-000000000001' and revision=0;
 get diagnostics n=row_count;if n<>1 then raise exception 'Current base refused';end if;
 update public.tournois set nom='Copie obsolète B' where id='71000000-0000-4000-8000-000000000001' and revision=0;
 get diagnostics n=row_count;if n<>0 then raise exception 'Stale base overwrote results';end if;
 if (select nom from public.tournois where id='71000000-0000-4000-8000-000000000001')<>'Appareil A' then raise exception 'Results overwritten';end if;
 select revision into r from public.tournois where id='71000000-0000-4000-8000-000000000001';
 if r<>1 then raise exception 'Monotone revision missing';end if;
 update public.tournois set nom='Résolution explicite' where id='71000000-0000-4000-8000-000000000001' and revision=1;
 if not found then raise exception 'Current revision cannot save';end if;
end $$;
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000002',true);
do $$begin
 update public.tournois set nom='Autre compte' where id='71000000-0000-4000-8000-000000000001' and revision=2;
 if found then raise exception 'Cross-owner write';end if;
end $$;
reset role;
rollback;
