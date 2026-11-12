-- Apply only to the dedicated Tourneo V2 project. No service-role key in the browser.
begin;
create table if not exists public.tourneo_inscriptions_config (
  tournoi_id uuid primary key references public.tournois(id) on delete cascade,
  ouvert boolean not null default false,
  capacite integer not null default 32 check (capacite between 2 and 256),
  echeance timestamptz,
  validation_manuelle boolean not null default true
);
create table if not exists public.tourneo_inscriptions (
  id uuid primary key default gen_random_uuid(),
  tournoi_id uuid not null references public.tournois(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  jeton uuid not null,
  nom text not null check (char_length(trim(nom)) between 1 and 100),
  type_participant text not null default 'individuel' check (type_participant in ('individuel','equipe')),
  joueurs text[] not null default '{}',
  statut text not null check (statut in ('en_attente','a_valider','accepte','refuse','annule')),
  present boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tournoi_id, jeton),
  check (cardinality(joueurs) <= 12)
);
create unique index if not exists tournoi_inscriptions_nom_actif on public.tourneo_inscriptions(tournoi_id, lower(trim(nom))) where statut not in ('refuse','annule');
create unique index if not exists tournoi_inscriptions_compte_actif on public.tourneo_inscriptions(tournoi_id,user_id) where user_id is not null and statut not in ('refuse','annule');
create index if not exists tournoi_inscriptions_file on public.tourneo_inscriptions(tournoi_id, created_at);
alter table public.tourneo_inscriptions_config enable row level security;
alter table public.tourneo_inscriptions enable row level security;
revoke all on public.tourneo_inscriptions_config, public.tourneo_inscriptions from anon, authenticated;
grant select on public.tourneo_inscriptions_config, public.tourneo_inscriptions to authenticated;
drop policy if exists inscriptions_config_owner on public.tourneo_inscriptions_config;
create policy inscriptions_config_owner on public.tourneo_inscriptions_config for select to authenticated using (exists(select 1 from public.tournois t where t.id = tournoi_id and t.user_id = auth.uid()));
drop policy if exists inscriptions_owner on public.tourneo_inscriptions;
create policy inscriptions_owner on public.tourneo_inscriptions for select to authenticated using (exists(select 1 from public.tournois t where t.id = tournoi_id and t.user_id = auth.uid()));

create or replace function public.tourneo_configurer_inscriptions(p_tournoi uuid, p_ouvert boolean, p_capacite integer, p_echeance timestamptz, p_validation boolean)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare t public.tournois;
begin
  select * into t from public.tournois where id=p_tournoi for update;
  if not found or t.user_id is distinct from auth.uid() or auth.uid() is null then raise exception 'Accès organisateur requis'; end if;
  if coalesce((t.donnees->>'cree')::boolean,false) and p_ouvert then raise exception 'Le tournoi a déjà démarré'; end if;
  if p_capacite < 2 or p_capacite > 256 then raise exception 'Capacité invalide'; end if;
  if p_ouvert and p_echeance is not null and p_echeance <= now() then raise exception 'Échéance passée'; end if;
  insert into public.tourneo_inscriptions_config(tournoi_id,ouvert,capacite,echeance,validation_manuelle) values(p_tournoi,p_ouvert,p_capacite,p_echeance,p_validation)
  on conflict(tournoi_id) do update set ouvert=excluded.ouvert, capacite=excluded.capacite, echeance=excluded.echeance, validation_manuelle=excluded.validation_manuelle;
end $$;

create or replace function public.tourneo_infos_inscriptions(p_tournoi uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare t public.tournois; c public.tourneo_inscriptions_config; places integer;
begin
  select * into t from public.tournois where id=p_tournoi;
  select * into c from public.tourneo_inscriptions_config where tournoi_id=p_tournoi;
  if t.id is null or c.tournoi_id is null then raise exception 'Inscriptions indisponibles'; end if;
  select count(*) into places from public.tourneo_inscriptions where tournoi_id=p_tournoi and statut in ('accepte','a_valider');
  return jsonb_build_object('nom',t.nom,'sport',t.sport,'ouvert',c.ouvert and not coalesce((t.donnees->>'cree')::boolean,false) and (c.echeance is null or c.echeance>now()),'capacite',c.capacite,'echeance',c.echeance,'places_restantes',greatest(0,c.capacite-places-jsonb_array_length(coalesce(t.donnees->'equipes','[]'::jsonb))),'validation_manuelle',c.validation_manuelle);
end $$;

create or replace function public.tourneo_inscrire(p_tournoi uuid, p_jeton uuid, p_nom text, p_type text, p_joueurs text[])
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare t public.tournois; c public.tourneo_inscriptions_config; r public.tourneo_inscriptions; places integer; etat text;
begin
  select * into t from public.tournois where id=p_tournoi for update;
  select * into c from public.tourneo_inscriptions_config where tournoi_id=p_tournoi;
  if t.id is null or c.tournoi_id is null then raise exception 'Inscriptions indisponibles'; end if;
  select * into r from public.tourneo_inscriptions where tournoi_id=p_tournoi and jeton=p_jeton;
  if found then return jsonb_build_object('id',r.id,'nom',r.nom,'statut',r.statut,'present',r.present); end if;
  if p_jeton is null or not c.ouvert or coalesce((t.donnees->>'cree')::boolean,false) or (c.echeance is not null and c.echeance <= now()) then raise exception 'Les inscriptions sont fermées'; end if;
  if p_nom is null or char_length(trim(p_nom)) not between 1 and 100 or p_type not in ('individuel','equipe') or p_type is null then raise exception 'Participant invalide'; end if;
  if cardinality(p_joueurs)>12 or exists(select 1 from unnest(p_joueurs) j where char_length(trim(j)) not between 1 and 100 or j is null) then raise exception 'Liste des joueurs invalide'; end if;
  if exists(select 1 from jsonb_array_elements(coalesce(t.donnees->'equipes','[]'::jsonb)) e where lower(trim(e->>'nom'))=lower(trim(p_nom))) then raise exception 'Ce nom est déjà inscrit'; end if;
  if (select count(*) from public.tourneo_inscriptions where tournoi_id=p_tournoi) >= 1024 then raise exception 'Le nombre maximal de demandes est atteint. Contactez l’organisateur'; end if;
  select count(*) into places from public.tourneo_inscriptions where tournoi_id=p_tournoi and statut in ('accepte','a_valider');
  places:=places+jsonb_array_length(coalesce(t.donnees->'equipes','[]'::jsonb));
  etat:=case when places>=c.capacite then 'en_attente' when c.validation_manuelle then 'a_valider' else 'accepte' end;
  insert into public.tourneo_inscriptions(tournoi_id,user_id,jeton,nom,type_participant,joueurs,statut) values(p_tournoi,auth.uid(),p_jeton,trim(p_nom),p_type,coalesce(p_joueurs,'{}'),etat) returning * into r;
  return jsonb_build_object('id',r.id,'nom',r.nom,'statut',r.statut,'present',r.present);
exception when unique_violation then raise exception 'Ce nom est déjà inscrit';
end $$;

create or replace function public.tourneo_mon_inscription(p_tournoi uuid, p_jeton uuid, p_annuler boolean default false)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare t public.tournois; r public.tourneo_inscriptions;
begin
  select * into t from public.tournois where id=p_tournoi for update;
  select * into r from public.tourneo_inscriptions where tournoi_id=p_tournoi and jeton=p_jeton;
  if not found then return null; end if;
  if p_annuler then
    if coalesce((t.donnees->>'cree')::boolean,false) then raise exception 'Contactez l’organisateur après le démarrage'; end if;
    update public.tourneo_inscriptions set statut='annule',present=false where id=r.id returning * into r;
  end if;
  return jsonb_build_object('id',r.id,'nom',r.nom,'statut',r.statut,'present',r.present);
end $$;

create or replace function public.tourneo_traiter_inscription(p_tournoi uuid, p_id uuid, p_statut text, p_present boolean)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare t public.tournois; c public.tourneo_inscriptions_config; places integer; r public.tourneo_inscriptions;
begin
  select * into t from public.tournois where id=p_tournoi for update;
  if not found or t.user_id is distinct from auth.uid() or auth.uid() is null then raise exception 'Accès organisateur requis'; end if;
  select * into r from public.tourneo_inscriptions where id=p_id and tournoi_id=p_tournoi;
  if not found then raise exception 'Inscription introuvable'; end if;
  if p_statut not in ('accepte','refuse','en_attente','a_valider') or p_statut is null then raise exception 'Statut invalide'; end if;
  if coalesce((t.donnees->>'cree')::boolean,false) and p_statut<>r.statut then raise exception 'Les inscriptions sont closes'; end if;
  if p_statut in ('accepte','a_valider') and r.statut not in ('accepte','a_valider') then
    select * into c from public.tourneo_inscriptions_config where tournoi_id=p_tournoi;
    select count(*) into places from public.tourneo_inscriptions where tournoi_id=p_tournoi and statut in ('accepte','a_valider');
    if places+jsonb_array_length(coalesce(t.donnees->'equipes','[]'::jsonb))>=c.capacite then raise exception 'Capacité atteinte'; end if;
  end if;
  update public.tourneo_inscriptions set statut=p_statut,present=coalesce(p_present,false) and p_statut='accepte' where id=p_id;
end $$;

create or replace function public.tourneo_demarrer(p_tournoi uuid, p_donnees jsonb, p_nom text, p_sport text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare t public.tournois;
begin
  select * into t from public.tournois where id=p_tournoi for update;
  if not found or t.user_id is distinct from auth.uid() or auth.uid() is null then raise exception 'Accès organisateur requis'; end if;
  if coalesce((t.donnees->>'cree')::boolean,false) then raise exception 'Le tournoi a déjà démarré'; end if;
  if jsonb_typeof(p_donnees->'equipes') is distinct from 'array' or jsonb_typeof(p_donnees->'matchs') is distinct from 'array' or char_length(trim(p_nom)) not between 1 and 150 then raise exception 'Configuration du tournoi invalide'; end if;
  if jsonb_array_length(p_donnees->'equipes') not between 2 and 256 then raise exception 'Nombre de participants invalide'; end if;
  if exists(select 1 from public.tourneo_inscriptions r where r.tournoi_id=p_tournoi and r.statut='accepte' and not exists(select 1 from jsonb_array_elements(p_donnees->'equipes') e where e->>'id'='inscription:'||r.id::text)) then raise exception 'Nouvelles inscriptions acceptées : rechargez avant de démarrer'; end if;
  update public.tourneo_inscriptions_config set ouvert=false where tournoi_id=p_tournoi;
  update public.tournois set nom=p_nom,sport=p_sport,donnees=p_donnees||jsonb_build_object('cree',true) where id=p_tournoi;
  return p_tournoi;
end $$;

revoke all on function public.tourneo_configurer_inscriptions(uuid,boolean,integer,timestamptz,boolean), public.tourneo_infos_inscriptions(uuid), public.tourneo_inscrire(uuid,uuid,text,text,text[]), public.tourneo_mon_inscription(uuid,uuid,boolean), public.tourneo_traiter_inscription(uuid,uuid,text,boolean), public.tourneo_demarrer(uuid,jsonb,text,text) from public;
grant execute on function public.tourneo_infos_inscriptions(uuid), public.tourneo_inscrire(uuid,uuid,text,text,text[]), public.tourneo_mon_inscription(uuid,uuid,boolean) to anon,authenticated;
grant execute on function public.tourneo_configurer_inscriptions(uuid,boolean,integer,timestamptz,boolean), public.tourneo_traiter_inscription(uuid,uuid,text,boolean), public.tourneo_demarrer(uuid,jsonb,text,text) to authenticated;
commit;
