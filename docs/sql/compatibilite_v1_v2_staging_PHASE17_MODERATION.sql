-- TOURNEO V2 PHASE 17 - SIGNALEMENTS ET MODERATION DES DISCUSSIONS.
-- UNIQUEMENT SUR UNE COPIE V1 RESTAUREE, EN STAGING ISOLE.
-- Ce script NE DOIT PAS etre execute sur la V1 de production ni le test V2 actif.
-- Requiert phases 1-16 et un marqueur de restauration confiée manuellement :
-- select set_config('tourneo.v1_copy_verified','true',false);
-- Aucun compte superadministrateur n'est créé automatiquement.
-- Une validation manuelle du responsable de modération sera exigée avant la
-- bascule de production (ne jamais choisir un utilisateur par hasard).
begin;
do $$
begin
 if current_setting('tourneo.v1_copy_verified',true) is distinct from 'true'
 then raise exception 'STAGING STOP: copie V1 restauree non confirmee'; end if;
 if to_regclass('public.tournois') is null
 or to_regclass('public.tourneo_discussions') is null
 or to_regclass('public.tourneo_inscriptions') is null
 or to_regclass('public.tourneo_album_config') is null
 or to_regprocedure('tourneo_private.discussion_role(uuid)') is null
 or to_regprocedure('public.tourneo_discussion_envoyer(uuid,uuid,text,text)') is null
 or to_regprocedure('tourneo_private.equipes_inscrites_marqueur()') is null
 then raise exception 'STAGING STOP: phases 1 a 16 manquantes'; end if;
 if (select count(*) from auth.users)=0
 or (select count(*) from public.tournois)=0
 or exists(select 1 from public.tournois where partage_id is null)
 or not exists(select 1 from pg_trigger where tgrelid='auth.users'::regclass
    and tgname='on_auth_user_created_tourneo' and not tgisinternal)
 then raise exception 'STAGING STOP: comptes et anciens liens V1 incomplets'; end if;
 if to_regclass('tourneo_private.administrateurs') is not null
 or to_regclass('tourneo_private.journal_admin') is not null
 or to_regclass('tourneo_private.signalements_discussions') is not null
 or to_regclass('tourneo_private.sanctions_discussions') is not null
 or to_regprocedure('tourneo_private.role_admin()') is not null
 or to_regprocedure('public.tourneo_moderation_compteur()') is not null
 then raise exception 'STAGING STOP: phase 17 presente ou schema partiel'; end if;
end $$;

-- Socle minimal privé de superadministration, sans attribution initiale.
create table tourneo_private.administrateurs(
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in('admin','superadmin')),
 created_at timestamptz not null default now()
);
create table tourneo_private.journal_admin(
 id uuid primary key default gen_random_uuid(),
 acteur_id uuid references auth.users(id) on delete set null,
 cible_id uuid references auth.users(id) on delete set null,
 action text not null,
 motif text not null check(char_length(trim(motif)) between 3 and 300),
 avant jsonb,apres jsonb,
 created_at timestamptz not null default now()
);
alter table tourneo_private.administrateurs enable row level security;
alter table tourneo_private.journal_admin enable row level security;
revoke all on tourneo_private.administrateurs,tourneo_private.journal_admin from public,anon,authenticated;
create function tourneo_private.role_admin()
returns text language sql stable security definer set search_path='' as $$
 select role from tourneo_private.administrateurs where user_id=(select auth.uid())
$$;
revoke all on function tourneo_private.role_admin() from public,anon;
grant execute on function tourneo_private.role_admin() to authenticated;

-- Fonctions de signalement, sanction et masquage de la V2.
-- Reports are private evidence. Moderators only see the context of a reported message.
create table tourneo_private.signalements_discussions (
 id uuid primary key,
 message_id uuid not null,
 tournoi_id uuid references public.tournois(id) on delete set null,
 tournoi_nom text not null,
 signale_par uuid references auth.users(id) on delete set null,
 auteur_id uuid references auth.users(id) on delete set null,
 raison text not null check(raison in ('haine','harcelement','menace','donnees_privees','autre')),
 precision text not null check(char_length(precision)<=1000),
 contexte jsonb not null,
 statut text not null default 'nouveau' check(statut in ('nouveau','examine','traite','classe')),
 decision text,
 motif_decision text,
 traite_par uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(signale_par,message_id)
);
create index on tourneo_private.signalements_discussions(statut,created_at desc);
create index on tourneo_private.signalements_discussions(signale_par,created_at desc);
create table tourneo_private.sanctions_discussions (
 user_id uuid primary key references auth.users(id) on delete cascade,
 actif boolean not null default true,
 jusquau timestamptz,
 motif text not null,
 updated_at timestamptz not null default now()
);
alter table tourneo_private.signalements_discussions enable row level security;
alter table tourneo_private.sanctions_discussions enable row level security;
revoke all on tourneo_private.signalements_discussions,tourneo_private.sanctions_discussions from public,anon,authenticated;
alter table public.tourneo_discussions add column masque boolean not null default false;
drop policy discussions_lecture on public.tourneo_discussions;
create policy discussions_lecture on public.tourneo_discussions for select to authenticated
 using(not masque and tourneo_private.discussion_visible(tournoi_id,auteur_id,audience));

create function tourneo_private.moderation_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(tourneo_private.role_admin()='superadmin' and exists(
  select 1 from auth.users where id=(select auth.uid()) and deleted_at is null and (banned_until is null or banned_until<now())
 ),false)
$$;

create function tourneo_private.discussion_signaler(p_id uuid,p_message uuid,p_raison text,p_precision text) returns uuid
language plpgsql security definer set search_path='' as $$
declare m public.tourneo_discussions; ancien tourneo_private.signalements_discussions; contexte jsonb;
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 if p_id is null or p_raison is null or p_raison not in ('haine','harcelement','menace','donnees_privees','autre') or p_precision is null or char_length(trim(p_precision))>1000 then raise exception 'Signalement invalide';end if;
 perform pg_advisory_xact_lock(hashtext('signalement:'||auth.uid()::text));
 select * into ancien from tourneo_private.signalements_discussions where id=p_id;
 if found then
  if ancien.signale_par=auth.uid() and ancien.message_id=p_message and ancien.raison=p_raison and ancien.precision=trim(p_precision) then return ancien.id;end if;
  raise exception 'Identifiant de signalement déjà utilisé';
 end if;
 select * into m from public.tourneo_discussions where id=p_message and not masque;
 if not found or not tourneo_private.discussion_visible(m.tournoi_id,m.auteur_id,m.audience) then raise exception 'Message inaccessible';end if;
 select * into ancien from tourneo_private.signalements_discussions where signale_par=auth.uid() and message_id=p_message;
 if found then return ancien.id;end if;
 if (select count(*) from tourneo_private.signalements_discussions where signale_par=auth.uid() and created_at>now()-interval '1 hour')>=10 then raise exception 'Trop de signalements. Réessayez plus tard.';end if;
 select jsonb_agg(to_jsonb(c) order by c.created_at,c.id) into contexte from (
  select id,auteur_id,auteur_nom,audience,contenu,created_at from (
   (select id,auteur_id,auteur_nom,audience,contenu,created_at from public.tourneo_discussions d where d.tournoi_id=m.tournoi_id and not d.masque and (d.created_at,d.id)<=(m.created_at,m.id) and (d.audience=m.audience or d.audience='tous') and tourneo_private.discussion_visible(d.tournoi_id,d.auteur_id,d.audience) order by created_at desc,id desc limit 6)
   union all
   (select id,auteur_id,auteur_nom,audience,contenu,created_at from public.tourneo_discussions d where d.tournoi_id=m.tournoi_id and not d.masque and (d.created_at,d.id)>(m.created_at,m.id) and (d.audience=m.audience or d.audience='tous') and tourneo_private.discussion_visible(d.tournoi_id,d.auteur_id,d.audience) order by created_at,id limit 5)
  ) q
 ) c;
 insert into tourneo_private.signalements_discussions(id,message_id,tournoi_id,tournoi_nom,signale_par,auteur_id,raison,precision,contexte)
 values(p_id,m.id,m.tournoi_id,(select nom from public.tournois where id=m.tournoi_id),auth.uid(),m.auteur_id,p_raison,trim(p_precision),contexte);
 return p_id;
end $$;

create function tourneo_private.moderation_compteur() returns bigint
language plpgsql stable security definer set search_path='' as $$begin
 if not tourneo_private.moderation_admin() then return null;end if;
 return (select count(*) from tourneo_private.signalements_discussions where statut in ('nouveau','examine'));
end $$;
create function tourneo_private.moderation_liste(p_statut text,p_page integer) returns jsonb
language plpgsql stable security definer set search_path='' as $$declare resultat jsonb;begin
 if not tourneo_private.moderation_admin() then raise exception 'Accès super administrateur requis';end if;
 if p_statut is null or p_statut not in ('ouverts','tous','traite','classe') or p_page is null or p_page<0 or p_page>10000 then raise exception 'Filtre invalide';end if;
 select coalesce(jsonb_agg(to_jsonb(q)),'[]') into resultat from (
  select s.*,coalesce(x.actif and (x.jusquau is null or x.jusquau>now()),false) as suspension_active,x.jusquau
  from tourneo_private.signalements_discussions s left join tourneo_private.sanctions_discussions x on x.user_id=s.auteur_id
  where p_statut='tous' or (p_statut='ouverts' and s.statut in ('nouveau','examine')) or s.statut=p_statut
  order by s.created_at desc,s.id limit 25 offset p_page*25
 ) q;return resultat;
end $$;
create function tourneo_private.moderation_decider(p_id uuid,p_action text,p_motif text) returns void
language plpgsql security definer set search_path='' as $$
declare s tourneo_private.signalements_discussions; duree timestamptz; statut_final text;
begin
 if not tourneo_private.moderation_admin() then raise exception 'Accès super administrateur requis';end if;
 if p_action is null or p_action not in ('examiner','masquer','suspendre_24h','suspendre_7j','bannir','retablir','classer','traiter') or p_motif is null or char_length(trim(p_motif)) not between 3 and 300 then raise exception 'Décision et motif obligatoires';end if;
 select * into s from tourneo_private.signalements_discussions where id=p_id for update;
 if not found then raise exception 'Signalement introuvable';end if;
 -- Replaying the same action after a lost response must not extend a suspension.
 if s.decision=p_action and s.motif_decision=trim(p_motif) then return;end if;
 if p_action in ('suspendre_24h','suspendre_7j','bannir','retablir') then
  if s.auteur_id is null or s.auteur_id=auth.uid() or exists(select 1 from tourneo_private.administrateurs where user_id=s.auteur_id) then raise exception 'Ce compte ne peut pas être suspendu depuis un signalement';end if;
  perform pg_advisory_xact_lock(hashtext(s.auteur_id::text));
  duree:=case p_action when 'suspendre_24h' then now()+interval '24 hours' when 'suspendre_7j' then now()+interval '7 days' else null end;
  insert into tourneo_private.sanctions_discussions(user_id,actif,jusquau,motif) values(s.auteur_id,p_action<>'retablir',duree,trim(p_motif))
  on conflict(user_id) do update set actif=excluded.actif,jusquau=excluded.jusquau,motif=excluded.motif,updated_at=now();
 end if;
 if p_action='masquer' then update public.tourneo_discussions set masque=true where id=s.message_id;end if;
 statut_final:=case p_action when 'examiner' then 'examine' when 'classer' then 'classe' else 'traite' end;
 update tourneo_private.signalements_discussions set statut=statut_final,decision=p_action,motif_decision=trim(p_motif),traite_par=auth.uid(),updated_at=now() where id=p_id;
 insert into tourneo_private.journal_admin(acteur_id,cible_id,action,motif,avant,apres)
 values(auth.uid(),s.auteur_id,'moderation_'||p_action,trim(p_motif),jsonb_build_object('signalement',s.id,'statut',s.statut),jsonb_build_object('statut',statut_final));
end $$;

create function public.tourneo_discussion_signaler(p_id uuid,p_message uuid,p_raison text,p_precision text) returns uuid
language sql security invoker set search_path='' as $$select tourneo_private.discussion_signaler(p_id,p_message,p_raison,p_precision)$$;
create function public.tourneo_moderation_compteur() returns bigint
language sql stable security invoker set search_path='' as $$select tourneo_private.moderation_compteur()$$;
create function public.tourneo_moderation_liste(p_statut text default 'ouverts',p_page integer default 0) returns jsonb
language sql stable security invoker set search_path='' as $$select tourneo_private.moderation_liste(p_statut,p_page)$$;
create function public.tourneo_moderation_decider(p_id uuid,p_action text,p_motif text) returns void
language sql security invoker set search_path='' as $$select tourneo_private.moderation_decider(p_id,p_action,p_motif)$$;
revoke all on function tourneo_private.moderation_admin(),tourneo_private.discussion_signaler(uuid,uuid,text,text),tourneo_private.moderation_compteur(),tourneo_private.moderation_liste(text,integer),tourneo_private.moderation_decider(uuid,text,text),public.tourneo_discussion_signaler(uuid,uuid,text,text),public.tourneo_moderation_compteur(),public.tourneo_moderation_liste(text,integer),public.tourneo_moderation_decider(uuid,text,text) from public,anon;
grant execute on function tourneo_private.moderation_admin(),tourneo_private.discussion_signaler(uuid,uuid,text,text),tourneo_private.moderation_compteur(),tourneo_private.moderation_liste(text,integer),tourneo_private.moderation_decider(uuid,text,text),public.tourneo_discussion_signaler(uuid,uuid,text,text),public.tourneo_moderation_compteur(),public.tourneo_moderation_liste(text,integer),public.tourneo_moderation_decider(uuid,text,text) to authenticated;

create or replace function tourneo_private.discussion_envoyer(p_id uuid,p_tournoi uuid,p_audience text,p_contenu text) returns uuid
language plpgsql security definer set search_path='' as $$
declare role_tournoi text; ancien public.tourneo_discussions; nom text;
begin
 role_tournoi:=tourneo_private.discussion_role(p_tournoi);
 if role_tournoi is null then raise exception 'Accès réservé aux membres du tournoi'; end if;
 if p_audience is null or p_audience not in ('tous','joueurs','arbitres','organisateur') or (role_tournoi<>'organisateur' and p_audience not in ('tous','organisateur',role_tournoi)) then raise exception 'Destinataires non autorisés'; end if;
 if p_id is null or p_contenu is null or char_length(trim(p_contenu)) not between 1 and 2000 then raise exception 'Message invalide (1 à 2 000 caractères)'; end if;
 perform pg_advisory_xact_lock(hashtext((select auth.uid())::text));
 if exists(select 1 from tourneo_private.sanctions_discussions where user_id=auth.uid() and actif and (jusquau is null or jusquau>now())) then raise exception 'Messagerie suspendue. Contactez Tourneo.';end if;
 select * into ancien from public.tourneo_discussions where id=p_id;
 if found then
  if ancien.auteur_id=(select auth.uid()) and ancien.tournoi_id=p_tournoi and ancien.audience=p_audience and ancien.contenu=trim(p_contenu) then return ancien.id;end if;
  raise exception 'Identifiant de message déjà utilisé';
 end if;
 if (select count(*) from public.tourneo_discussions where auteur_id=(select auth.uid()) and created_at>now()-interval '1 minute')>=10 then raise exception 'Trop de messages. Patientez une minute.'; end if;
 select display_name into nom from public.profiles where id=(select auth.uid());
 insert into public.tourneo_discussions(id,tournoi_id,auteur_id,auteur_nom,audience,contenu)
 values(p_id,p_tournoi,(select auth.uid()),coalesce(nullif(trim(nom),''),'Joueur'),p_audience,trim(p_contenu));
 return p_id;
end $$;

-- Le statut de superadministrateur ne peut pas être déduit des métadonnées
-- saisies par un compte et ne vient pas d'une inscription de joueur.
do $$
begin
 if not exists(select 1 from pg_class
   where oid='tourneo_private.administrateurs'::regclass and relrowsecurity)
 or not exists(select 1 from pg_class
   where oid='tourneo_private.journal_admin'::regclass and relrowsecurity)
 or not exists(select 1 from pg_class
   where oid='tourneo_private.signalements_discussions'::regclass and relrowsecurity)
 or not exists(select 1 from pg_class
   where oid='tourneo_private.sanctions_discussions'::regclass and relrowsecurity)
 or (select count(*) from tourneo_private.administrateurs)>0
 or has_table_privilege('anon','tourneo_private.administrateurs','SELECT')
 or has_table_privilege('authenticated','tourneo_private.administrateurs','INSERT')
 or has_table_privilege('authenticated','tourneo_private.signalements_discussions','SELECT')
 or has_schema_privilege('anon','tourneo_private','USAGE')
 or has_function_privilege('anon','public.tourneo_discussion_signaler(uuid,uuid,text,text)','EXECUTE')
 or has_function_privilege('anon','public.tourneo_moderation_liste(text,integer)','EXECUTE')
 or has_function_privilege('anon','public.tourneo_moderation_decider(uuid,text,text)','EXECUTE')
 then raise exception 'STAGING STOP: droits de moderation non conformes'; end if;
end $$;
commit;
