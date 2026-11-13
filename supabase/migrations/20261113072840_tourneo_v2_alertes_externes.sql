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
create function tourneo_private.reveiller_notifications()returns bigint language plpgsql security definer set search_path='' as $$declare cle text;begin
 select jeton into cle from tourneo_private.notifications_config;if cle is null then return null;end if;
 return net.http_post(url:='https://kmjfmjhdnokkaiolxiin.supabase.co/functions/v1/notifications-tourneo',headers:=jsonb_build_object('Content-Type','application/json','x-tourneo-token',cle),body:='{}',timeout_milliseconds:=60000);end $$;
revoke all on function tourneo_private.reveiller_notifications()from public,anon,authenticated;
select cron.schedule('tourneo-notifications-minute','* * * * *','select tourneo_private.reveiller_notifications();');

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
