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

create table tourneo_private.administrateurs(user_id uuid primary key references auth.users(id)on delete cascade,role text not null check(role in('admin','superadmin')),created_at timestamptz not null default now());
create table tourneo_private.acces_offerts(user_id uuid primary key references auth.users(id)on delete cascade,actif boolean not null default true,motif text not null check(char_length(trim(motif))between 3 and 300),accorde_par uuid references auth.users(id)on delete set null,updated_at timestamptz not null default now());
-- Reserved for a future verified payment backend. No checkout or billing provider is enabled.
create table tourneo_private.licences_expert_vie(user_id uuid primary key references auth.users(id)on delete cascade,actif boolean not null default true,reference_achat text unique,attribue_at timestamptz not null default now());
create table tourneo_private.journal_admin(id uuid primary key default gen_random_uuid(),acteur_id uuid references auth.users(id)on delete set null,cible_id uuid references auth.users(id)on delete set null,action text not null,motif text not null check(char_length(trim(motif))between 3 and 300),avant jsonb,apres jsonb,created_at timestamptz not null default now());
alter table tourneo_private.administrateurs enable row level security;
alter table tourneo_private.acces_offerts enable row level security;
alter table tourneo_private.licences_expert_vie enable row level security;
alter table tourneo_private.journal_admin enable row level security;
revoke all on tourneo_private.administrateurs,tourneo_private.acces_offerts,tourneo_private.licences_expert_vie,tourneo_private.journal_admin from public,anon,authenticated;
create function tourneo_private.role_admin()returns text language sql stable security definer set search_path='' as $$select role from tourneo_private.administrateurs where user_id=(select auth.uid())$$;
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
