begin;
insert into auth.users(id,aud,role,email_confirmed_at) select ('b1000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'authenticated','authenticated',now() from generate_series(1,5)n;
insert into tourneo_private.administrateurs(user_id,role) values('b1000000-0000-4000-8000-000000000004','superadmin'),('b1000000-0000-4000-8000-000000000005','admin');
insert into public.tournois(id,user_id,nom,donnees) values('b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','Test sécurité','{"equipes":[{"profilId":"b1000000-0000-4000-8000-000000000002"}]}');
set local role authenticated;
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000001',true);
select public.tourneo_discussion_envoyer('b3000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','tous','Avant');
select public.tourneo_discussion_envoyer('b3000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000001','arbitres','Secret arbitres');
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000002',true);
select public.tourneo_discussion_envoyer('b3000000-0000-4000-8000-000000000003','b2000000-0000-4000-8000-000000000001','tous','Message à examiner');
select public.tourneo_discussion_signaler('b4000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000003','menace','Contexte du signalement');
select public.tourneo_discussion_signaler('b4000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000003','menace','Contexte du signalement');
do $$begin
 begin perform public.tourneo_discussion_signaler(gen_random_uuid(),'b3000000-0000-4000-8000-000000000002','autre','');raise exception 'Conversation privée accessible';exception when raise_exception then if sqlerrm<>'Message inaccessible' then raise;end if;end;
 if public.tourneo_moderation_compteur() is not null then raise exception 'Compteur privé exposé';end if;
 begin perform public.tourneo_moderation_liste();raise exception 'Joueur voit les signalements';exception when raise_exception then if sqlerrm<>'Accès super administrateur requis' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000003',true);
do $$begin
 begin perform public.tourneo_discussion_signaler(gen_random_uuid(),'b3000000-0000-4000-8000-000000000003','autre','');raise exception 'Étranger peut signaler une conversation';exception when raise_exception then if sqlerrm<>'Message inaccessible' then raise;end if;end;
 begin perform public.tourneo_moderation_decider('b4000000-0000-4000-8000-000000000001','bannir','Abus');raise exception 'Sanction non autorisée';exception when raise_exception then if sqlerrm<>'Accès super administrateur requis' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000005',true);
do $$begin
 begin perform public.tourneo_moderation_liste();raise exception 'Admin consultation voit les messages';exception when raise_exception then if sqlerrm<>'Accès super administrateur requis' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000004',true);
do $$declare l jsonb;begin
 if public.tourneo_moderation_compteur()<>1 then raise exception 'Signalement dupliqué ou alerte absente';end if;
 l:=public.tourneo_moderation_liste();
 if l::text like '%Secret arbitres%' then raise exception 'Contexte privé exposé au modérateur';end if;
 if l::text not like '%Message à examiner%' then raise exception 'Preuve absente';end if;
end $$;
select public.tourneo_moderation_decider('b4000000-0000-4000-8000-000000000001','masquer','Message masqué après examen');
select public.tourneo_moderation_decider('b4000000-0000-4000-8000-000000000001','suspendre_24h','Suspension justifiée');
select public.tourneo_moderation_decider('b4000000-0000-4000-8000-000000000001','suspendre_24h','Suspension justifiée');
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000002',true);
do $$begin
 if exists(select 1 from public.tourneo_discussions where id='b3000000-0000-4000-8000-000000000003') then raise exception 'Message masqué visible';end if;
 begin perform public.tourneo_discussion_envoyer(gen_random_uuid(),'b2000000-0000-4000-8000-000000000001','tous','Contournement');raise exception 'Suspension contournée';exception when raise_exception then if sqlerrm<>'Messagerie suspendue. Contactez Tourneo.' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000004',true);
select public.tourneo_moderation_decider('b4000000-0000-4000-8000-000000000001','retablir','Accès rétabli après examen');
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000002',true);
select public.tourneo_discussion_envoyer(gen_random_uuid(),'b2000000-0000-4000-8000-000000000001','tous','Retour autorisé');
reset role;
do $$begin
 if (select count(*) from tourneo_private.journal_admin where action='moderation_suspendre_24h')<>1 then raise exception 'Action rejouée';end if;
 if has_table_privilege('authenticated','tourneo_private.signalements_discussions','SELECT') then raise exception 'Preuves accessibles en direct';end if;
 if has_function_privilege('anon','public.tourneo_discussion_signaler(uuid,uuid,text,text)','EXECUTE') then raise exception 'Signalement anonyme permis';end if;
end $$;
delete from public.tournois where id='b2000000-0000-4000-8000-000000000001';
do $$begin
 if not exists(select 1 from tourneo_private.signalements_discussions where tournoi_id is null and contexte::text like '%Message à examiner%') then raise exception 'Preuves perdues après suppression du tournoi';end if;
end $$;
rollback;
