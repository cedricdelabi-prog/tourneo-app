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

