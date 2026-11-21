-- Tourneo V2: remaining application RPCs on a restored V1 copy.
-- External notification delivery stays inactive until separately configured.
begin;
do $$
begin
 if current_setting('tourneo.v1_copy_verified',true) is distinct from 'true'
 or to_regclass('public.tourneo_pronostics_config') is null
 or to_regclass('public.tourneo_compte_usage') is not null
 then raise exception 'STAGING STOP: phase 19 requise et modules absents'; end if;
end $$;


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



-- Optional operational information, private to the account. Never authorization metadata.
create table public.tourneo_compte_usage(user_id uuid primary key default auth.uid()references auth.users(id)on delete cascade,structure text check(char_length(structure)<=150),updated_at timestamptz not null default now());
alter table public.tourneo_compte_usage enable row level security;
revoke all on public.tourneo_compte_usage from public,anon,authenticated;
grant select,insert,update on public.tourneo_compte_usage to authenticated;
create policy usage_lecture on public.tourneo_compte_usage for select to authenticated using(user_id=(select auth.uid()));
create policy usage_ajout on public.tourneo_compte_usage for insert to authenticated with check(user_id=(select auth.uid()));
create policy usage_modification on public.tourneo_compte_usage for update to authenticated using(user_id=(select auth.uid()))with check(user_id=(select auth.uid()));
create function tourneo_private.compte_usage_initial()returns trigger language plpgsql security definer set search_path='' as $$declare nom text;begin
 nom:=nullif(left(trim(new.raw_user_meta_data->>'structure'),150),'');
 if nom is not null then insert into public.tourneo_compte_usage(user_id,structure)values(new.id,nom)on conflict do nothing;end if;return new;
end$$;
revoke all on function tourneo_private.compte_usage_initial()from public,anon,authenticated;
create trigger compte_usage_initial after insert on auth.users for each row execute function tourneo_private.compte_usage_initial();

create table tourneo_private.acces_offerts(user_id uuid primary key references auth.users(id)on delete cascade,actif boolean not null default true,motif text not null check(char_length(trim(motif))between 3 and 300),accorde_par uuid references auth.users(id)on delete set null,updated_at timestamptz not null default now());
-- Reserved for a future verified payment backend. No checkout or billing provider is enabled.
create table tourneo_private.licences_expert_vie(user_id uuid primary key references auth.users(id)on delete cascade,actif boolean not null default true,reference_achat text unique,attribue_at timestamptz not null default now());
alter table tourneo_private.administrateurs enable row level security;
alter table tourneo_private.acces_offerts enable row level security;
alter table tourneo_private.licences_expert_vie enable row level security;
alter table tourneo_private.journal_admin enable row level security;
revoke all on tourneo_private.administrateurs,tourneo_private.acces_offerts,tourneo_private.licences_expert_vie,tourneo_private.journal_admin from public,anon,authenticated;
create function public.tourneo_mon_role_admin()returns text language sql stable security invoker set search_path='' as $$select tourneo_private.role_admin()$$;
create function tourneo_private.mon_offre()returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid()is null then raise exception 'Connexion requise';end if;
 return jsonb_build_object('version','V2','paiement_actif',false,'expert_disponible',true,'tournois_par_mois',null,'participants_maximum_commercial',null,'expert_offert',exists(select 1 from tourneo_private.acces_offerts where user_id=auth.uid()and actif),'licence_expert_vie',exists(select 1 from tourneo_private.licences_expert_vie where user_id=auth.uid()and actif));
end$$;
create function public.tourneo_mon_offre()returns jsonb language sql stable security invoker set search_path='' as $$select tourneo_private.mon_offre()$$;

create function tourneo_private.admin_tableau(p_debut timestamptz,p_fin timestamptz)returns jsonb language plpgsql stable security definer set search_path='' as $$declare debut timestamptz:=coalesce(p_debut,now()-interval '30 days');fin timestamptz:=coalesce(p_fin,now());begin
 if tourneo_private.role_admin()is null then raise exception 'Accès administrateur requis';end if;
 if fin<debut then raise exception 'Période invalide';end if;
 return jsonb_build_object('comptes',(select count(*)from auth.users),'nouveaux_comptes',(select count(*)from auth.users where created_at between debut and fin),'connexions',(select count(*)from auth.users where last_sign_in_at between debut and fin),'tournois',(select count(*)from public.tournois where created_at between debut and fin),'expert_offert',(select count(*)from tourneo_private.acces_offerts where actif),'sports',(select coalesce(jsonb_agg(jsonb_build_object('nom',sport,'nombre',n)),'[]')from(select sport,count(*)as n from public.tournois where created_at between debut and fin group by sport order by n desc limit 30)q),'formats',(select coalesce(jsonb_agg(jsonb_build_object('nom',format,'nombre',n)),'[]')from(select coalesce(donnees->>'formatTournoi','non précisé')as format,count(*)as n from public.tournois where created_at between debut and fin group by 1 order by n desc)q));
end$$;
create function public.tourneo_admin_tableau(p_debut timestamptz default null,p_fin timestamptz default null)returns jsonb language sql stable security invoker set search_path='' as $$select tourneo_private.admin_tableau(p_debut,p_fin)$$;
create function tourneo_private.admin_comptes(p_recherche text,p_page integer)returns jsonb language plpgsql stable security definer set search_path='' as $$declare resultat jsonb;begin
 if tourneo_private.role_admin()is null then raise exception 'Accès administrateur requis';end if;
 if p_page is null or p_page<0 or p_page>10000 or char_length(coalesce(p_recherche,''))>100 then raise exception 'Recherche invalide';end if;
 select coalesce(jsonb_agg(to_jsonb(q)),'[]')into resultat from(select u.id,u.email,u.created_at,u.last_sign_in_at,(u.email_confirmed_at is not null)as confirme,p.display_name,p.player_code,c.structure,a.role as role_admin,coalesce(o.actif,false)as expert_offert,(select count(*)from public.tournois t where t.user_id=u.id)as tournois from auth.users u left join public.profiles p on p.id=u.id left join public.tourneo_compte_usage c on c.user_id=u.id left join tourneo_private.administrateurs a on a.user_id=u.id left join tourneo_private.acces_offerts o on o.user_id=u.id where coalesce(p_recherche,'')=''or u.email ilike'%'||p_recherche||'%'or p.display_name ilike'%'||p_recherche||'%'or p.player_code ilike'%'||p_recherche||'%' order by u.created_at desc,u.id limit 50 offset p_page*50)q;return resultat;
end$$;
create function public.tourneo_admin_comptes(p_recherche text default '',p_page integer default 0)returns jsonb language sql stable security invoker set search_path='' as $$select tourneo_private.admin_comptes(p_recherche,p_page)$$;
create function tourneo_private.admin_cadeau(p_user uuid,p_actif boolean,p_motif text)returns void language plpgsql security definer set search_path='' as $$declare avant jsonb;begin
 if tourneo_private.role_admin()is distinct from 'superadmin'then raise exception 'Accès super administrateur requis';end if;
 if p_actif is null or p_motif is null or char_length(trim(p_motif))not between 3 and 300 then raise exception 'Motif requis (3 à 300 caractères)';end if;
 if not exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null)then raise exception 'Compte confirmé introuvable';end if;
 perform pg_advisory_xact_lock(hashtext(p_user::text));select jsonb_build_object('actif',actif)into avant from tourneo_private.acces_offerts where user_id=p_user;
 insert into tourneo_private.acces_offerts(user_id,actif,motif,accorde_par)values(p_user,p_actif,trim(p_motif),auth.uid())on conflict(user_id)do update set actif=excluded.actif,motif=excluded.motif,accorde_par=excluded.accorde_par,updated_at=now();
 insert into tourneo_private.journal_admin(acteur_id,cible_id,action,motif,avant,apres)values(auth.uid(),p_user,case when p_actif then 'expert_offert'else 'cadeau_retire'end,trim(p_motif),avant,jsonb_build_object('actif',p_actif));
end$$;
create function public.tourneo_admin_cadeau(p_user uuid,p_actif boolean,p_motif text)returns void language sql security invoker set search_path='' as $$select tourneo_private.admin_cadeau(p_user,p_actif,p_motif)$$;
create function tourneo_private.admin_role(p_user uuid,p_role text,p_motif text)returns void language plpgsql security definer set search_path='' as $$declare ancien text;begin
 if tourneo_private.role_admin()is distinct from 'superadmin'then raise exception 'Accès super administrateur requis';end if;
 if p_role is not null and p_role not in('admin','superadmin')then raise exception 'Rôle invalide';end if;
 if p_motif is null or char_length(trim(p_motif))not between 3 and 300 then raise exception 'Motif requis (3 à 300 caractères)';end if;
 if not exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null)then raise exception 'Compte confirmé introuvable';end if;
 perform pg_advisory_xact_lock(hashtext('tourneo-superadmins'));
 select role into ancien from tourneo_private.administrateurs where user_id=p_user;
 if ancien='superadmin'and p_role is distinct from 'superadmin'and(select count(*)from tourneo_private.administrateurs where role='superadmin')<=1 then raise exception 'Le dernier super administrateur doit être conservé';end if;
 if p_role is null then delete from tourneo_private.administrateurs where user_id=p_user;else insert into tourneo_private.administrateurs(user_id,role)values(p_user,p_role)on conflict(user_id)do update set role=excluded.role;end if;
 insert into tourneo_private.journal_admin(acteur_id,cible_id,action,motif,avant,apres)values(auth.uid(),p_user,'role_admin',trim(p_motif),jsonb_build_object('role',ancien),jsonb_build_object('role',p_role));
end$$;
create function public.tourneo_admin_role(p_user uuid,p_role text,p_motif text)returns void language sql security invoker set search_path='' as $$select tourneo_private.admin_role(p_user,p_role,p_motif)$$;
create function tourneo_private.admin_journal(p_page integer)returns jsonb language plpgsql stable security definer set search_path='' as $$declare resultat jsonb;begin
 if tourneo_private.role_admin()is null then raise exception 'Accès administrateur requis';end if;
 if p_page is null or p_page<0 or p_page>10000 then raise exception 'Page invalide';end if;
 select coalesce(jsonb_agg(to_jsonb(q)),'[]')into resultat from(select j.id,j.created_at,j.action,j.motif,j.avant,j.apres,a.email as acteur,c.email as cible from tourneo_private.journal_admin j left join auth.users a on a.id=j.acteur_id left join auth.users c on c.id=j.cible_id order by j.created_at desc,j.id limit 50 offset p_page*50)q;return resultat;
end$$;
create function public.tourneo_admin_journal(p_page integer default 0)returns jsonb language sql stable security invoker set search_path='' as $$select tourneo_private.admin_journal(p_page)$$;
revoke all on function public.tourneo_mon_role_admin(),tourneo_private.role_admin(),public.tourneo_mon_offre(),tourneo_private.mon_offre(),public.tourneo_admin_tableau(timestamptz,timestamptz),tourneo_private.admin_tableau(timestamptz,timestamptz),public.tourneo_admin_comptes(text,integer),tourneo_private.admin_comptes(text,integer),public.tourneo_admin_cadeau(uuid,boolean,text),tourneo_private.admin_cadeau(uuid,boolean,text),public.tourneo_admin_role(uuid,text,text),tourneo_private.admin_role(uuid,text,text),public.tourneo_admin_journal(integer),tourneo_private.admin_journal(integer)from public,anon;
grant execute on function public.tourneo_mon_role_admin(),tourneo_private.role_admin(),public.tourneo_mon_offre(),tourneo_private.mon_offre(),public.tourneo_admin_tableau(timestamptz,timestamptz),tourneo_private.admin_tableau(timestamptz,timestamptz),public.tourneo_admin_comptes(text,integer),tourneo_private.admin_comptes(text,integer),public.tourneo_admin_cadeau(uuid,boolean,text),tourneo_private.admin_cadeau(uuid,boolean,text),public.tourneo_admin_role(uuid,text,text),tourneo_private.admin_role(uuid,text,text),public.tourneo_admin_journal(integer),tourneo_private.admin_journal(integer)to authenticated;

-- A single final report per tournament, generated only after organizer validation.
alter table public.tourneo_notifications drop constraint tourneo_notifications_type_check;
alter table public.tourneo_notifications add constraint tourneo_notifications_type_check check(type in('inscription','statut_inscription','arbitrage','score','bilan'));
create unique index notification_bilan_unique on public.tourneo_notifications(tournoi_id,user_id)where type='bilan';
create table public.tourneo_bilans(tournoi_id uuid primary key references public.tournois(id)on delete cascade,id uuid not null unique,user_id uuid not null references auth.users(id)on delete cascade,poster_path text not null unique,created_at timestamptz not null default now(),check(poster_path=user_id::text||'/tournois/'||tournoi_id::text||'/bilan-'||id::text||'.png'));
alter table public.tourneo_bilans enable row level security;
revoke all on public.tourneo_bilans from public,anon,authenticated;
grant select on public.tourneo_bilans to authenticated;
create policy bilan_lecture on public.tourneo_bilans for select to authenticated using(user_id=(select auth.uid()));
create function tourneo_private.bilan_etat(p_tournoi uuid)returns jsonb language plpgsql stable security definer set search_path='' as $$declare t public.tournois;begin
 select * into t from public.tournois where id=p_tournoi and user_id=(select auth.uid());if not found then raise exception 'Accès organisateur requis';end if;
 return jsonb_build_object('existe',exists(select 1 from public.tourneo_bilans where tournoi_id=t.id),'termine',coalesce(t.donnees->>'termine','false')='true','revision',t.revision,'email_disponible',coalesce((select email_disponible from tourneo_private.notifications_config where singleton),false),'photos_partagees',exists(select 1 from public.tourneo_album_config where tournoi_id=t.id and partage and(t.photos_expirent_at is null or t.photos_expirent_at>now())),'comptes_notifies',(select count(*)from public.tourneo_notifications where tournoi_id=t.id and type='bilan'),'emails_en_attente',(select count(*)from public.tourneo_envois e join public.tourneo_notifications n on n.id=e.source_id where e.source='notification'and n.tournoi_id=t.id and n.type='bilan'and e.canal='email'and e.statut in('attente','traitement')),'emails_echecs',(select count(*)from public.tourneo_envois e join public.tourneo_notifications n on n.id=e.source_id where e.source='notification'and n.tournoi_id=t.id and n.type='bilan'and e.canal='email'and e.statut='echec'),'emails_acceptes',(select count(*)from public.tourneo_envois e join public.tourneo_notifications n on n.id=e.source_id where e.source='notification'and n.tournoi_id=t.id and n.type='bilan'and e.canal='email'and e.statut='transmis'));
end$$;
create function public.tourneo_bilan_etat(p_tournoi uuid)returns jsonb language sql stable security invoker set search_path='' as $$select tourneo_private.bilan_etat(p_tournoi)$$;
create function tourneo_private.publier_bilan(p_tournoi uuid,p_bilan uuid,p_revision bigint)returns jsonb language plpgsql security definer set search_path='' as $$declare t public.tournois;ident uuid;dest uuid;chemin text;begin
 perform pg_advisory_xact_lock(hashtext(p_tournoi::text));select * into t from public.tournois where id=p_tournoi and user_id=(select auth.uid())for update;if not found then raise exception 'Accès organisateur requis';end if;
 if exists(select 1 from public.tourneo_bilans where tournoi_id=t.id)then return tourneo_private.bilan_etat(t.id);end if;
 if t.revision is distinct from p_revision then raise exception 'Le tournoi a changé. Rechargez avant de diffuser le bilan.';end if;
 if coalesce(t.donnees->>'termine','false')<>'true'or coalesce(t.donnees->>'cree','false')<>'true'or jsonb_array_length(coalesce(t.donnees->'matchs','[]'))=0 or exists(select 1 from jsonb_array_elements(t.donnees->'matchs')m where not coalesce(t.donnees->'matchsValides','[]')@>jsonb_build_array(m->'id'))then raise exception 'Tous les résultats doivent être validés';end if;
 if(select count(*)from public.tourneo_bilans where user_id=auth.uid()and created_at>now()-interval '1 hour')>=10 then raise exception 'Diffusion temporairement limitée. Réessayez plus tard.';end if;
 chemin:=auth.uid()::text||'/tournois/'||t.id::text||'/bilan-'||p_bilan::text||'.png';if p_bilan is null or not exists(select 1 from storage.objects where bucket_id='tourneo-media'and name=chemin)then raise exception 'Affiche finale non transférée';end if;
 insert into public.tourneo_bilans(tournoi_id,id,user_id,poster_path)values(t.id,p_bilan,auth.uid(),chemin);
 for dest in select distinct u.id from auth.users u where u.email_confirmed_at is not null and u.id in(
 select t.user_id union select a.user_id from public.tourneo_arbitres a where a.tournoi_id=t.id union select i.user_id from public.tourneo_inscriptions i where i.tournoi_id=t.id and i.statut='accepte'and i.user_id is not null union select case when coalesce(e->>'profilId',e->>'id')~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'then coalesce(e->>'profilId',e->>'id')::uuid end from jsonb_array_elements(coalesce(t.donnees->'equipes','[]'))e
 )and coalesce((select notifications_sportives from public.tourneo_preferences where user_id=u.id),true)loop
 insert into public.tourneo_notifications(user_id,tournoi_id,type,message)values(dest,t.id,'bilan','Le tournoi est terminé. Les résultats et le bilan final sont disponibles.')on conflict do nothing;
 end loop;return tourneo_private.bilan_etat(t.id);
end$$;
create function public.tourneo_publier_bilan(p_tournoi uuid,p_bilan uuid,p_revision bigint)returns jsonb language sql security invoker set search_path='' as $$select tourneo_private.publier_bilan(p_tournoi,p_bilan,p_revision)$$;
revoke all on function public.tourneo_bilan_etat(uuid),tourneo_private.bilan_etat(uuid),public.tourneo_publier_bilan(uuid,uuid,bigint),tourneo_private.publier_bilan(uuid,uuid,bigint)from public,anon;
grant execute on function public.tourneo_bilan_etat(uuid),tourneo_private.bilan_etat(uuid),public.tourneo_publier_bilan(uuid,uuid,bigint),tourneo_private.publier_bilan(uuid,uuid,bigint)to authenticated;

-- Claims carry final-report metadata; reading the in-app message does not cancel its email.
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


-- Only a coarse range of confirmed accounts. No user identifiers or anonymous visitor tracking.
create function tourneo_private.communaute_publique()returns jsonb language plpgsql stable security definer set search_path='' as $$declare n bigint;pas bigint;begin
 select count(*)into n from auth.users where email_confirmed_at is not null and deleted_at is null and not coalesce(is_anonymous,false)and(banned_until is null or banned_until<=now());
 pas:=case when n<100 then 10 when n<1000 then 100 else 1000 end;
 return jsonb_build_object('minimum',(n/pas)*pas,'maximum',(n/pas)*pas+pas-1,'mesure','comptes_confirmes');
end$$;
create function public.tourneo_communaute_publique()returns jsonb language sql stable security invoker set search_path='' as $$select tourneo_private.communaute_publique()$$;
revoke all on function public.tourneo_communaute_publique(),tourneo_private.communaute_publique()from public;
grant execute on function public.tourneo_communaute_publique(),tourneo_private.communaute_publique()to anon,authenticated;

-- Moderation is limited to albums already explicitly shared. No privilege to private originals.
create function tourneo_private.admin_albums_partages(p_page integer)returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if tourneo_private.role_admin()is distinct from 'superadmin'then raise exception 'Accès super administrateur requis';end if;
 if p_page is null or p_page<0 or p_page>10000 then raise exception 'Page invalide';end if;
 return(select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb)from(select t.id,t.nom,count(p.photo_id)as photos,max(a.created_at)as derniere_photo from public.tournois t join public.tourneo_album_config c on c.tournoi_id=t.id join public.tourneo_album_partages p on p.tournoi_id=t.id join public.tourneo_album_photos a on a.id=p.photo_id where c.partage and p.apercu_path is not null and(t.photos_expirent_at is null or t.photos_expirent_at>now())group by t.id,t.nom order by max(a.created_at)desc,t.id limit 30 offset p_page*30)q);
end$$;
create function tourneo_private.admin_ouvrir_album(p_tournoi uuid,p_motif text)returns jsonb language plpgsql security definer set search_path='' as $$declare r jsonb;begin
 if tourneo_private.role_admin()is distinct from 'superadmin'then raise exception 'Accès super administrateur requis';end if;
 if p_motif is null or char_length(trim(p_motif))not between 3 and 300 then raise exception 'Motif requis (3 à 300 caractères)';end if;
 r:=tourneo_private.album_public(p_tournoi);
 if not coalesce((r->>'actif')::boolean,false)then raise exception 'Album non partagé ou expiré';end if;
 insert into tourneo_private.journal_admin(acteur_id,cible_id,action,motif,apres)select auth.uid(),t.user_id,'consultation_album_partage',trim(p_motif),jsonb_build_object('tournoi_id',p_tournoi,'fin_consultation',now()+interval '5 minutes')from public.tournois t where t.id=p_tournoi;
 -- No quality download paths are needed for moderation.
 return jsonb_build_object('tournoi_id',p_tournoi,'expire_at',now()+interval '5 minutes','photos',coalesce((select jsonb_agg(jsonb_build_object('id',p->>'id','path',p->>'path','legende',p->>'legende'))from jsonb_array_elements(r->'photos')p),'[]'::jsonb));
end$$;
create function public.tourneo_admin_albums_partages(p_page integer default 0)returns jsonb language sql stable security invoker set search_path='' as $$select tourneo_private.admin_albums_partages(p_page)$$;
create function public.tourneo_admin_ouvrir_album(p_tournoi uuid,p_motif text)returns jsonb language sql security invoker set search_path='' as $$select tourneo_private.admin_ouvrir_album(p_tournoi,p_motif)$$;
revoke all on function public.tourneo_admin_albums_partages(integer),tourneo_private.admin_albums_partages(integer),public.tourneo_admin_ouvrir_album(uuid,text),tourneo_private.admin_ouvrir_album(uuid,text)from public,anon;
grant execute on function public.tourneo_admin_albums_partages(integer),tourneo_private.admin_albums_partages(integer),public.tourneo_admin_ouvrir_album(uuid,text),tourneo_private.admin_ouvrir_album(uuid,text)to authenticated;


-- Internal inbox. Messages are delivered only by an explicitly confirmed admin action.
create table tourneo_private.communications(
 id uuid primary key, auteur_id uuid references auth.users(id) on delete set null,
 titre text not null check(char_length(trim(titre)) between 3 and 120),
 contenu text not null check(char_length(trim(contenu)) between 3 and 4000),
 categorie text not null check(categorie in('information','promotion')),
 destinataires integer not null default 0,created_at timestamptz not null default now()
);
alter table tourneo_private.communications enable row level security;
revoke all on tourneo_private.communications from public,anon,authenticated;
create table public.tourneo_messages(
 id uuid primary key default gen_random_uuid(),communication_id uuid not null references tourneo_private.communications(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,titre text not null,contenu text not null,
 categorie text not null check(categorie in('information','promotion')),lu boolean not null default false,
 created_at timestamptz not null default now(),unique(communication_id,user_id)
);
create index messages_destinataire_date on public.tourneo_messages(user_id,created_at desc);
alter table public.tourneo_messages enable row level security;
revoke all on public.tourneo_messages from public,anon,authenticated;
grant select,update(lu) on public.tourneo_messages to authenticated;
create policy messages_lecture on public.tourneo_messages for select to authenticated using(user_id=(select auth.uid()));
create policy messages_lus on public.tourneo_messages for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create function tourneo_private.messages_apercu(p_categorie text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare n integer;begin
 if auth.uid() is null or tourneo_private.role_admin() is distinct from 'superadmin' then raise exception 'Accès super administrateur requis';end if;
 if p_categorie is null or p_categorie not in('information','promotion')then raise exception 'Catégorie invalide';end if;
 select count(*) into n from auth.users u where u.deleted_at is null and u.email_confirmed_at is not null and(u.banned_until is null or u.banned_until<now())and(p_categorie='information'or exists(select 1 from public.tourneo_preferences p where p.user_id=u.id and p.communications_tourneo));
 return jsonb_build_object('destinataires',n,'categorie',p_categorie);
end $$;
create function tourneo_private.messages_envoyer(p_id uuid,p_titre text,p_contenu text,p_categorie text)returns jsonb language plpgsql security definer set search_path='' as $$
declare c tourneo_private.communications;n integer;begin
 perform tourneo_private.messages_apercu(p_categorie);
 if p_id is null or char_length(trim(coalesce(p_titre,'')))not between 3 and 120 or char_length(trim(coalesce(p_contenu,'')))not between 3 and 4000 then raise exception 'Titre ou contenu invalide';end if;
 perform pg_advisory_xact_lock(hashtext(p_id::text));
 select * into c from tourneo_private.communications where id=p_id;
 if found then
  if c.auteur_id is distinct from auth.uid() or c.titre<>trim(p_titre)or c.contenu<>trim(p_contenu)or c.categorie<>p_categorie then raise exception 'Identifiant déjà utilisé';end if;
  return jsonb_build_object('destinataires',c.destinataires,'id',c.id);
 end if;
 if(select count(*) from tourneo_private.communications where auteur_id=auth.uid() and created_at>now()-interval '1 hour')>=5 then raise exception 'Cinq diffusions par heure maximum';end if;
 insert into tourneo_private.communications(id,auteur_id,titre,contenu,categorie)values(p_id,auth.uid(),trim(p_titre),trim(p_contenu),p_categorie);
 insert into public.tourneo_messages(communication_id,user_id,titre,contenu,categorie)
 select p_id,u.id,trim(p_titre),trim(p_contenu),p_categorie from auth.users u where u.deleted_at is null and u.email_confirmed_at is not null and(u.banned_until is null or u.banned_until<now())and(p_categorie='information'or exists(select 1 from public.tourneo_preferences p where p.user_id=u.id and p.communications_tourneo));
 get diagnostics n=row_count;
 update tourneo_private.communications set destinataires=n where id=p_id;
 return jsonb_build_object('id',p_id,'destinataires',n);
end $$;
create function tourneo_private.messages_historique()returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid()is null or tourneo_private.role_admin() is distinct from 'superadmin'then raise exception 'Accès super administrateur requis';end if;
 return coalesce((select jsonb_agg(to_jsonb(c)order by c.created_at desc)from(select id,titre,categorie,destinataires,created_at from tourneo_private.communications order by created_at desc limit 20)c),'[]');
end $$;
create function public.tourneo_admin_messages_apercu(p_categorie text)returns jsonb language sql stable security invoker set search_path='' as $$select tourneo_private.messages_apercu(p_categorie)$$;
create function public.tourneo_admin_messages_envoyer(p_id uuid,p_titre text,p_contenu text,p_categorie text)returns jsonb language sql security invoker set search_path='' as $$select tourneo_private.messages_envoyer(p_id,p_titre,p_contenu,p_categorie)$$;
create function public.tourneo_admin_messages_historique()returns jsonb language sql stable security invoker set search_path='' as $$select tourneo_private.messages_historique()$$;
revoke all on function tourneo_private.messages_apercu(text),tourneo_private.messages_envoyer(uuid,text,text,text),tourneo_private.messages_historique(),public.tourneo_admin_messages_apercu(text),public.tourneo_admin_messages_envoyer(uuid,text,text,text),public.tourneo_admin_messages_historique() from public,anon;
grant execute on function tourneo_private.messages_apercu(text),tourneo_private.messages_envoyer(uuid,text,text,text),tourneo_private.messages_historique(),public.tourneo_admin_messages_apercu(text),public.tourneo_admin_messages_envoyer(uuid,text,text,text),public.tourneo_admin_messages_historique() to authenticated;

-- Optional 15/30-minute reminders. No reminder is sent until an organiser opts in.
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

commit;
