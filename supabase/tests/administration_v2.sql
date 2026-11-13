begin;
insert into auth.users(id,aud,role,email,email_confirmed_at,raw_user_meta_data)values
('b1000000-0000-4000-8000-000000000001','authenticated','authenticated','owner@example.invalid',now(),'{}'),
('b1000000-0000-4000-8000-000000000002','authenticated','authenticated','admin@example.invalid',now(),'{}'),
('b1000000-0000-4000-8000-000000000003','authenticated','authenticated','player@example.invalid',now(),'{"role":"superadmin","expert":true,"structure":"Club test"}');
insert into tourneo_private.administrateurs(user_id,role)values('b1000000-0000-4000-8000-000000000001','superadmin');
set local role authenticated;
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000003',true);
do $$begin
 if public.tourneo_mon_role_admin()is not null then raise exception 'Métadonnées accordent des droits';end if;
 if not exists(select 1 from public.tourneo_compte_usage where structure='Club test')then raise exception 'Usage facultatif perdu';end if;
 if has_table_privilege('authenticated','tourneo_private.administrateurs','insert')or has_table_privilege('authenticated','tourneo_private.journal_admin','insert')then raise exception 'Écriture privée exposée';end if;
 begin perform public.tourneo_admin_tableau();raise exception 'Tableau admin exposé';exception when raise_exception then if sqlerrm<>'Accès administrateur requis'then raise;end if;end;
 begin perform public.tourneo_admin_role('b1000000-0000-4000-8000-000000000003','superadmin','auto promotion');raise exception 'Promotion autorisée';exception when raise_exception then if sqlerrm<>'Accès super administrateur requis'then raise;end if;end;
 if (public.tourneo_mon_offre()->>'paiement_actif')::boolean or not(public.tourneo_mon_offre()->>'expert_disponible')::boolean then raise exception 'V2 devenue payante';end if;
end$$;
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000001',true);
do $$begin
 begin perform public.tourneo_admin_role(auth.uid(),null,'retrait dernier');raise exception 'Dernier superadmin supprimé';exception when raise_exception then if sqlerrm<>'Le dernier super administrateur doit être conservé'then raise;end if;end;
 perform public.tourneo_admin_role('b1000000-0000-4000-8000-000000000002','admin','lecture statistiques');
 perform public.tourneo_admin_cadeau('b1000000-0000-4000-8000-000000000003',true,'accès offert test');
 if jsonb_array_length(public.tourneo_admin_comptes('player@example.invalid',0))<>1 then raise exception 'Recherche compte incorrecte';end if;
 if not exists(select 1 from jsonb_array_elements(public.tourneo_admin_journal())x where x->>'action'='expert_offert')then raise exception 'Audit absent';end if;
end$$;
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000002',true);
do $$begin
 perform public.tourneo_admin_tableau();
 begin perform public.tourneo_admin_cadeau('b1000000-0000-4000-8000-000000000003',false,'révocation non autorisée');raise exception 'Admin simple modifie les droits';exception when raise_exception then if sqlerrm<>'Accès super administrateur requis'then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000003',true);
do $$begin if not(public.tourneo_mon_offre()->>'expert_offert')::boolean then raise exception 'Cadeau non lié au compte';end if;end$$;
reset role;
insert into tourneo_private.licences_expert_vie(user_id,reference_achat)values('b1000000-0000-4000-8000-000000000003','reference-achat-privee');
set local role authenticated;
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000001',true);
select public.tourneo_admin_cadeau('b1000000-0000-4000-8000-000000000003',false,'retrait du cadeau uniquement');
select public.tourneo_admin_role('b1000000-0000-4000-8000-000000000002','superadmin','second super administrateur');
select public.tourneo_admin_role('b1000000-0000-4000-8000-000000000001','admin','passage de relais');
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000003',true);
do $$declare o jsonb;begin o:=public.tourneo_mon_offre();if(o->>'expert_offert')::boolean or not(o->>'licence_expert_vie')::boolean or o::text like '%reference-achat-privee%'then raise exception 'Retrait du cadeau altère ou divulgue un achat';end if;end$$;
reset role;
rollback;
