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
select cron.schedule('tourneo-rappels-avant-tournoi','* * * * *','select tourneo_private.envoyer_rappels();');

-- Public city display is a separate choice; old private city values stay private.
alter table public.profiles add column ville_publique boolean not null default false;
create function tourneo_private.profils_identites(p_code text,p_ids uuid[],p_recherche text)returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid()is null then raise exception 'Connexion requise';end if;
 if p_recherche is not null and char_length(trim(p_recherche))<3 then return '[]';end if;
 return coalesce((select jsonb_agg(to_jsonb(p)) from(select id,display_name,player_code,null::text as avatar_url,favorite_color,case when ville_publique then nullif(trim(city),'')else null end as city from public.profiles where(p_code is not null and player_code=upper(trim(p_code)))or(cardinality(p_ids)<=256 and id=any(p_ids))or(p_recherche is not null and display_name ilike '%'||left(trim(p_recherche),60)||'%')order by display_name limit(case when p_recherche is not null then 10 else 256 end))p),'[]');
end $$;
create function public.tourneo_profils_identites(p_code text default null,p_ids uuid[] default null,p_recherche text default null)returns jsonb language sql stable security invoker set search_path='' as $$select tourneo_private.profils_identites(p_code,p_ids,p_recherche)$$;
revoke all on function tourneo_private.profils_identites(text,uuid[],text),public.tourneo_profils_identites(text,uuid[],text) from public,anon;
grant execute on function tourneo_private.profils_identites(text,uuid[],text),public.tourneo_profils_identites(text,uuid[],text) to authenticated;
