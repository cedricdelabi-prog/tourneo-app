begin;
insert into auth.users(id,aud,role,email_confirmed_at)values
('e1000000-0000-4000-8000-000000000001','authenticated','authenticated',now()),
('e1000000-0000-4000-8000-000000000002','authenticated','authenticated',now()),
('e1000000-0000-4000-8000-000000000003','authenticated','authenticated',now()),
('e1000000-0000-4000-8000-000000000004','authenticated','authenticated',now()),
('e1000000-0000-4000-8000-000000000005','authenticated','authenticated',null);
insert into tourneo_private.administrateurs(user_id,role)values('e1000000-0000-4000-8000-000000000001','superadmin');
insert into public.profiles(id,display_name,player_code,city,ville_publique)values
('e1000000-0000-4000-8000-000000000002','Alex','TEST-A2','Calais',true),
('e1000000-0000-4000-8000-000000000003','Alex','TEST-A3','Paris',false);
insert into public.tourneo_preferences(user_id,communications_tourneo,notifications_sportives)values
('e1000000-0000-4000-8000-000000000002',true,true),('e1000000-0000-4000-8000-000000000004',false,false);
set local role authenticated;
select set_config('request.jwt.claim.sub','e1000000-0000-4000-8000-000000000003',true);
do $$begin
 begin perform public.tourneo_admin_messages_apercu('information');raise exception 'Admin bypass';exception when raise_exception then if sqlerrm<>'Accès super administrateur requis'then raise;end if;end;
 if exists(select 1 from public.tourneo_messages)then raise exception 'Unexpected messages';end if;
 if(public.tourneo_profils_identites(null,array['e1000000-0000-4000-8000-000000000002'::uuid],null)->0->>'city')<>'Calais'then raise exception 'Opted-in city missing';end if;
 if(public.tourneo_profils_identites(null,array[auth.uid()],null)->0->>'city')is not null then raise exception 'Private city exposed';end if;
 if has_function_privilege('anon','public.tourneo_profils_identites(text,uuid[],text)','execute')then raise exception 'Anonymous profile search';end if;
end $$;
select set_config('request.jwt.claim.sub','e1000000-0000-4000-8000-000000000001',true);
do $$declare r jsonb;begin
 r:=public.tourneo_admin_messages_apercu('information');if(r->>'destinataires')::integer<>4 then raise exception 'Info recipient count';end if;
 r:=public.tourneo_admin_messages_apercu('promotion');if(r->>'destinataires')::integer<>1 then raise exception 'Promotion ignores consent';end if;
 perform public.tourneo_admin_messages_envoyer('e3000000-0000-4000-8000-000000000001','Nouveauté test','Message informatif de test','information');
 perform public.tourneo_admin_messages_envoyer('e3000000-0000-4000-8000-000000000001','Nouveauté test','Message informatif de test','information');
 perform public.tourneo_admin_messages_envoyer('e3000000-0000-4000-8000-000000000002','Promotion test','Message promotionnel de test','promotion');
 if jsonb_array_length(public.tourneo_admin_messages_historique())<>2 then raise exception 'Idempotence failed';end if;
end $$;
select set_config('request.jwt.claim.sub','e1000000-0000-4000-8000-000000000002',true);
do $$begin
 if(select count(*)from public.tourneo_messages)<>2 then raise exception 'Own inbox delivery';end if;
 update public.tourneo_messages set lu=true;
 begin update public.tourneo_messages set user_id='e1000000-0000-4000-8000-000000000003';raise exception 'Message ownership mutable';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','e1000000-0000-4000-8000-000000000003',true);
do $$begin if(select count(*)from public.tourneo_messages)<>1 then raise exception 'Other inbox visible';end if;if exists(select 1 from public.tourneo_messages where lu)then raise exception 'Read state crossed inboxes';end if;end $$;
reset role;
do $$begin if(select count(*)from public.tourneo_messages)<>5 then raise exception 'Double messages or consent leak';end if;end $$;
insert into public.tournois(id,user_id,nom,donnees)values('e2000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001','Tournoi rappel','{"optionsV2":{"depart":"2026-12-01T14:00","rappelAvant":30,"fuseauHoraire":"Europe/Paris"},"equipes":[{"id":"e1000000-0000-4000-8000-000000000003"},{"id":"e1000000-0000-4000-8000-000000000004"}],"matchs":[]}');
insert into public.tourneo_inscriptions(tournoi_id,user_id,jeton,nom,statut)values('e2000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000002','e4000000-0000-4000-8000-000000000001','Alex Calais','accepte');
do $$begin
 if tourneo_private.envoyer_rappels('2026-12-01T12:29:59Z')<>0 then raise exception 'Reminder too early';end if;
 if tourneo_private.envoyer_rappels('2026-12-01T12:30:00Z')<>2 then raise exception 'Wrong timezone or preferences';end if;
 if tourneo_private.envoyer_rappels('2026-12-01T12:31:00Z')<>0 then raise exception 'Duplicate reminder';end if;
 if tourneo_private.envoyer_rappels('2026-12-01T13:00:00Z')<>0 then raise exception 'Reminder after start';end if;
 if has_function_privilege('authenticated','tourneo_private.envoyer_rappels(timestamptz)','execute')then raise exception 'Reminder job publicly callable';end if;
end $$;
update public.tournois set donnees=jsonb_set(jsonb_set(donnees,'{optionsV2,depart}','"2026-12-02T14:00"'),'{optionsV2,rappelAvant}','15')where id='e2000000-0000-4000-8000-000000000001';
do $$begin
 if tourneo_private.envoyer_rappels('2026-12-02T12:44:00Z')<>0 then raise exception '15 minute reminder too early';end if;
 if tourneo_private.envoyer_rappels('2026-12-02T12:45:00Z')<>2 then raise exception '15 minute reminder missing';end if;
end $$;
rollback;
