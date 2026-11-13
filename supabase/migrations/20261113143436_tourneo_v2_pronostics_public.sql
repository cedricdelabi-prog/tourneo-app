-- Free predictions only. Entries and rules are frozen before tournament launch.
create table public.tourneo_pronostics_config(
 tournoi_id uuid primary key references public.tournois(id)on delete cascade,
 actif boolean not null default false,
 mode text not null check(mode in('vainqueur','podium_ordre','podium_libre','top5_ordre','top5_libre')),
 equipes jsonb not null,
 cloture_at timestamptz,
 ferme_at timestamptz,
 classement text[],
 classement_revision bigint,
 created_at timestamptz not null default now()
);
create table public.tourneo_pronostics_votes(
 tournoi_id uuid not null references public.tourneo_pronostics_config(tournoi_id)on delete cascade,
 user_id uuid not null references auth.users(id)on delete cascade,
 pseudo text not null check(char_length(pseudo)between 1 and 80),
 choix text[] not null check(cardinality(choix)between 1 and 5),
 updated_at timestamptz not null default now(),
 primary key(tournoi_id,user_id)
);
create index pronostics_compte on public.tourneo_pronostics_votes(user_id);
alter table public.tourneo_pronostics_config enable row level security;
alter table public.tourneo_pronostics_votes enable row level security;
revoke all on public.tourneo_pronostics_config,public.tourneo_pronostics_votes from public,anon,authenticated;
grant select on public.tourneo_pronostics_config,public.tourneo_pronostics_votes to authenticated;
create policy pronostics_config_owner on public.tourneo_pronostics_config for select to authenticated using(exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=(select auth.uid())));
create policy pronostics_vote_personnel on public.tourneo_pronostics_votes for select to authenticated using(user_id=(select auth.uid()));

create function tourneo_private.pronostics_equipes(p_id uuid,p_donnees jsonb)returns jsonb language sql immutable set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',tourneo_private.reference_publique(p_id,e->>'id'),'nom',left(coalesce(e->>'nom','Participant'),100))order by e->>'id'),'[]')from jsonb_array_elements(coalesce(p_donnees->'equipes','[]'))e;
$$;
create function tourneo_private.pronostics_points(p_choix text[],p_classement text[],p_mode text)returns integer language sql immutable set search_path='' as $$
 select coalesce(sum(case when x=any(p_classement[1:cardinality(p_choix)])then 1 else 0 end+case when p_mode in('vainqueur','podium_ordre','top5_ordre')and x=p_classement[i]then 2 else 0 end),0)::integer from unnest(p_choix)with ordinality as c(x,i);
$$;
create function tourneo_private.pronostics_lecture(p_id uuid)returns jsonb language plpgsql stable security definer set search_path='' as $$
declare t public.tournois;c public.tourneo_pronostics_config;resultat jsonb;compatible boolean;publie boolean;begin
 select * into t from public.tournois where id=p_id;
 if not found then return jsonb_build_object('actif',false);end if;
 select * into c from public.tourneo_pronostics_config where tournoi_id=p_id;
 if not found or(not c.actif and t.user_id is distinct from auth.uid())then return jsonb_build_object('actif',false,'proprietaire',t.user_id=auth.uid(),'demarre',coalesce(t.donnees->>'cree','false')='true','nom',t.nom);end if;
 compatible:=(select array_agg(e->>'id'order by e->>'id')from jsonb_array_elements(c.equipes)e)is not distinct from(select array_agg(e->>'id'order by e->>'id')from jsonb_array_elements(tourneo_private.pronostics_equipes(t.id,t.donnees))e);
 publie:=compatible and c.classement_revision=t.revision and c.classement is not null and coalesce(t.donnees->>'termine','false')='true';
 resultat:=jsonb_build_object('actif',c.actif,'proprietaire',t.user_id=auth.uid(),'nom',t.nom,'mode',c.mode,'equipes',c.equipes,'cloture_at',c.cloture_at,'ferme',c.ferme_at is not null or coalesce(c.cloture_at<=now(),false)or coalesce(t.donnees->>'cree','false')='true','demarre',coalesce(t.donnees->>'cree','false')='true','compatible',compatible,'publie',coalesce(publie,false),'nombre',(select count(*)from public.tourneo_pronostics_votes where tournoi_id=t.id),'mon_choix',(select to_jsonb(choix)from public.tourneo_pronostics_votes where tournoi_id=t.id and user_id=auth.uid()),'classement','[]'::jsonb);
 if publie then
  with scores as(select user_id,pseudo,tourneo_private.pronostics_points(choix,c.classement,c.mode)as points from public.tourneo_pronostics_votes where tournoi_id=t.id),rangs as(select *,rank()over(order by points desc)as rang from scores)
  select resultat||jsonb_build_object('classement',coalesce((select jsonb_agg(jsonb_build_object('pseudo',pseudo,'points',points,'rang',rang)order by rang,pseudo)from(select * from rangs order by rang,pseudo limit 100)l),'[]'),'mon_rang',(select jsonb_build_object('rang',rang,'points',points)from rangs where user_id=auth.uid()))into resultat;
 end if;return resultat;
end$$;
create function public.tourneo_pronostics_lecture(p_id uuid)returns jsonb language sql stable security invoker set search_path='' as $$select tourneo_private.pronostics_lecture(p_id)$$;

create function tourneo_private.pronostics_configurer(p_id uuid,p_actif boolean,p_mode text,p_cloture timestamptz default null)returns jsonb language plpgsql security definer set search_path='' as $$
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
 if exists(select 1 from public.tourneo_pronostics_votes where tournoi_id=p_id)and(c.mode is distinct from p_mode or c.equipes is distinct from liste_equipes or c.cloture_at is distinct from p_cloture)then raise exception 'Des pronostics existent déjà : le format, les participants et la clôture sont figés';end if;
 insert into public.tourneo_pronostics_config(tournoi_id,actif,mode,equipes,cloture_at)values(p_id,coalesce(p_actif,false),p_mode,liste_equipes,p_cloture)on conflict(tournoi_id)do update set actif=excluded.actif,mode=excluded.mode,equipes=excluded.equipes,cloture_at=excluded.cloture_at;
 return tourneo_private.pronostics_lecture(p_id);
end$$;
create function public.tourneo_pronostics_configurer(p_id uuid,p_actif boolean,p_mode text,p_cloture timestamptz default null)returns jsonb language sql security invoker set search_path='' as $$select tourneo_private.pronostics_configurer(p_id,p_actif,p_mode,p_cloture)$$;

create function tourneo_private.pronostics_voter(p_id uuid,p_choix text[])returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.tournois;c public.tourneo_pronostics_config;n integer;alias text;begin
 if auth.uid()is null or not exists(select 1 from auth.users where id=auth.uid()and email_confirmed_at is not null)then raise exception 'Connectez-vous avec un compte confirmé pour participer';end if;
 select * into t from public.tournois where id=p_id for update;
 select * into c from public.tourneo_pronostics_config where tournoi_id=p_id for update;
 if c.tournoi_id is null or not c.actif or c.ferme_at is not null or c.cloture_at<=now()or coalesce(t.donnees->>'cree','false')='true'then raise exception 'Les pronostics sont fermés';end if;
 if (select array_agg(e->>'id'order by e->>'id')from jsonb_array_elements(c.equipes)e)is distinct from(select array_agg(e->>'id'order by e->>'id')from jsonb_array_elements(tourneo_private.pronostics_equipes(t.id,t.donnees))e)then raise exception 'Les participants ont changé. Le jeu doit être vérifié par l’organisateur';end if;
 n:=case when c.mode like 'podium%'then 3 when c.mode like 'top5%'then 5 else 1 end;
 if p_choix is null or cardinality(p_choix)<>n or(select count(distinct x)from unnest(p_choix)x)<>n or exists(select 1 from unnest(p_choix)x where not exists(select 1 from jsonb_array_elements(c.equipes)e where e->>'id'=x))then raise exception 'Choisissez des participants différents dans la liste';end if;
 if not exists(select 1 from public.tourneo_pronostics_votes where tournoi_id=p_id and user_id=auth.uid())and(select count(*)from public.tourneo_pronostics_votes where tournoi_id=p_id)>=10000 then raise exception 'La capacité du jeu est atteinte';end if;
 select left(coalesce(nullif(trim(display_name),''),'Spectateur'),80)into alias from public.profiles where id=auth.uid();
 insert into public.tourneo_pronostics_votes(tournoi_id,user_id,pseudo,choix)values(p_id,auth.uid(),coalesce(alias,'Spectateur'),p_choix)on conflict(tournoi_id,user_id)do update set choix=excluded.choix,pseudo=excluded.pseudo,updated_at=now();
 return tourneo_private.pronostics_lecture(p_id);
end$$;
create function public.tourneo_pronostics_voter(p_id uuid,p_choix text[])returns jsonb language sql security invoker set search_path='' as $$select tourneo_private.pronostics_voter(p_id,p_choix)$$;

create function tourneo_private.pronostics_publier(p_id uuid,p_revision bigint,p_classement text[])returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.tournois;c public.tourneo_pronostics_config;begin
 select * into t from public.tournois where id=p_id and user_id=auth.uid()for update;if not found then raise exception 'Accès organisateur requis';end if;
 select * into c from public.tourneo_pronostics_config where tournoi_id=p_id for update;
 if c.tournoi_id is null then return jsonb_build_object('actif',false);end if;
 if t.revision is distinct from p_revision then raise exception 'Actualisez le tournoi avant de publier';end if;
 if coalesce(t.donnees->>'termine','false')<>'true'or coalesce(t.donnees->>'cree','false')<>'true'or jsonb_array_length(coalesce(t.donnees->'matchs','[]'))=0 or exists(select 1 from jsonb_array_elements(t.donnees->'matchs')m where not coalesce(t.donnees->'matchsValides','[]')@>jsonb_build_array(m->'id'))then raise exception 'Validez tous les résultats avant de publier';end if;
 p_classement:=array(select tourneo_private.reference_publique(t.id,x)from unnest(p_classement)x);
 if p_classement is null or cardinality(p_classement)<>jsonb_array_length(c.equipes)or(select count(distinct x)from unnest(p_classement)x)<>cardinality(p_classement)or exists(select 1 from unnest(p_classement)x where not exists(select 1 from jsonb_array_elements(c.equipes)e where e->>'id'=x))then raise exception 'Classement incompatible avec les participants du jeu';end if;
 if (select array_agg(e->>'id'order by e->>'id')from jsonb_array_elements(c.equipes)e)is distinct from(select array_agg(e->>'id'order by e->>'id')from jsonb_array_elements(tourneo_private.pronostics_equipes(t.id,t.donnees))e)then raise exception 'Les participants ont changé. Le jeu ne peut pas être classé';end if;
 update public.tourneo_pronostics_config set classement=p_classement,classement_revision=t.revision,ferme_at=coalesce(ferme_at,now())where tournoi_id=p_id;
 return tourneo_private.pronostics_lecture(p_id);
end$$;
create function public.tourneo_pronostics_publier(p_id uuid,p_revision bigint,p_classement text[])returns jsonb language sql security invoker set search_path='' as $$select tourneo_private.pronostics_publier(p_id,p_revision,p_classement)$$;
create function tourneo_private.pronostics_fermer(p_id uuid)returns jsonb language plpgsql security definer set search_path='' as $$begin
 perform 1 from public.tournois where id=p_id and user_id=auth.uid()for update;if not found then raise exception 'Accès organisateur requis';end if;
 update public.tourneo_pronostics_config set ferme_at=coalesce(ferme_at,now())where tournoi_id=p_id;return tourneo_private.pronostics_lecture(p_id);
end$$;
create function public.tourneo_pronostics_fermer(p_id uuid)returns jsonb language sql security invoker set search_path='' as $$select tourneo_private.pronostics_fermer(p_id)$$;
create function tourneo_private.pronostics_suivre_tournoi()returns trigger language plpgsql security definer set search_path='' as $$begin
 update public.tourneo_pronostics_config set ferme_at=case when coalesce(new.donnees->>'cree','false')='true'then coalesce(ferme_at,now())else ferme_at end,classement=null,classement_revision=null where tournoi_id=new.id;return new;
end$$;
create trigger pronostics_fermeture after update of donnees on public.tournois for each row execute function tourneo_private.pronostics_suivre_tournoi();

revoke all on function tourneo_private.pronostics_equipes(uuid,jsonb),tourneo_private.pronostics_points(text[],text[],text),tourneo_private.pronostics_suivre_tournoi()from public,anon,authenticated;
revoke all on function tourneo_private.pronostics_lecture(uuid),public.tourneo_pronostics_lecture(uuid),tourneo_private.pronostics_configurer(uuid,boolean,text,timestamptz),public.tourneo_pronostics_configurer(uuid,boolean,text,timestamptz),tourneo_private.pronostics_voter(uuid,text[]),public.tourneo_pronostics_voter(uuid,text[]),tourneo_private.pronostics_publier(uuid,bigint,text[]),public.tourneo_pronostics_publier(uuid,bigint,text[]),tourneo_private.pronostics_fermer(uuid),public.tourneo_pronostics_fermer(uuid)from public,anon,authenticated;
grant execute on function tourneo_private.pronostics_lecture(uuid),public.tourneo_pronostics_lecture(uuid)to anon,authenticated;
grant execute on function tourneo_private.pronostics_configurer(uuid,boolean,text,timestamptz),public.tourneo_pronostics_configurer(uuid,boolean,text,timestamptz),tourneo_private.pronostics_voter(uuid,text[]),public.tourneo_pronostics_voter(uuid,text[]),tourneo_private.pronostics_publier(uuid,bigint,text[]),public.tourneo_pronostics_publier(uuid,bigint,text[]),tourneo_private.pronostics_fermer(uuid),public.tourneo_pronostics_fermer(uuid)to authenticated;

-- Organizer search uses public display names only, never e-mail or private identity.
create function tourneo_private.chercher_arbitres(p_tournoi uuid,p_nom text)returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not exists(select 1 from public.tournois where id=p_tournoi and user_id=auth.uid())then raise exception 'Accès organisateur requis';end if;
 if char_length(trim(p_nom))not between 3 and 60 then raise exception 'Saisissez au moins 3 caractères du nom affiché';end if;
 return(select coalesce(jsonb_agg(jsonb_build_object('id',id,'display_name',display_name,'player_code',player_code)),'[]')from(select p.id,p.display_name,p.player_code from public.profiles p where p.player_code is not null and position(lower(trim(p_nom))in lower(p.display_name))>0 and not exists(select 1 from public.tourneo_arbitres a where a.tournoi_id=p_tournoi and a.user_id=p.id)order by p.display_name,p.id limit 10)p);
end$$;
create function public.tourneo_chercher_arbitres(p_tournoi uuid,p_nom text)returns jsonb language sql stable security invoker set search_path='' as $$select tourneo_private.chercher_arbitres(p_tournoi,p_nom)$$;
revoke all on function public.tourneo_chercher_arbitres(uuid,text),tourneo_private.chercher_arbitres(uuid,text)from public,anon;
grant execute on function public.tourneo_chercher_arbitres(uuid,text),tourneo_private.chercher_arbitres(uuid,text)to authenticated;
