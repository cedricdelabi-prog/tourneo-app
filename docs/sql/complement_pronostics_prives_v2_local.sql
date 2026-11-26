-- Correctif de confidentialite des pronostics V2. A appliquer apres le delta principal sur copie V1 uniquement.
BEGIN;
DO $$ BEGIN IF current_database()<>'tourneo_v2_essai' OR to_regclass('tourneo_private.pronostics_invites') IS NULL THEN RAISE EXCEPTION 'COPIE LOCALE V2 UNIQUEMENT'; END IF; END $$;
SET LOCAL ROLE postgres;
create or replace function tourneo_private.pronostics_lecture(p_id uuid)returns jsonb language plpgsql stable security definer set search_path='' as $$
declare t public.tournois;c public.tourneo_pronostics_config;resultat jsonb;compatible boolean;publie boolean;begin
 select * into t from public.tournois where id=p_id;
 if not found or (t.est_public is not true and t.user_id is distinct from auth.uid()) then return jsonb_build_object('actif',false);end if;
 select * into c from public.tourneo_pronostics_config where tournoi_id=p_id;
 if not found or(not c.actif and t.user_id is distinct from auth.uid())then return jsonb_build_object('actif',false,'proprietaire',t.user_id=auth.uid(),'demarre',coalesce(t.donnees->>'cree','false')='true','nom',t.nom);end if;
 compatible:=(select array_agg(e->>'id'order by e->>'id')from jsonb_array_elements(c.equipes)e)is not distinct from(select array_agg(e->>'id'order by e->>'id')from jsonb_array_elements(tourneo_private.pronostics_equipes(t.id,t.donnees))e);
 publie:=compatible and c.classement_revision=t.revision and c.classement is not null and coalesce(t.donnees->>'termine','false')='true';
 resultat:=jsonb_build_object('invites_autorises',true,'actif',c.actif,'proprietaire',t.user_id=auth.uid(),'nom',t.nom,'mode',c.mode,'equipes',c.equipes,'cloture_at',c.cloture_at,'ferme',c.ferme_at is not null or coalesce(c.cloture_at<=now(),false)or coalesce(t.donnees->>'cree','false')='true','demarre',coalesce(t.donnees->>'cree','false')='true','compatible',compatible,'publie',coalesce(publie,false),'nombre',((select count(*)from public.tourneo_pronostics_votes where tournoi_id=t.id)+(select count(*)from tourneo_private.pronostics_invites where tournoi_id=t.id)),'mon_choix',(select to_jsonb(choix)from public.tourneo_pronostics_votes where tournoi_id=t.id and user_id=auth.uid()),'classement','[]'::jsonb);
 if publie then
  with rangs as(select * from tourneo_private.pronostics_scores(t.id))
  select resultat||jsonb_build_object('classement',coalesce((select jsonb_agg(jsonb_build_object('pseudo',pseudo,'points',points,'rang',rang)order by rang,pseudo)from(select * from rangs order by rang,pseudo limit 100)l),'[]'),'mon_rang',(select jsonb_build_object('rang',rang,'points',points)from rangs where cle='compte:'||auth.uid()::text))into resultat;
 end if;return resultat;
end$$;

create or replace function tourneo_private.pronostics_voter(p_id uuid,p_choix text[])returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.tournois;c public.tourneo_pronostics_config;n integer;alias text;begin
 if auth.uid()is null or not exists(select 1 from auth.users where id=auth.uid()and email_confirmed_at is not null)then raise exception 'Connectez-vous avec un compte confirmé pour participer';end if;
 select * into t from public.tournois where id=p_id for update;
 select * into c from public.tourneo_pronostics_config where tournoi_id=p_id for update;
 if t.est_public is not true or c.tournoi_id is null or not c.actif or c.ferme_at is not null or c.cloture_at<=now()or coalesce(t.donnees->>'cree','false')='true'then raise exception 'Les pronostics sont fermés';end if;
 if (select array_agg(e->>'id'order by e->>'id')from jsonb_array_elements(c.equipes)e)is distinct from(select array_agg(e->>'id'order by e->>'id')from jsonb_array_elements(tourneo_private.pronostics_equipes(t.id,t.donnees))e)then raise exception 'Les participants ont changé. Le jeu doit être vérifié par l’organisateur';end if;
 n:=case when c.mode like 'podium%'then 3 when c.mode like 'top5%'then 5 else 1 end;
 if p_choix is null or cardinality(p_choix)<>n or(select count(distinct x)from unnest(p_choix)x)<>n or exists(select 1 from unnest(p_choix)x where not exists(select 1 from jsonb_array_elements(c.equipes)e where e->>'id'=x))then raise exception 'Choisissez des participants différents dans la liste';end if;
 if not exists(select 1 from public.tourneo_pronostics_votes where tournoi_id=p_id and user_id=auth.uid())and((select count(*)from public.tourneo_pronostics_votes where tournoi_id=p_id)+(select count(*)from tourneo_private.pronostics_invites where tournoi_id=p_id))>=10000 then raise exception 'La capacité du jeu est atteinte';end if;
 select left(coalesce(nullif(trim(display_name),''),'Spectateur'),80)into alias from public.profiles where id=auth.uid();
 insert into public.tourneo_pronostics_votes(tournoi_id,user_id,pseudo,choix)values(p_id,auth.uid(),coalesce(alias,'Spectateur'),p_choix)on conflict(tournoi_id,user_id)do update set choix=excluded.choix,pseudo=excluded.pseudo,updated_at=now();
 return tourneo_private.pronostics_lecture(p_id);
end$$;

create or replace function tourneo_private.pronostics_invite_voter(p_id uuid,p_jeton uuid,p_nom text,p_choix text[])returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.tournois;c public.tourneo_pronostics_config;v tourneo_private.pronostics_invites;n integer;nom text:=btrim(p_nom);begin
 if p_jeton is null then raise exception 'Actualisez cette page pour préparer votre participation';end if;
 if nom is null or char_length(nom)not between 1 and 80 or nom~'[[:cntrl:]]'then raise exception 'Indiquez votre nom ou pseudo (80 caractères maximum)';end if;
 select * into t from public.tournois where id=p_id for update;
 select * into c from public.tourneo_pronostics_config where tournoi_id=p_id for update;
 if t.est_public is not true or c.tournoi_id is null or not c.actif or c.ferme_at is not null or c.cloture_at<=now()or coalesce(t.donnees->>'cree','false')='true'then raise exception 'Les pronostics sont fermés';end if;
 if(select array_agg(e->>'id'order by e->>'id')from jsonb_array_elements(c.equipes)e)is distinct from(select array_agg(e->>'id'order by e->>'id')from jsonb_array_elements(tourneo_private.pronostics_equipes(t.id,t.donnees))e)then raise exception 'Les participants ont changé. Le jeu doit être vérifié par l’organisateur';end if;
 n:=case when c.mode like 'podium%'then 3 when c.mode like 'top5%'then 5 else 1 end;
 if p_choix is null or cardinality(p_choix)<>n or(select count(distinct x)from unnest(p_choix)x)<>n or exists(select 1 from unnest(p_choix)x where not exists(select 1 from jsonb_array_elements(c.equipes)e where e->>'id'=x))then raise exception 'Choisissez des participants différents dans la liste';end if;
 select * into v from tourneo_private.pronostics_invites where tournoi_id=p_id and jeton=p_jeton;
 if v.id is not null then
  update tourneo_private.pronostics_invites set pseudo=nom,choix=p_choix,updated_at=now()where id=v.id;
 elsif auth.uid()is not null and exists(select 1 from public.tourneo_pronostics_votes where tournoi_id=p_id and user_id=auth.uid())then
  update public.tourneo_pronostics_votes set pseudo=nom,choix=p_choix,updated_at=now()where tournoi_id=p_id and user_id=auth.uid();
 else
  if(select count(*)from public.tourneo_pronostics_votes where tournoi_id=p_id)+(select count(*)from tourneo_private.pronostics_invites where tournoi_id=p_id)>=10000 then raise exception 'La capacité du jeu est atteinte';end if;
  insert into tourneo_private.pronostics_invites(tournoi_id,jeton,pseudo,choix)values(p_id,p_jeton,nom,p_choix);
 end if;
 return tourneo_private.pronostics_invite_lecture(p_id,p_jeton);
end$$;

create or replace function tourneo_private.pronostics_invite_retirer(p_id uuid,p_jeton uuid)returns jsonb language plpgsql security definer set search_path='' as $$begin
 perform 1 from public.tournois where id=p_id and est_public is true for update;
 if not found then return jsonb_build_object('actif',false);end if;
 delete from tourneo_private.pronostics_invites where tournoi_id=p_id and jeton=p_jeton;
 if auth.uid()is not null then delete from public.tourneo_pronostics_votes where tournoi_id=p_id and user_id=auth.uid();end if;
 return tourneo_private.pronostics_invite_lecture(p_id,p_jeton);
end$$;
RESET ROLE;
COMMIT;
