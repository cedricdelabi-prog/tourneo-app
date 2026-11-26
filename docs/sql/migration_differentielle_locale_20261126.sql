-- Reconstitution des quatre blocs locaux confirmes le 26/11/2026.
-- STAGING LOCAL UNIQUEMENT. Ne pas executer sur production ni sur la copie deja migree.
-- Ce fichier consolide des extraits testes separement; execution unifiee non encore testee.
-- Source immutable: 5f485b353a8fc7fc8d453e45a0a6f141fc44b0be. Les taches automatiques restent inactives.
BEGIN;
DO $$
BEGIN
 IF current_database() <> 'tourneo_v2_essai' THEN
  RAISE EXCEPTION 'STAGING LOCAL UNIQUEMENT';
 END IF;
 IF to_regclass('public.tourneo_push_abonnements') IS NOT NULL
 OR to_regclass('public.tourneo_jobs_photos') IS NOT NULL
 OR to_regclass('tourneo_private.pronostics_invites') IS NOT NULL
 OR to_regclass('public.tourneo_compte_usage') IS NULL THEN
  RAISE EXCEPTION 'Copie deja migree ou source inattendue';
 END IF;
END $$;
SET LOCAL ROLE postgres;

alter table public.tourneo_preferences add column notifications_push boolean not null default false,add column notifications_email boolean not null default false;
create table public.tourneo_push_abonnements(
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 endpoint text not null unique check(char_length(endpoint)<=2048 and endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-zA-Z0-9-]+\.notify\.windows\.com)/'),
 p256dh text not null check(p256dh ~ '^[A-Za-z0-9_-]{87}=?$'),auth text not null check(auth ~ '^[A-Za-z0-9_-]{22}={0,2}$'),created_at timestamptz not null default now());
create index push_owner on public.tourneo_push_abonnements(user_id);
alter table public.tourneo_push_abonnements enable row level security;
revoke all on public.tourneo_push_abonnements from anon,authenticated;
grant select,insert,delete on public.tourneo_push_abonnements to authenticated;
create policy push_owner on public.tourneo_push_abonnements for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create function tourneo_private.quota_push() returns trigger language plpgsql security invoker set search_path='' as $$begin
 perform pg_advisory_xact_lock(hashtext(new.user_id::text));
 if (select count(*) from public.tourneo_push_abonnements where user_id=new.user_id)>=10 then raise exception 'Dix appareils maximum par compte';end if;return new;end $$;
create trigger quota_push before insert on public.tourneo_push_abonnements for each row execute function tourneo_private.quota_push();
create table public.tourneo_envois(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 source text not null check(source in('appel','notification')),source_id uuid not null,canal text not null check(canal in('push','email')),
 statut text not null default 'attente' check(statut in('attente','traitement','transmis','annule','echec')),tentatives integer not null default 0,
 reessayer_at timestamptz not null default now(),bail uuid,bail_fin timestamptz,created_at timestamptz not null default now(),unique(source,source_id,canal));
create index envois_owner on public.tourneo_envois(user_id);
create index envois_attente on public.tourneo_envois(reessayer_at) where statut in('attente','traitement');
alter table public.tourneo_envois enable row level security;
revoke all on public.tourneo_envois from anon,authenticated;
grant select on public.tourneo_envois to authenticated;
create policy envois_owner on public.tourneo_envois for select to authenticated using(user_id=(select auth.uid()));
create table tourneo_private.notifications_config(singleton boolean primary key default true check(singleton),jeton text not null,cle_publique text not null,cle_privee text not null,email_disponible boolean not null default false);
alter table tourneo_private.notifications_config enable row level security;
revoke all on tourneo_private.notifications_config from public,anon,authenticated;
create function tourneo_private.preparer_envoi() returns trigger language plpgsql security definer set search_path='' as $$declare p public.tourneo_preferences;s text;begin
 select * into p from public.tourneo_preferences where user_id=new.user_id;if not coalesce(p.notifications_sportives,true)then return new;end if;
 s:=case when TG_TABLE_NAME='tourneo_appels' then 'appel' else 'notification' end;
 if p.notifications_push and exists(select 1 from public.tourneo_push_abonnements where user_id=new.user_id)then insert into public.tourneo_envois(user_id,source,source_id,canal)values(new.user_id,s,new.id,'push')on conflict do nothing;end if;
 if p.notifications_email then insert into public.tourneo_envois(user_id,source,source_id,canal)values(new.user_id,s,new.id,'email')on conflict do nothing;end if;return new;end $$;
revoke all on function tourneo_private.preparer_envoi() from public,anon,authenticated;
create trigger appel_envoi after insert on public.tourneo_appels for each row execute function tourneo_private.preparer_envoi();
create trigger notification_envoi after insert on public.tourneo_notifications for each row execute function tourneo_private.preparer_envoi();
create function tourneo_private.config_alertes() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid()is null then raise exception 'Connexion requise';end if;
 return coalesce((select jsonb_build_object('push',true,'cle',cle_publique,'email',email_disponible)from tourneo_private.notifications_config),'{}'::jsonb);end $$;
create function public.tourneo_config_alertes() returns jsonb language sql stable security invoker set search_path='' as $$select tourneo_private.config_alertes()$$;
revoke all on function public.tourneo_config_alertes(),tourneo_private.config_alertes() from public,anon;
grant execute on function public.tourneo_config_alertes(),tourneo_private.config_alertes() to authenticated;
create function tourneo_private.worker_initialiser(p_publique text,p_privee text,p_email boolean) returns jsonb language plpgsql security definer set search_path='' as $$declare c tourneo_private.notifications_config;begin
 if char_length(p_publique)<>87 or char_length(p_privee)<>43 then raise exception 'Clés invalides';end if;
 insert into tourneo_private.notifications_config values(true,gen_random_uuid()::text||gen_random_uuid()::text,p_publique,p_privee,p_email)on conflict(singleton)do update set email_disponible=excluded.email_disponible;
 select * into c from tourneo_private.notifications_config;return jsonb_build_object('jeton',c.jeton,'publique',c.cle_publique,'privee',c.cle_privee);end $$;
create function public.tourneo_worker_initialiser(p_publique text,p_privee text,p_email boolean default false)returns jsonb language sql security invoker set search_path='' as $$select tourneo_private.worker_initialiser(p_publique,p_privee,p_email)$$;
create function tourneo_private.worker_prendre(p_email boolean default false)returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.tourneo_envois;p public.tourneo_preferences;contenu text;lu boolean;lien text;adresse text;sortie jsonb:='[]';abonnements jsonb;ident uuid;begin
 delete from public.tourneo_envois where created_at<now()-interval '30 days';
 for j in select * from public.tourneo_envois where statut in('attente','traitement')and reessayer_at<=now()and(bail_fin is null or bail_fin<now())and(canal='push'or p_email)order by created_at limit 5 for update skip locked loop
  select * into p from public.tourneo_preferences where user_id=j.user_id;contenu:=null;lu:=null;lien:='/activite';adresse:=null;
  if j.source='appel'then select a.message,a.lu,'/partage/'||a.tournoi_id::text||'#match-'||a.match_id::text into contenu,lu,lien from public.tourneo_appels a where a.id=j.source_id;else select n.message,n.lu into contenu,lu from public.tourneo_notifications n where n.id=j.source_id;end if;
  if contenu is null or lu or not coalesce(p.notifications_sportives,true)or(j.canal='push'and not coalesce(p.notifications_push,false))or(j.canal='email'and not coalesce(p.notifications_email,false))or j.created_at<now()-(case when j.source='appel'then interval '15 minutes'else interval '1 day'end)then update public.tourneo_envois set statut='annule',bail=null,bail_fin=null where id=j.id;continue;end if;
  if j.canal='email'then select email into adresse from auth.users where id=j.user_id and email_confirmed_at is not null;if adresse is null then update public.tourneo_envois set statut='annule'where id=j.id;continue;end if;end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'endpoint',endpoint,'keys',jsonb_build_object('p256dh',p256dh,'auth',auth))),'[]')into abonnements from public.tourneo_push_abonnements where user_id=j.user_id;
  if j.canal='push'and jsonb_array_length(abonnements)=0 then update public.tourneo_envois set statut='annule'where id=j.id;continue;end if;
  ident:=gen_random_uuid();update public.tourneo_envois set statut='traitement',tentatives=tentatives+1,bail=ident,bail_fin=now()+interval '2 minutes'where id=j.id;
  sortie:=sortie||jsonb_build_array(jsonb_build_object('id',j.id,'bail',ident,'canal',j.canal,'lien',lien,'email',adresse,'langue',coalesce(p.langue,'fr'),'abonnements',abonnements));
 end loop;return sortie;end $$;
create function public.tourneo_worker_prendre(p_email boolean default false)returns jsonb language sql security invoker set search_path='' as $$select tourneo_private.worker_prendre(p_email)$$;
create function tourneo_private.worker_finir(p_id uuid,p_bail uuid,p_ok boolean,p_expires uuid[] default '{}')returns void language plpgsql security definer set search_path='' as $$declare j public.tourneo_envois;begin
 select * into j from public.tourneo_envois where id=p_id and bail=p_bail and statut='traitement'for update;if not found then return;end if;
 delete from public.tourneo_push_abonnements where user_id=j.user_id and id=any(p_expires);
 update public.tourneo_envois set statut=case when p_ok then 'transmis'when tentatives>=5 then 'echec'else 'attente'end,reessayer_at=now()+interval '1 minute'*power(2,least(tentatives,5)),bail=null,bail_fin=null where id=p_id;end $$;
create function public.tourneo_worker_finir(p_id uuid,p_bail uuid,p_ok boolean,p_expires uuid[] default '{}')returns void language sql security invoker set search_path='' as $$select tourneo_private.worker_finir(p_id,p_bail,p_ok,p_expires)$$;
revoke all on function public.tourneo_worker_initialiser(text,text,boolean),public.tourneo_worker_prendre(boolean),public.tourneo_worker_finir(uuid,uuid,boolean,uuid[]),tourneo_private.worker_initialiser(text,text,boolean),tourneo_private.worker_prendre(boolean),tourneo_private.worker_finir(uuid,uuid,boolean,uuid[])from public,anon,authenticated;
grant usage on schema tourneo_private to service_role;
grant execute on function public.tourneo_worker_initialiser(text,text,boolean),public.tourneo_worker_prendre(boolean),public.tourneo_worker_finir(uuid,uuid,boolean,uuid[]),tourneo_private.worker_initialiser(text,text,boolean),tourneo_private.worker_prendre(boolean),tourneo_private.worker_finir(uuid,uuid,boolean,uuid[])to service_role;
create or replace function tourneo_private.appel_match(p_tournoi uuid,p_match integer,p_envoyer boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.tournois; m jsonb; e jsonb; j text; cote text; ids text[]:='{}';
 destinataire uuid; appel public.tourneo_appels; etat text; permis boolean; termine boolean;
 resultat jsonb:='[]'::jsonb; deja boolean; total integer;
begin
 if auth.uid() is null then raise exception 'Accès organisateur requis';end if;
 if p_envoyer then select * into t from public.tournois where id=p_tournoi for update;
 else select * into t from public.tournois where id=p_tournoi;end if;
 if t.id is null or t.user_id is distinct from auth.uid() then raise exception 'Accès organisateur requis';end if;
 select x into m from jsonb_array_elements(coalesce(t.donnees->'matchs','[]'::jsonb)) x where x->>'id'=p_match::text limit 1;
 if p_match is null or p_match<1 or m is null then raise exception 'Rencontre introuvable';end if;
 termine:=coalesce(t.donnees->'matchsValides','[]'::jsonb) @> jsonb_build_array(p_match)
   or (coalesce(m->>'score1','') ~ '^[0-9]+$' and coalesce(m->>'score2','') ~ '^[0-9]+$');
 foreach cote in array array['1','2'] loop
   if jsonb_typeof(m->('joueurs'||cote||'Ids'))='array' and jsonb_array_length(m->('joueurs'||cote||'Ids'))>0 then
     ids:=ids||array(select jsonb_array_elements_text(m->('joueurs'||cote||'Ids')));
   elsif left(m->>('equipe'||cote||'Id'),4)='duo:' then
     ids:=ids||string_to_array(substr(m->>('equipe'||cote||'Id'),5),'|');
   else ids:=array_append(ids,m->>('equipe'||cote||'Id'));end if;
 end loop;
 select count(*) into total from public.tourneo_appels where organisateur_id=auth.uid() and created_at>now()-interval '5 minutes';
 for j in select distinct x from unnest(ids) x where x is not null loop
   select x into e from jsonb_array_elements(coalesce(t.donnees->'equipes','[]'::jsonb)) x where x->>'id'=j limit 1;
   select p.id into destinataire from public.profiles p where p.id::text=coalesce(e->>'profilId',e->>'id');
   permis:=coalesce((select notifications_sportives from public.tourneo_preferences where user_id=destinataire),true);
   select * into appel from public.tourneo_appels where tournoi_id=p_tournoi and match_id=p_match and user_id=destinataire;
   if destinataire is null then etat:='sans_profil';
   elsif appel.id is not null then etat:=case when appel.lu then 'lu' else 'depose' end;
   elsif not permis then etat:='desactive';
   elsif termine then etat:='match_termine';
   elsif total>=300 then etat:='temporise';
   else
     etat:='disponible';
     if p_envoyer then
       insert into public.tourneo_appels(tournoi_id,match_id,user_id,organisateur_id,message)
       values(p_tournoi,p_match,destinataire,t.user_id,'L’organisateur vous appelle pour le match '||p_match::text||' du tournoi « '||left(t.nom,120)||' ». Consultez la rencontre pour votre terrain et prévenez l’organisateur de votre présence.')
       on conflict(tournoi_id,match_id,user_id) do nothing;
       select * into appel from public.tourneo_appels where tournoi_id=p_tournoi and match_id=p_match and user_id=destinataire;
       etat:=case when appel.lu then 'lu' else 'depose' end;
       total:=total+1;
     end if;
   end if;
   resultat:=resultat||jsonb_build_array(jsonb_build_object('participant_id',j,'nom',coalesce(e->>'nom','Participant'),'statut',etat,'created_at',appel.created_at,
'canal_push',coalesce((select notifications_sportives and notifications_push from public.tourneo_preferences where user_id=destinataire),false) and exists(select 1 from public.tourneo_push_abonnements where user_id=destinataire),
'canal_email',coalesce((select notifications_sportives and notifications_email from public.tourneo_preferences where user_id=destinataire),false) and coalesce((select email_disponible from tourneo_private.notifications_config),false),
'envoi_push',(select statut from public.tourneo_envois where source='appel' and source_id=appel.id and canal='push'),
'envoi_email',(select statut from public.tourneo_envois where source='appel' and source_id=appel.id and canal='email')));
 end loop;
 return jsonb_build_object('match_id',p_match,'participants',resultat);
end $$;


-- Separate Android registration from browser Web Push; off until Firebase is configured.
alter table public.tourneo_preferences add column notifications_android boolean not null default false;
alter table tourneo_private.notifications_config add column android_projet text;
alter table public.tourneo_envois drop constraint tourneo_envois_canal_check;
alter table public.tourneo_envois add constraint tourneo_envois_canal_check check(canal in('push','email','android'));
create table public.tourneo_android_appareils(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id)on delete cascade,
 installation_id uuid not null,jeton text not null unique check(char_length(jeton)between 20 and 4096 and jeton!~'[[:space:]]'),
 updated_at timestamptz not null default now(),unique(user_id,installation_id));
create index android_owner on public.tourneo_android_appareils(user_id);
alter table public.tourneo_android_appareils enable row level security;
revoke all on public.tourneo_android_appareils from public,anon,authenticated;
grant select on public.tourneo_android_appareils to authenticated;
create policy android_owner on public.tourneo_android_appareils for select to authenticated using(user_id=(select auth.uid()));
create function tourneo_private.android_inscrire(p_installation uuid,p_jeton text,p_compte uuid)returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid()is null then raise exception 'Connexion requise';end if;
 if auth.uid() is distinct from p_compte then raise exception 'Compte modifié';end if;
 if p_installation is null or p_jeton is null then raise exception 'Appareil incomplet';end if;
 if not exists(select 1 from tourneo_private.notifications_config where android_projet is not null)then raise exception 'Service Android indisponible';end if;
 if not coalesce((select notifications_sportives from public.tourneo_preferences where user_id=auth.uid()),true)then raise exception 'Informations sportives désactivées';end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 if not exists(select 1 from public.tourneo_android_appareils where user_id=auth.uid()and installation_id=p_installation)and(select count(*)from public.tourneo_android_appareils where user_id=auth.uid())>=10 then raise exception 'Dix appareils maximum par compte';end if;
 insert into public.tourneo_android_appareils(user_id,installation_id,jeton)values(auth.uid(),p_installation,p_jeton)on conflict(user_id,installation_id)do update set jeton=excluded.jeton,updated_at=now();
 insert into public.tourneo_preferences(user_id,notifications_android)values(auth.uid(),true)on conflict(user_id)do update set notifications_android=true;
end$$;
create function public.tourneo_android_inscrire(p_installation uuid,p_jeton text,p_compte uuid)returns void language sql security invoker set search_path='' as $$select tourneo_private.android_inscrire(p_installation,p_jeton,p_compte)$$;
create function tourneo_private.android_retirer(p_installation uuid)returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid()is null then raise exception 'Connexion requise';end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 delete from public.tourneo_android_appareils where user_id=auth.uid()and installation_id=p_installation;
 if not exists(select 1 from public.tourneo_android_appareils where user_id=auth.uid())then update public.tourneo_preferences set notifications_android=false where user_id=auth.uid();end if;
end$$;
create function public.tourneo_android_retirer(p_installation uuid)returns void language sql security invoker set search_path='' as $$select tourneo_private.android_retirer(p_installation)$$;
revoke all on function public.tourneo_android_inscrire(uuid,text,uuid),public.tourneo_android_retirer(uuid),tourneo_private.android_inscrire(uuid,text,uuid),tourneo_private.android_retirer(uuid)from public,anon;
grant execute on function public.tourneo_android_inscrire(uuid,text,uuid),public.tourneo_android_retirer(uuid),tourneo_private.android_inscrire(uuid,text,uuid),tourneo_private.android_retirer(uuid)to authenticated;
create function tourneo_private.worker_android(p_projet text)returns void language plpgsql security definer set search_path='' as $$begin
 if p_projet is not null and p_projet!~'^[a-z][a-z0-9-]{4,62}$'then raise exception 'Projet invalide';end if;
 update tourneo_private.notifications_config set android_projet=p_projet;
end$$;
create function public.tourneo_worker_android(p_projet text)returns void language sql security invoker set search_path='' as $$select tourneo_private.worker_android(p_projet)$$;
revoke all on function public.tourneo_worker_android(text),tourneo_private.worker_android(text)from public,anon,authenticated;
grant execute on function public.tourneo_worker_android(text),tourneo_private.worker_android(text)to service_role;

create or replace function tourneo_private.config_alertes() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid()is null then raise exception 'Connexion requise';end if;
 return coalesce((select jsonb_build_object('push',true,'cle',cle_publique,'email',email_disponible,'android',android_projet is not null,'android_projet',android_projet)from tourneo_private.notifications_config),'{}'::jsonb);end $$;

create or replace function tourneo_private.preparer_envoi() returns trigger language plpgsql security definer set search_path='' as $$declare p public.tourneo_preferences;s text;begin
 select * into p from public.tourneo_preferences where user_id=new.user_id;if not coalesce(p.notifications_sportives,true)then return new;end if;
 s:=case when TG_TABLE_NAME='tourneo_appels' then 'appel' else 'notification' end;
 if p.notifications_push and exists(select 1 from public.tourneo_push_abonnements where user_id=new.user_id)then insert into public.tourneo_envois(user_id,source,source_id,canal)values(new.user_id,s,new.id,'push')on conflict do nothing;end if;
 if p.notifications_android and exists(select 1 from public.tourneo_android_appareils where user_id=new.user_id)then insert into public.tourneo_envois(user_id,source,source_id,canal)values(new.user_id,s,new.id,'android')on conflict do nothing;end if;
 if p.notifications_email then insert into public.tourneo_envois(user_id,source,source_id,canal)values(new.user_id,s,new.id,'email')on conflict do nothing;end if;return new;end $$;

drop function public.tourneo_worker_prendre(boolean);
drop function tourneo_private.worker_prendre(boolean);

create or replace function tourneo_private.worker_prendre(p_email boolean default false,p_android boolean default false)returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.tourneo_envois;p public.tourneo_preferences;contenu text;lu boolean;lien text;adresse text;sortie jsonb:='[]';abonnements jsonb;ident uuid;begin
 delete from public.tourneo_envois where created_at<now()-interval '30 days';
 for j in select * from public.tourneo_envois where statut in('attente','traitement')and reessayer_at<=now()and(bail_fin is null or bail_fin<now())and(canal='push'or(canal='email'and p_email)or(canal='android'and p_android))order by created_at limit 5 for update skip locked loop
  select * into p from public.tourneo_preferences where user_id=j.user_id;contenu:=null;lu:=null;lien:='/activite';adresse:=null;
  if j.source='appel'then select a.message,a.lu,'/partage/'||a.tournoi_id::text||'#match-'||a.match_id::text into contenu,lu,lien from public.tourneo_appels a where a.id=j.source_id;else select n.message,n.lu into contenu,lu from public.tourneo_notifications n where n.id=j.source_id;end if;
  if contenu is null or lu or not coalesce(p.notifications_sportives,true)or(j.canal='push'and not coalesce(p.notifications_push,false))or(j.canal='email'and not coalesce(p.notifications_email,false))or(j.canal='android'and not coalesce(p.notifications_android,false))or j.created_at<now()-(case when j.source='appel'then interval '15 minutes'else interval '1 day'end)then update public.tourneo_envois set statut='annule',bail=null,bail_fin=null where id=j.id;continue;end if;
  if j.canal='email'then select email into adresse from auth.users where id=j.user_id and email_confirmed_at is not null;if adresse is null then update public.tourneo_envois set statut='annule'where id=j.id;continue;end if;end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'endpoint',endpoint,'keys',jsonb_build_object('p256dh',p256dh,'auth',auth))),'[]')into abonnements from public.tourneo_push_abonnements where user_id=j.user_id;
  if j.canal='android'then select coalesce(jsonb_agg(jsonb_build_object('id',id,'jeton',jeton)),'[]')into abonnements from public.tourneo_android_appareils where user_id=j.user_id;end if;
  if j.canal in('push','android')and jsonb_array_length(abonnements)=0 then update public.tourneo_envois set statut='annule'where id=j.id;continue;end if;
  ident:=gen_random_uuid();update public.tourneo_envois set statut='traitement',tentatives=tentatives+1,bail=ident,bail_fin=now()+interval '2 minutes'where id=j.id;
  sortie:=sortie||jsonb_build_array(jsonb_build_object('id',j.id,'bail',ident,'canal',j.canal,'lien',lien,'email',adresse,'langue',coalesce(p.langue,'fr'),'abonnements',abonnements));
 end loop;return sortie;end $$;
create function public.tourneo_worker_prendre(p_email boolean default false,p_android boolean default false)returns jsonb language sql security invoker set search_path='' as $$select tourneo_private.worker_prendre(p_email,p_android)$$;
revoke all on function public.tourneo_worker_prendre(boolean,boolean),tourneo_private.worker_prendre(boolean,boolean)from public,anon,authenticated;
grant execute on function public.tourneo_worker_prendre(boolean,boolean),tourneo_private.worker_prendre(boolean,boolean)to service_role;

create or replace function tourneo_private.worker_finir(p_id uuid,p_bail uuid,p_ok boolean,p_expires uuid[] default '{}')returns void language plpgsql security definer set search_path='' as $$declare j public.tourneo_envois;begin
 select * into j from public.tourneo_envois where id=p_id and bail=p_bail and statut='traitement'for update;if not found then return;end if;
 delete from public.tourneo_android_appareils where j.canal='android'and user_id=j.user_id and id=any(p_expires);
 delete from public.tourneo_push_abonnements where j.canal='push'and user_id=j.user_id and id=any(p_expires);
 update public.tourneo_envois set statut=case when p_ok then 'transmis'when tentatives>=5 then 'echec'else 'attente'end,reessayer_at=now()+interval '1 minute'*power(2,least(tentatives,5)),bail=null,bail_fin=null where id=p_id;end $$;

create or replace function tourneo_private.appel_match(p_tournoi uuid,p_match integer,p_envoyer boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.tournois; m jsonb; e jsonb; j text; cote text; ids text[]:='{}';
 destinataire uuid; appel public.tourneo_appels; etat text; permis boolean; termine boolean;
 resultat jsonb:='[]'::jsonb; deja boolean; total integer;
begin
 if auth.uid() is null then raise exception 'Accès organisateur requis';end if;
 if p_envoyer then select * into t from public.tournois where id=p_tournoi for update;
 else select * into t from public.tournois where id=p_tournoi;end if;
 if t.id is null or t.user_id is distinct from auth.uid() then raise exception 'Accès organisateur requis';end if;
 select x into m from jsonb_array_elements(coalesce(t.donnees->'matchs','[]'::jsonb)) x where x->>'id'=p_match::text limit 1;
 if p_match is null or p_match<1 or m is null then raise exception 'Rencontre introuvable';end if;
 termine:=coalesce(t.donnees->'matchsValides','[]'::jsonb) @> jsonb_build_array(p_match)
   or (coalesce(m->>'score1','') ~ '^[0-9]+$' and coalesce(m->>'score2','') ~ '^[0-9]+$');
 foreach cote in array array['1','2'] loop
   if jsonb_typeof(m->('joueurs'||cote||'Ids'))='array' and jsonb_array_length(m->('joueurs'||cote||'Ids'))>0 then
     ids:=ids||array(select jsonb_array_elements_text(m->('joueurs'||cote||'Ids')));
   elsif left(m->>('equipe'||cote||'Id'),4)='duo:' then
     ids:=ids||string_to_array(substr(m->>('equipe'||cote||'Id'),5),'|');
   else ids:=array_append(ids,m->>('equipe'||cote||'Id'));end if;
 end loop;
 select count(*) into total from public.tourneo_appels where organisateur_id=auth.uid() and created_at>now()-interval '5 minutes';
 for j in select distinct x from unnest(ids) x where x is not null loop
   select x into e from jsonb_array_elements(coalesce(t.donnees->'equipes','[]'::jsonb)) x where x->>'id'=j limit 1;
   select p.id into destinataire from public.profiles p where p.id::text=coalesce(e->>'profilId',e->>'id');
   permis:=coalesce((select notifications_sportives from public.tourneo_preferences where user_id=destinataire),true);
   select * into appel from public.tourneo_appels where tournoi_id=p_tournoi and match_id=p_match and user_id=destinataire;
   if destinataire is null then etat:='sans_profil';
   elsif appel.id is not null then etat:=case when appel.lu then 'lu' else 'depose' end;
   elsif not permis then etat:='desactive';
   elsif termine then etat:='match_termine';
   elsif total>=300 then etat:='temporise';
   else
     etat:='disponible';
     if p_envoyer then
       insert into public.tourneo_appels(tournoi_id,match_id,user_id,organisateur_id,message)
       values(p_tournoi,p_match,destinataire,t.user_id,'L’organisateur vous appelle pour le match '||p_match::text||' du tournoi « '||left(t.nom,120)||' ». Consultez la rencontre pour votre terrain et prévenez l’organisateur de votre présence.')
       on conflict(tournoi_id,match_id,user_id) do nothing;
       select * into appel from public.tourneo_appels where tournoi_id=p_tournoi and match_id=p_match and user_id=destinataire;
       etat:=case when appel.lu then 'lu' else 'depose' end;
       total:=total+1;
     end if;
   end if;
   resultat:=resultat||jsonb_build_array(jsonb_build_object('participant_id',j,'nom',coalesce(e->>'nom','Participant'),'statut',etat,'created_at',appel.created_at,
'canal_push',coalesce((select notifications_sportives and notifications_push from public.tourneo_preferences where user_id=destinataire),false) and exists(select 1 from public.tourneo_push_abonnements where user_id=destinataire),
'canal_android',coalesce((select notifications_sportives and notifications_android from public.tourneo_preferences where user_id=destinataire),false)and exists(select 1 from public.tourneo_android_appareils where user_id=destinataire)and exists(select 1 from tourneo_private.notifications_config where android_projet is not null),
   'envoi_android',(select statut from public.tourneo_envois where source='appel'and source_id=appel.id and canal='android'),
   'canal_email',coalesce((select notifications_sportives and notifications_email from public.tourneo_preferences where user_id=destinataire),false) and coalesce((select email_disponible from tourneo_private.notifications_config),false),
'envoi_push',(select statut from public.tourneo_envois where source='appel' and source_id=appel.id and canal='push'),
'envoi_email',(select statut from public.tourneo_envois where source='appel' and source_id=appel.id and canal='email')));
 end loop;
 return jsonb_build_object('match_id',p_match,'participants',resultat);
end $$;

create or replace function tourneo_private.worker_prendre(p_email boolean default false,p_android boolean default false)returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.tourneo_envois;p public.tourneo_preferences;contenu text;lu boolean;lien text;adresse text;sortie jsonb:='[]';abonnements jsonb;ident uuid;genre text;tid uuid;bilan jsonb;begin
 delete from public.tourneo_envois where created_at<now()-interval '30 days';
 for j in select * from public.tourneo_envois where statut in('attente','traitement')and reessayer_at<=now()and(bail_fin is null or bail_fin<now())and(canal='push'or(canal='email'and p_email)or(canal='android'and p_android))order by created_at limit 5 for update skip locked loop
  select * into p from public.tourneo_preferences where user_id=j.user_id;contenu:=null;lu:=null;lien:='/activite';adresse:=null;genre:=null;tid:=null;bilan:=null;
  if j.source='appel'then select a.message,a.lu,'/partage/'||a.tournoi_id::text||'#match-'||a.match_id::text into contenu,lu,lien from public.tourneo_appels a where a.id=j.source_id;else select n.message,n.lu,n.type,n.tournoi_id into contenu,lu,genre,tid from public.tourneo_notifications n where n.id=j.source_id;end if;
  if genre='bilan'then select jsonb_build_object('tournoi_id',b.tournoi_id,'nom',t.nom,'poster_path',b.poster_path,'photos',exists(select 1 from public.tourneo_album_config c where c.tournoi_id=b.tournoi_id and c.partage and(t.photos_expirent_at is null or t.photos_expirent_at>now())))into bilan from public.tourneo_bilans b join public.tournois t on t.id=b.tournoi_id where b.tournoi_id=tid;lien:='/partage/'||tid::text;end if;
  if contenu is null or(lu and(genre is distinct from 'bilan'or j.canal<>'email'))or(genre='bilan'and bilan is null)or not coalesce(p.notifications_sportives,true)or(j.canal='push'and not coalesce(p.notifications_push,false))or(j.canal='email'and not coalesce(p.notifications_email,false))or(j.canal='android'and not coalesce(p.notifications_android,false))or j.created_at<now()-(case when j.source='appel'then interval '15 minutes'else interval '1 day'end)then update public.tourneo_envois set statut='annule',bail=null,bail_fin=null where id=j.id;continue;end if;
  if j.canal='email'then select email into adresse from auth.users where id=j.user_id and email_confirmed_at is not null;if adresse is null then update public.tourneo_envois set statut='annule'where id=j.id;continue;end if;end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'endpoint',endpoint,'keys',jsonb_build_object('p256dh',p256dh,'auth',auth))),'[]')into abonnements from public.tourneo_push_abonnements where user_id=j.user_id;
  if j.canal='android'then select coalesce(jsonb_agg(jsonb_build_object('id',id,'jeton',jeton)),'[]')into abonnements from public.tourneo_android_appareils where user_id=j.user_id;end if;
  if j.canal in('push','android')and jsonb_array_length(abonnements)=0 then update public.tourneo_envois set statut='annule'where id=j.id;continue;end if;
  ident:=gen_random_uuid();update public.tourneo_envois set statut='traitement',tentatives=tentatives+1,bail=ident,bail_fin=now()+interval '2 minutes'where id=j.id;
  sortie:=sortie||jsonb_build_array(jsonb_build_object('id',j.id,'bail',ident,'canal',j.canal,'lien',lien,'email',adresse,'langue',coalesce(p.langue,'fr'),'abonnements',abonnements,'bilan',bilan));
 end loop;return sortie;end $$;

alter table public.tourneo_notifications drop constraint tourneo_notifications_type_check;
alter table public.tourneo_notifications add constraint tourneo_notifications_type_check check(type in('inscription','statut_inscription','arbitrage','score','bilan','rappel'));
create table tourneo_private.rappels_envoyes(tournoi_id uuid references public.tournois(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,depart timestamptz,created_at timestamptz not null default now(),primary key(tournoi_id,user_id,depart));
alter table tourneo_private.rappels_envoyes enable row level security;
revoke all on tourneo_private.rappels_envoyes from public,anon,authenticated;
create function tourneo_private.envoyer_rappels(p_maintenant timestamptz default now())returns integer language plpgsql security definer set search_path='' as $$
declare t public.tournois;avant integer;debut timestamptz;zone text;dest uuid;n integer:=0;begin
 for t in select * from public.tournois where donnees->'optionsV2'->>'rappelAvant' in('15','30')and coalesce(donnees->>'termine','false')<>'true'loop
  avant:=(t.donnees->'optionsV2'->>'rappelAvant')::integer;
  zone:=coalesce(nullif(t.donnees->'optionsV2'->>'fuseauHoraire',''),'Europe/Paris');
  if not exists(select 1 from pg_timezone_names where name=zone)then continue;end if;
  if coalesce(t.donnees->'optionsV2'->>'depart','')!~'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}'then continue;end if;
  begin debut:=((t.donnees->'optionsV2'->>'depart')::timestamp at time zone zone);exception when others then continue;end;
  if p_maintenant<debut-make_interval(mins=>avant)or p_maintenant>=debut then continue;end if;
  for dest in select distinct u.id from auth.users u where u.deleted_at is null and u.email_confirmed_at is not null and(u.banned_until is null or u.banned_until<p_maintenant)and coalesce((select p.notifications_sportives from public.tourneo_preferences p where p.user_id=u.id),true)and u.id in(
   select i.user_id from public.tourneo_inscriptions i where i.tournoi_id=t.id and i.statut='accepte'and i.user_id is not null
   union select case when coalesce(e->>'profilId',e->>'id')~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'then coalesce(e->>'profilId',e->>'id')::uuid end from jsonb_array_elements(case when jsonb_typeof(t.donnees->'equipes')='array'then t.donnees->'equipes'else '[]'end)e
  )loop
   insert into tourneo_private.rappels_envoyes(tournoi_id,user_id,depart)values(t.id,dest,debut)on conflict do nothing;
   if found then
    insert into public.tourneo_notifications(user_id,tournoi_id,type,message)values(dest,t.id,'rappel','Le tournoi « '||left(t.nom,150)||' » commence bientôt. Consultez son horaire et votre participation.');n:=n+1;
   end if;
  end loop;
 end loop;return n;
end $$;
revoke all on function tourneo_private.envoyer_rappels(timestamptz) from public,anon,authenticated;

-- Public city display is a separate choice; old private city values stay private.
create function tourneo_private.profils_identites(p_code text,p_ids uuid[],p_recherche text)returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid()is null then raise exception 'Connexion requise';end if;
 if p_recherche is not null and char_length(trim(p_recherche))<3 then return '[]';end if;
 return coalesce((select jsonb_agg(to_jsonb(p)) from(select id,display_name,player_code,null::text as avatar_url,favorite_color,case when ville_publique then nullif(trim(city),'')else null end as city from public.profiles where(p_code is not null and player_code=upper(trim(p_code)))or(cardinality(p_ids)<=256 and id=any(p_ids))or(p_recherche is not null and display_name ilike '%'||left(trim(p_recherche),60)||'%')order by display_name limit(case when p_recherche is not null then 10 else 256 end))p),'[]');
end $$;
create function public.tourneo_profils_identites(p_code text default null,p_ids uuid[] default null,p_recherche text default null)returns jsonb language sql stable security invoker set search_path='' as $$select tourneo_private.profils_identites(p_code,p_ids,p_recherche)$$;
revoke all on function tourneo_private.profils_identites(text,uuid[],text),public.tourneo_profils_identites(text,uuid[],text) from public,anon;
grant execute on function tourneo_private.profils_identites(text,uuid[],text),public.tourneo_profils_identites(text,uuid[],text) to authenticated;

create function tourneo_private.chercher_arbitres(p_tournoi uuid,p_nom text)returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not exists(select 1 from public.tournois where id=p_tournoi and user_id=auth.uid())then raise exception 'Accès organisateur requis';end if;
 if char_length(trim(p_nom))not between 3 and 60 then raise exception 'Saisissez au moins 3 caractères du nom affiché';end if;
 return(select coalesce(jsonb_agg(jsonb_build_object('id',id,'display_name',display_name,'player_code',player_code)),'[]')from(select p.id,p.display_name,p.player_code from public.profiles p where p.player_code is not null and position(lower(trim(p_nom))in lower(p.display_name))>0 and not exists(select 1 from public.tourneo_arbitres a where a.tournoi_id=p_tournoi and a.user_id=p.id)order by p.display_name,p.id limit 10)p);
end$$;
create function public.tourneo_chercher_arbitres(p_tournoi uuid,p_nom text)returns jsonb language sql stable security invoker set search_path='' as $$select tourneo_private.chercher_arbitres(p_tournoi,p_nom)$$;
revoke all on function public.tourneo_chercher_arbitres(uuid,text),tourneo_private.chercher_arbitres(uuid,text)from public,anon;
grant execute on function public.tourneo_chercher_arbitres(uuid,text),tourneo_private.chercher_arbitres(uuid,text)to authenticated;

-- Public free predictions, without account. Tokens stay private and are never returned in public lists.
create table tourneo_private.pronostics_invites(
 id uuid primary key default gen_random_uuid(),
 tournoi_id uuid not null references public.tourneo_pronostics_config(tournoi_id)on delete cascade,
 jeton uuid not null,
 pseudo text not null check(char_length(trim(pseudo))between 1 and 80 and pseudo!~'[[:cntrl:]]'),
 choix text[] not null check(cardinality(choix)between 1 and 5),
 updated_at timestamptz not null default now(),
 unique(tournoi_id,jeton)
);
alter table tourneo_private.pronostics_invites enable row level security;
revoke all on tourneo_private.pronostics_invites from public,anon,authenticated;

create function tourneo_private.pronostics_scores(p_id uuid)returns table(cle text,pseudo text,points integer,rang bigint)language sql stable set search_path='' as $$
 with scores as(
 select 'compte:'||v.user_id::text as cle,v.pseudo,tourneo_private.pronostics_points(v.choix,c.classement,c.mode)as points from public.tourneo_pronostics_votes v join public.tourneo_pronostics_config c on c.tournoi_id=v.tournoi_id where v.tournoi_id=p_id
 union all
 select 'invite:'||v.id::text,v.pseudo,tourneo_private.pronostics_points(v.choix,c.classement,c.mode)from tourneo_private.pronostics_invites v join public.tourneo_pronostics_config c on c.tournoi_id=v.tournoi_id where v.tournoi_id=p_id
 )select cle,pseudo,points,rank()over(order by points desc)from scores
$$;
revoke all on function tourneo_private.pronostics_scores(uuid)from public,anon,authenticated;

create or replace function tourneo_private.pronostics_lecture(p_id uuid)returns jsonb language plpgsql stable security definer set search_path='' as $$
declare t public.tournois;c public.tourneo_pronostics_config;resultat jsonb;compatible boolean;publie boolean;begin
 select * into t from public.tournois where id=p_id;
 if not found then return jsonb_build_object('actif',false);end if;
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

create or replace function tourneo_private.pronostics_configurer(p_id uuid,p_actif boolean,p_mode text,p_cloture timestamptz default null)returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.tournois;c public.tourneo_pronostics_config;liste_equipes jsonb;n integer;begin
 select * into t from public.tournois where id=p_id and user_id=auth.uid()for update;if not found then raise exception 'Accès organisateur requis';end if;
 select * into c from public.tourneo_pronostics_config where tournoi_id=p_id for update;
 if coalesce(t.donnees->>'cree','false')='true'or c.ferme_at is not null or c.cloture_at<=now()then
  if c.tournoi_id is not null and not p_actif then update public.tourneo_pronostics_config set actif=false where tournoi_id=p_id;return tourneo_private.pronostics_lecture(p_id);end if;
  raise exception 'Les pronostics sont fermés. Impossible de les rouvrir.';
 end if;
 if p_mode is null or p_mode not in('vainqueur','podium_ordre','podium_libre','top5_ordre','top5_libre')then raise exception 'Choisissez un format de pronostic';end if;
 liste_equipes:=tourneo_private.pronostics_equipes(t.id,t.donnees);n:=jsonb_array_length(liste_equipes);
 if (select count(distinct e->>'id')from jsonb_array_elements(liste_equipes)e)<>n then raise exception 'Les participants doivent être distincts';end if;
 if n<2 or n>128 or n<(case when p_mode like 'podium%'then 3 when p_mode like 'top5%'then 5 else 1 end)then raise exception 'Le nombre de participants ne permet pas ce format';end if;
 if p_cloture<=now()then raise exception 'Choisissez une clôture future';end if;
 if(exists(select 1 from public.tourneo_pronostics_votes where tournoi_id=p_id)or exists(select 1 from tourneo_private.pronostics_invites where tournoi_id=p_id))and(c.mode is distinct from p_mode or c.equipes is distinct from liste_equipes or c.cloture_at is distinct from p_cloture)then raise exception 'Des pronostics existent déjà : le format, les participants et la clôture sont figés';end if;
 insert into public.tourneo_pronostics_config(tournoi_id,actif,mode,equipes,cloture_at)values(p_id,coalesce(p_actif,false),p_mode,liste_equipes,p_cloture)on conflict(tournoi_id)do update set actif=excluded.actif,mode=excluded.mode,equipes=excluded.equipes,cloture_at=excluded.cloture_at;
 return tourneo_private.pronostics_lecture(p_id);
end$$;
create function tourneo_private.pronostics_invite_lecture(p_id uuid,p_jeton uuid)returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r jsonb;v tourneo_private.pronostics_invites;ma_cle text;begin
 r:=tourneo_private.pronostics_lecture(p_id);
 if not coalesce((r->>'actif')::boolean,false)then return r;end if;
 select * into v from tourneo_private.pronostics_invites where tournoi_id=p_id and jeton=p_jeton;
 if found then
  ma_cle:='invite:'||v.id::text;r:=r||jsonb_build_object('mon_choix',v.choix,'mon_nom',v.pseudo,'participation_compte',false);
 else
  ma_cle:='compte:'||auth.uid()::text;
  r:=r||jsonb_build_object('mon_nom',(select pseudo from public.tourneo_pronostics_votes where tournoi_id=p_id and user_id=auth.uid()),'participation_compte',exists(select 1 from public.tourneo_pronostics_votes where tournoi_id=p_id and user_id=auth.uid()));
 end if;
 if coalesce((r->>'publie')::boolean,false)then r:=r||jsonb_build_object('mon_rang',(select jsonb_build_object('rang',s.rang,'points',s.points)from tourneo_private.pronostics_scores(p_id)s where s.cle=ma_cle));end if;
 return r;
end$$;
create function public.tourneo_pronostics_invite_lecture(p_id uuid,p_jeton uuid)returns jsonb language sql stable security invoker set search_path='' as $$select tourneo_private.pronostics_invite_lecture(p_id,p_jeton)$$;
create function tourneo_private.pronostics_invite_voter(p_id uuid,p_jeton uuid,p_nom text,p_choix text[])returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.tournois;c public.tourneo_pronostics_config;v tourneo_private.pronostics_invites;n integer;nom text:=btrim(p_nom);begin
 if p_jeton is null then raise exception 'Actualisez cette page pour préparer votre participation';end if;
 if nom is null or char_length(nom)not between 1 and 80 or nom~'[[:cntrl:]]'then raise exception 'Indiquez votre nom ou pseudo (80 caractères maximum)';end if;
 select * into t from public.tournois where id=p_id for update;
 select * into c from public.tourneo_pronostics_config where tournoi_id=p_id for update;
 if c.tournoi_id is null or not c.actif or c.ferme_at is not null or c.cloture_at<=now()or coalesce(t.donnees->>'cree','false')='true'then raise exception 'Les pronostics sont fermés';end if;
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
create function public.tourneo_pronostics_invite_voter(p_id uuid,p_jeton uuid,p_nom text,p_choix text[])returns jsonb language sql security invoker set search_path='' as $$select tourneo_private.pronostics_invite_voter(p_id,p_jeton,p_nom,p_choix)$$;
create function tourneo_private.pronostics_invite_retirer(p_id uuid,p_jeton uuid)returns jsonb language plpgsql security definer set search_path='' as $$begin
 perform 1 from public.tournois where id=p_id for update;
 delete from tourneo_private.pronostics_invites where tournoi_id=p_id and jeton=p_jeton;
 if auth.uid()is not null then delete from public.tourneo_pronostics_votes where tournoi_id=p_id and user_id=auth.uid();end if;
 return tourneo_private.pronostics_invite_lecture(p_id,p_jeton);
end$$;
create function public.tourneo_pronostics_invite_retirer(p_id uuid,p_jeton uuid)returns jsonb language sql security invoker set search_path='' as $$select tourneo_private.pronostics_invite_retirer(p_id,p_jeton)$$;
revoke all on function public.tourneo_pronostics_invite_lecture(uuid,uuid),tourneo_private.pronostics_invite_lecture(uuid,uuid),public.tourneo_pronostics_invite_voter(uuid,uuid,text,text[]),tourneo_private.pronostics_invite_voter(uuid,uuid,text,text[]),public.tourneo_pronostics_invite_retirer(uuid,uuid),tourneo_private.pronostics_invite_retirer(uuid,uuid)from public;
grant execute on function public.tourneo_pronostics_invite_lecture(uuid,uuid),tourneo_private.pronostics_invite_lecture(uuid,uuid),public.tourneo_pronostics_invite_voter(uuid,uuid,text,text[]),tourneo_private.pronostics_invite_voter(uuid,uuid,text,text[]),public.tourneo_pronostics_invite_retirer(uuid,uuid),tourneo_private.pronostics_invite_retirer(uuid,uuid)to anon,authenticated;

-- Keep the legacy signed-in API within the shared game capacity too.
create or replace function tourneo_private.pronostics_voter(p_id uuid,p_choix text[])returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.tournois;c public.tourneo_pronostics_config;n integer;alias text;begin
 if auth.uid()is null or not exists(select 1 from auth.users where id=auth.uid()and email_confirmed_at is not null)then raise exception 'Connectez-vous avec un compte confirmé pour participer';end if;
 select * into t from public.tournois where id=p_id for update;
 select * into c from public.tourneo_pronostics_config where tournoi_id=p_id for update;
 if c.tournoi_id is null or not c.actif or c.ferme_at is not null or c.cloture_at<=now()or coalesce(t.donnees->>'cree','false')='true'then raise exception 'Les pronostics sont fermés';end if;
 if (select array_agg(e->>'id'order by e->>'id')from jsonb_array_elements(c.equipes)e)is distinct from(select array_agg(e->>'id'order by e->>'id')from jsonb_array_elements(tourneo_private.pronostics_equipes(t.id,t.donnees))e)then raise exception 'Les participants ont changé. Le jeu doit être vérifié par l’organisateur';end if;
 n:=case when c.mode like 'podium%'then 3 when c.mode like 'top5%'then 5 else 1 end;
 if p_choix is null or cardinality(p_choix)<>n or(select count(distinct x)from unnest(p_choix)x)<>n or exists(select 1 from unnest(p_choix)x where not exists(select 1 from jsonb_array_elements(c.equipes)e where e->>'id'=x))then raise exception 'Choisissez des participants différents dans la liste';end if;
 if not exists(select 1 from public.tourneo_pronostics_votes where tournoi_id=p_id and user_id=auth.uid())and((select count(*)from public.tourneo_pronostics_votes where tournoi_id=p_id)+(select count(*)from tourneo_private.pronostics_invites where tournoi_id=p_id))>=10000 then raise exception 'La capacité du jeu est atteinte';end if;
 select left(coalesce(nullif(trim(display_name),''),'Spectateur'),80)into alias from public.profiles where id=auth.uid();
 insert into public.tourneo_pronostics_votes(tournoi_id,user_id,pseudo,choix)values(p_id,auth.uid(),coalesce(alias,'Spectateur'),p_choix)on conflict(tournoi_id,user_id)do update set choix=excluded.choix,pseudo=excluded.pseudo,updated_at=now();
 return tourneo_private.pronostics_lecture(p_id);
end$$;


create table public.tourneo_jobs_photos (
 token uuid primary key default gen_random_uuid(),
 expires_at timestamptz not null default(now()+interval '10 minutes')
);
alter table public.tourneo_jobs_photos enable row level security;
revoke all on public.tourneo_jobs_photos from public,anon,authenticated;
grant select,insert,delete on public.tourneo_jobs_photos to service_role;
create function public.tourneo_consomme_job_photo(p_token uuid)
returns boolean language sql security invoker set search_path=public,pg_temp as $$
 with consomme as(delete from public.tourneo_jobs_photos where token=p_token and expires_at>now() returning token)
 select exists(select 1 from consomme);
$$;
create function public.tourneo_photos_a_supprimer()
returns table(name text) language sql stable security invoker set search_path=public,pg_temp as $$
 select o.name from storage.objects o
 left join public.tournois t on t.id::text=split_part(o.name,'/',3) and t.user_id::text=split_part(o.name,'/',1)
 where o.bucket_id='tourneo-media' and split_part(o.name,'/',2)='tournois'
 and ((t.id is not null and t.photos_expirent_at<=now()) or(t.id is null and o.created_at<now()-interval '1 day'))
 order by o.created_at,o.name limit 100;
$$;
create function public.tourneo_nettoyer_photos_inline()
returns void language sql security invoker set search_path=public,pg_temp as $$
 update public.tournois set donnees=(donnees-'podiumPhotoUrl')||
 case when jsonb_typeof(donnees->'podiumFinal')='array' then jsonb_build_object('podiumFinal',(select coalesce(jsonb_agg(e-'photo'),'[]'::jsonb) from jsonb_array_elements(donnees->'podiumFinal')e)) else '{}'::jsonb end
 where photos_expirent_at<=now() and (donnees?'podiumPhotoUrl' or exists(select 1 from jsonb_array_elements(case when jsonb_typeof(donnees->'podiumFinal')='array' then donnees->'podiumFinal' else '[]'::jsonb end)e where e?'photo'));
$$;
revoke all on function public.tourneo_consomme_job_photo(uuid),public.tourneo_photos_a_supprimer(),public.tourneo_nettoyer_photos_inline() from public,anon,authenticated;
grant execute on function public.tourneo_consomme_job_photo(uuid),public.tourneo_photos_a_supprimer(),public.tourneo_nettoyer_photos_inline() to service_role;
grant select,update on public.tournois to service_role;

create or replace function tourneo_private.olympiade_publique(p_id uuid)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('version',1,'nom',o.nom,'equipes',coalesce((select jsonb_agg(jsonb_build_object('id',tourneo_private.reference_publique(o.id,e->>'id'),'nom',e->'nom','joueurs','[]'::jsonb)) from jsonb_array_elements(coalesce(o.donnees->'equipes','[]'::jsonb)) e),'[]'::jsonb),
 'epreuves',coalesce((select jsonb_agg(jsonb_build_object('id',tourneo_private.reference_publique(o.id,e->>'id'),'nom',e->'nom','unite',e->'unite','sens',e->'sens','validee',e->'validee','mesures',coalesce((select jsonb_object_agg(tourneo_private.reference_publique(o.id,t->>'id'),e->'mesures'->(t->>'id')) from jsonb_array_elements(coalesce(o.donnees->'equipes','[]'::jsonb)) t),'{}'::jsonb))) from jsonb_array_elements(coalesce(o.donnees->'epreuves','[]'::jsonb)) e where e->>'validee'='true'),'[]'::jsonb)) from public.tourneo_olympiades o where o.id=p_id and o.partage=true;
$$;
revoke all on function tourneo_private.olympiade_publique(uuid) from public;
-- Le schéma interne ne reçoit aucun droit supplémentaire pour anon.
-- La projection interne ne peut être appelée que par le wrapper contrôlé.
revoke execute on function tourneo_private.olympiade_publique(uuid) from anon,authenticated;
create or replace function public.tourneo_olympiade_publique(p_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$ select tourneo_private.olympiade_publique(p_id); $$;
revoke all on function public.tourneo_olympiade_publique(uuid) from public;
grant execute on function public.tourneo_olympiade_publique(uuid) to anon,authenticated;

create or replace function tourneo_private.album_photo_partagee(p_path text)returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.tourneo_album_partages p join public.tourneo_album_config c on c.tournoi_id=p.tournoi_id join public.tournois t on t.id=p.tournoi_id where p.apercu_path is not null and(p.apercu_path=p_path or(c.telechargement and p.path=p_path))and c.partage and(t.photos_expirent_at is null or t.photos_expirent_at>now()))
$$;
create or replace function tourneo_private.album_public(p_tournoi uuid)returns jsonb language sql stable security definer set search_path='' as $$
 select case when exists(select 1 from public.tourneo_album_config c join public.tournois t on t.id=c.tournoi_id where c.tournoi_id=p_tournoi and c.partage and(t.photos_expirent_at is null or t.photos_expirent_at>now()))then jsonb_build_object('actif',true,'telechargement',(select telechargement from public.tourneo_album_config where tournoi_id=p_tournoi),'photos',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'path',p.apercu_path,'telechargement_path',case when c.telechargement then p.path else null end,'legende',a.legende,'created_at',a.created_at)order by a.created_at desc,a.id)from public.tourneo_album_partages p join public.tourneo_album_photos a on a.id=p.photo_id join public.tourneo_album_config c on c.tournoi_id=p.tournoi_id where p.tournoi_id=p_tournoi and p.apercu_path is not null),'[]'::jsonb))else jsonb_build_object('actif',false,'telechargement',false,'photos','[]'::jsonb)end
$$;

revoke all on function tourneo_private.album_photo_partagee(text)from public;
grant execute on function tourneo_private.album_photo_partagee(text)to anon,authenticated;

create function public.tourneo_album_public(p_tournoi uuid)returns jsonb language sql stable security definer set search_path='' as $$select tourneo_private.album_public(p_tournoi)$$;
revoke all on function public.tourneo_album_public(uuid),tourneo_private.album_public(uuid)from public;
grant execute on function public.tourneo_album_public(uuid),tourneo_private.album_public(uuid)to anon,authenticated;

RESET ROLE;

grant select on storage.objects to anon;
create policy album_images_partagees on storage.objects for select to anon,authenticated using(bucket_id='tourneo-media'and storage.allow_any_operation(array['object.get_authenticated','object.get_authenticated_info'])and tourneo_private.album_photo_partagee(name));

SET LOCAL ROLE postgres;

create function tourneo_private.proposer_manches(p_tournoi uuid,p_match integer,p_manches jsonb)returns void language plpgsql security definer set search_path='' as $$
declare t public.tournois;g integer;a integer;b integer;v1 integer:=0;v2 integer:=0;s jsonb;normalise jsonb:='[]';begin
 select * into t from public.tournois where id=p_tournoi for update;
 if t.id is null or auth.uid()is null or not exists(select 1 from public.tourneo_arbitres where tournoi_id=p_tournoi and user_id=auth.uid())then raise exception 'Accès arbitre requis';end if;
 if t.sport<>'tennis'or t.donnees->'optionsV2'->>'score'is distinct from 'sets'then raise exception 'Ce transfert est réservé au tennis en sets';end if;
 if not exists(select 1 from jsonb_array_elements(coalesce(t.donnees->'matchs','[]'))m where m->>'id'=p_match::text)then raise exception 'Match introuvable';end if;
 if coalesce(t.donnees->'matchsValides','[]')@>jsonb_build_array(p_match)then raise exception 'Le résultat est déjà validé';end if;
 g:=coalesce((t.donnees->'optionsV2'->>'setsGagnants')::integer,2);
 if g not between 1 and 5 or coalesce((t.donnees->'optionsV2'->>'cibleManche')::integer,6)not in(0,6)or coalesce((t.donnees->'optionsV2'->>'ecartManche')::integer,2)<>2 or coalesce((t.donnees->'optionsV2'->>'plafondManche')::integer,7)not in(0,7)or coalesce((t.donnees->'optionsV2'->>'cibleDecisive')::integer,0)<>0 then raise exception 'Barème personnalisé : saisie par l’organisateur requise';end if;
 if p_manches is null or jsonb_typeof(p_manches)<>'array'or jsonb_array_length(p_manches)not between 1 and 2*g-1 then raise exception 'Manches invalides';end if;
 for s in select x from jsonb_array_elements(p_manches)x loop
  if v1=g or v2=g then raise exception 'Manche après la fin du match';end if;
  if s->>'score1'is null or s->>'score2'is null or s->>'score1'!~'^[0-7]$'or s->>'score2'!~'^[0-7]$'then raise exception 'Score de set invalide';end if;
  a:=(s->>'score1')::integer;b:=(s->>'score2')::integer;
  if not((greatest(a,b)=6 and least(a,b)<=4)or(greatest(a,b)=7 and least(a,b)in(5,6)))then raise exception 'Le set doit se terminer à 6 jeux avec 2 jeux d’écart, 7–5 ou 7–6';end if;
  if a>b then v1:=v1+1;else v2:=v2+1;end if;
  normalise:=normalise||jsonb_build_array(jsonb_build_object('score1',a::text,'score2',b::text));
 end loop;
 if greatest(v1,v2)<>g then raise exception 'Match non terminé';end if;
 insert into public.tourneo_scores_proposes(tournoi_id,match_id,user_id,score1,score2,manches)values(p_tournoi,p_match,auth.uid(),v1,v2,normalise)
 on conflict(tournoi_id,match_id,user_id)do update set score1=excluded.score1,score2=excluded.score2,manches=excluded.manches,statut='propose',updated_at=now();
end$$;
create or replace function public.tourneo_proposer_manches(p_tournoi uuid,p_match integer,p_manches jsonb)returns void language sql security invoker set search_path='' as $$select tourneo_private.proposer_manches(p_tournoi,p_match,p_manches)$$;
revoke all on function public.tourneo_proposer_manches(uuid,integer,jsonb),tourneo_private.proposer_manches(uuid,integer,jsonb)from public,anon;
grant execute on function public.tourneo_proposer_manches(uuid,integer,jsonb),tourneo_private.proposer_manches(uuid,integer,jsonb)to authenticated;

create function tourneo_private.mes_participations()returns jsonb language plpgsql stable security definer set search_path='' as $$
declare t public.tournois;m jsonb;ids text[];noms jsonb;resultat jsonb:='[]';matches jsonb;begin
 if auth.uid()is null then raise exception 'Connexion requise';end if;
 for t in select * from public.tournois where donnees->>'cree'='true' loop
  select coalesce(array_agg(e->>'id'),'{}')into ids from jsonb_array_elements(case when jsonb_typeof(t.donnees->'equipes')='array'then t.donnees->'equipes'else'[]'end)e where coalesce(e->>'profilId',e->>'id')=auth.uid()::text;
  if cardinality(ids)=0 then continue;end if;
  matches:='[]';
  for m in select x from jsonb_array_elements(case when jsonb_typeof(t.donnees->'matchs')='array'then t.donnees->'matchs'else'[]'end)x loop
   if m->>'equipe1Id'=any(ids)or m->>'equipe2Id'=any(ids)or string_to_array(replace(m->>'equipe1Id','duo:',''),'|')&&ids or string_to_array(replace(m->>'equipe2Id','duo:',''),'|')&&ids or exists(select 1 from jsonb_array_elements_text(case when jsonb_typeof(m->'joueurs1Ids')='array'then m->'joueurs1Ids'else'[]'end)x where x=any(ids))or exists(select 1 from jsonb_array_elements_text(case when jsonb_typeof(m->'joueurs2Ids')='array'then m->'joueurs2Ids'else'[]'end)x where x=any(ids))then
    select jsonb_object_agg(cote,nom)into noms from(select cote,coalesce(string_agg(e->>'nom',' / '),'À déterminer')as nom from unnest(array['1','2'])cote left join lateral jsonb_array_elements(t.donnees->'equipes')e on e->>'id'=any(string_to_array(replace(m->>('equipe'||cote||'Id'),'duo:',''),'|'))group by cote)q;
    matches:=matches||jsonb_build_array(jsonb_build_object('id',m->'id','journee',m->'journee','terrain',m->'terrain','participant1',noms->>'1','participant2',noms->>'2','score1',case when coalesce(t.donnees->'matchsValides','[]')@>jsonb_build_array(m->'id')then m->'score1'else null end,'score2',case when coalesce(t.donnees->'matchsValides','[]')@>jsonb_build_array(m->'id')then m->'score2'else null end,'valide',coalesce(t.donnees->'matchsValides','[]')@>jsonb_build_array(m->'id')));
   end if;
  end loop;
  if jsonb_array_length(matches)>0 then resultat:=resultat||jsonb_build_array(jsonb_build_object('id',t.id,'nom',t.nom,'sport',t.sport,'matchs',matches));end if;
 end loop;return resultat;end$$;
create or replace function public.tourneo_mes_participations()returns jsonb language sql stable security invoker set search_path='' as $$select tourneo_private.mes_participations()$$;
revoke all on function public.tourneo_mes_participations(),tourneo_private.mes_participations()from public,anon;
grant execute on function public.tourneo_mes_participations(),tourneo_private.mes_participations()to authenticated;

RESET ROLE;

REVOKE EXECUTE ON FUNCTION public.get_tourneo_public(uuid), public.tourneo_public_compat_v2(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_tourneo_public(uuid), public.tourneo_public_compat_v2(uuid) TO service_role;
DO $$
DECLARE r record;
BEGIN
 FOR r IN
  SELECT p.oid,format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) AS signature,
   has_function_privilege('authenticated',p.oid,'EXECUTE') AS auth_ok,
   has_function_privilege('service_role',p.oid,'EXECUTE') AS service_ok
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='tourneo_private' AND p.prokind='f'
   AND has_function_privilege('anon',p.oid,'EXECUTE')
   AND p.oid NOT IN (
    'tourneo_private.pronostics_invite_lecture(uuid,uuid)'::regprocedure,
    'tourneo_private.pronostics_invite_voter(uuid,uuid,text,text[])'::regprocedure,
    'tourneo_private.pronostics_invite_retirer(uuid,uuid)'::regprocedure,
    'tourneo_private.album_photo_partagee(text)'::regprocedure
   )
 LOOP
  IF r.auth_ok THEN EXECUTE 'GRANT EXECUTE ON FUNCTION '||r.signature||' TO authenticated'; END IF;
  IF r.service_ok THEN EXECUTE 'GRANT EXECUTE ON FUNCTION '||r.signature||' TO service_role'; END IF;
  EXECUTE 'REVOKE EXECUTE ON FUNCTION '||r.signature||' FROM PUBLIC, anon';
 END LOOP;
 IF EXISTS (
  SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='tourneo_private' AND c.relkind IN ('r','p','v','m')
   AND (has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
     OR has_any_column_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,REFERENCES'))
 ) THEN RAISE EXCEPTION 'Acces prive excessif'; END IF;
END $$;
GRANT USAGE ON SCHEMA tourneo_private TO anon;
GRANT EXECUTE ON FUNCTION tourneo_private.pronostics_invite_lecture(uuid,uuid),
 tourneo_private.pronostics_invite_voter(uuid,uuid,text,text[]),
 tourneo_private.pronostics_invite_retirer(uuid,uuid),
 tourneo_private.album_photo_partagee(text) TO anon;
SET LOCAL ROLE anon;
SELECT public.tourneo_pronostics_invite_lecture('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000000');
RESET ROLE;
COMMIT;
