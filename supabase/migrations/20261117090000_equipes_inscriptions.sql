create or replace function public.tourneo_demarrer(p_tournoi uuid, p_donnees jsonb, p_nom text, p_sport text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare t public.tournois;
begin
  select * into t from public.tournois where id=p_tournoi for update;
  if not found or t.user_id is distinct from auth.uid() or auth.uid() is null then raise exception 'Accès organisateur requis'; end if;
  if coalesce((t.donnees->>'cree')::boolean,false) then raise exception 'Le tournoi a déjà démarré'; end if;
  if jsonb_typeof(p_donnees->'equipes') is distinct from 'array' or jsonb_typeof(p_donnees->'matchs') is distinct from 'array' or char_length(trim(p_nom)) not between 1 and 150 then raise exception 'Configuration du tournoi invalide'; end if;
  if jsonb_array_length(p_donnees->'equipes') not between 2 and 256 then raise exception 'Nombre de participants invalide'; end if;
  if exists(select 1 from public.tourneo_inscriptions r where r.tournoi_id=p_tournoi and r.statut='accepte' and not exists(select 1 from jsonb_array_elements(p_donnees->'equipes') e where e->>'id'='inscription:'||r.id::text
    or (r.type_participant='individuel' and r.user_id is not null and e->>'profilId'=r.user_id::text)
    or exists(select 1 from jsonb_array_elements(case when jsonb_typeof(e->'membresOrigine')='array' then e->'membresOrigine' else '[]'::jsonb end) m
      where m->>'id'='inscription:'||r.id::text or (r.type_participant='individuel' and r.user_id is not null and m->>'profilId'=r.user_id::text)))) then raise exception 'Nouvelles inscriptions acceptées : rechargez avant de démarrer'; end if;
  update public.tourneo_inscriptions_config set ouvert=false where tournoi_id=p_tournoi;
  update public.tournois set nom=p_nom,sport=p_sport,donnees=p_donnees||jsonb_build_object('cree',true) where id=p_tournoi;
  return p_tournoi;
end $$;

revoke all on function public.tourneo_demarrer(uuid,jsonb,text,text) from public;
grant execute on function public.tourneo_demarrer(uuid,jsonb,text,text) to authenticated;
