begin;
insert into auth.users(id,aud,role) values('d0110000-0000-4000-8000-000000000001','authenticated','authenticated'),('d0110000-0000-4000-8000-000000000002','authenticated','authenticated');
set local role authenticated;
select set_config('request.jwt.claim.sub','d0110000-0000-4000-8000-000000000001',true);
insert into public.tourneo_preferences(user_id,langue) values(auth.uid(),'de');
do $$
declare langue_valide text;
begin
 if (select langue from public.tourneo_preferences where user_id=auth.uid())<>'de' then raise exception 'German preference not saved'; end if;
 foreach langue_valide in array array['fr','en','nl','de'] loop
  update public.tourneo_preferences set langue=langue_valide where user_id=auth.uid();
 end loop;
 begin
  update public.tourneo_preferences set langue='invalid' where user_id=auth.uid();
  raise exception 'Invalid language accepted';
 exception when check_violation then null;
 end;
 if (select communications_tourneo from public.tourneo_preferences where user_id=auth.uid()) then raise exception 'Marketing consent changed'; end if;
end $$;
select set_config('request.jwt.claim.sub','d0110000-0000-4000-8000-000000000002',true);
do $$begin
 if exists(select 1 from public.tourneo_preferences) then raise exception 'Another account can read language preference';end if;
end $$;
rollback;
