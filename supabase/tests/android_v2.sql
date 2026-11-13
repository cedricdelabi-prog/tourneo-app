begin;
insert into auth.users(id,aud,role)values('71000000-0000-4000-8000-000000000001','authenticated','authenticated'),('71000000-0000-4000-8000-000000000002','authenticated','authenticated');
select public.tourneo_worker_initialiser(repeat('A',87),repeat('A',43),false);
select public.tourneo_worker_android('tourneo-test');
set local role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000001',true);
do $$begin
 begin perform public.tourneo_android_inscrire('72000000-0000-4000-8000-000000000001',repeat('t',40),'71000000-0000-4000-8000-000000000002');raise exception 'Mauvais compte accepté';exception when raise_exception then if sqlerrm<>'Compte modifié'then raise;end if;end;
 perform public.tourneo_android_inscrire('72000000-0000-4000-8000-000000000001',repeat('t',40),'71000000-0000-4000-8000-000000000001');
 perform public.tourneo_android_inscrire('72000000-0000-4000-8000-000000000002',repeat('u',40),'71000000-0000-4000-8000-000000000001');
 if (select count(*)from public.tourneo_android_appareils)<>2 then raise exception 'Appareil perdu';end if;
 if not (public.tourneo_config_alertes()->>'android')::boolean then raise exception 'Configuration absente';end if;
end$$;
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000002',true);
do $$begin
 if exists(select 1 from public.tourneo_android_appareils)then raise exception 'Appareils visibles par étranger';end if;
 perform public.tourneo_android_retirer('72000000-0000-4000-8000-000000000001');
end$$;
reset role;
insert into public.tourneo_notifications(user_id,type,message)values('71000000-0000-4000-8000-000000000001','score','Test sans aucun transport');
do $$declare jobs jsonb; j jsonb;begin
 if not exists(select 1 from public.tourneo_envois where canal='android')then raise exception 'Canal absent';end if;
 if jsonb_array_length(public.tourneo_worker_prendre(false,false))<>0 then raise exception 'Canal désactivé pris';end if;
 jobs:=public.tourneo_worker_prendre(false,true);if jsonb_array_length(jobs)<>1 then raise exception 'Prise native incorrecte';end if;
 j:=jobs->0;if jsonb_array_length(j->'abonnements')<>2 then raise exception 'Appareils perdus';end if;
 perform public.tourneo_worker_finir((j->>'id')::uuid,(j->>'bail')::uuid,true,array[((j->'abonnements')->0->>'id')::uuid]);
 if (select count(*)from public.tourneo_android_appareils)<>1 then raise exception 'Jeton expiré conservé';end if;
end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000001',true);
select public.tourneo_android_retirer('72000000-0000-4000-8000-000000000001');
select public.tourneo_android_retirer('72000000-0000-4000-8000-000000000002');
do $$begin if exists(select 1 from public.tourneo_preferences where user_id=auth.uid()and notifications_android)then raise exception 'Dernier appareil retiré sans opt-out';end if;end$$;
reset role;
rollback;
