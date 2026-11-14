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
