begin;
create table if not exists public.tourneo_arbitres (
  tournoi_id uuid not null references public.tournois(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key(tournoi_id,user_id)
);
create table if not exists public.tourneo_scores_proposes (
  tournoi_id uuid not null references public.tournois(id) on delete cascade,
  match_id integer not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  score1 integer not null check(score1 between 0 and 1000000),
  score2 integer not null check(score2 between 0 and 1000000),
  statut text not null default 'propose' check(statut in ('propose','importe','ecarte')),
  updated_at timestamptz not null default now(),
  primary key(tournoi_id,match_id,user_id)
);
alter table public.tourneo_arbitres enable row level security;
alter table public.tourneo_scores_proposes enable row level security;
revoke all on public.tourneo_arbitres,public.tourneo_scores_proposes from anon,authenticated;
grant select,delete on public.tourneo_arbitres to authenticated;
grant select,update on public.tourneo_scores_proposes to authenticated;
drop policy if exists arbitres_lecture on public.tourneo_arbitres;
create policy arbitres_lecture on public.tourneo_arbitres for select to authenticated using(user_id=auth.uid() or exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=auth.uid()));
drop policy if exists arbitres_retrait on public.tourneo_arbitres;
create policy arbitres_retrait on public.tourneo_arbitres for delete to authenticated using(exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=auth.uid()));
drop policy if exists propositions_lecture on public.tourneo_scores_proposes;
create policy propositions_lecture on public.tourneo_scores_proposes for select to authenticated using(user_id=auth.uid() or exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=auth.uid()));
drop policy if exists propositions_traitement on public.tourneo_scores_proposes;
create policy propositions_traitement on public.tourneo_scores_proposes for update to authenticated using(exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=auth.uid())) with check(exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=auth.uid()));

create or replace function public.tourneo_ajouter_arbitre(p_tournoi uuid,p_code text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare t public.tournois; joueur uuid;
begin
  select * into t from public.tournois where id=p_tournoi for update;
  if not found or auth.uid() is null or t.user_id is distinct from auth.uid() then raise exception 'Accès organisateur requis';end if;
  select id into joueur from public.profiles where player_code=upper(trim(p_code));
  if joueur is null then raise exception 'Code joueur introuvable';end if;
  insert into public.tourneo_arbitres(tournoi_id,user_id)values(p_tournoi,joueur)on conflict do nothing;
end $$;
create or replace function public.tourneo_proposer_score(p_tournoi uuid,p_match integer,p_score1 integer,p_score2 integer)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare t public.tournois;
begin
  select * into t from public.tournois where id=p_tournoi for update;
  if not found or auth.uid() is null or not exists(select 1 from public.tourneo_arbitres where tournoi_id=p_tournoi and user_id=auth.uid())then raise exception 'Accès arbitre requis';end if;
  if not exists(select 1 from jsonb_array_elements(t.donnees->'matchs')m where (m->>'id')::integer=p_match)then raise exception 'Match introuvable';end if;
  if coalesce(t.donnees->'matchsValides','[]'::jsonb)@>jsonb_build_array(p_match)then raise exception 'Le résultat est déjà validé';end if;
  if t.donnees->'optionsV2'->>'score'='sets' then raise exception 'Les manches doivent être saisies et validées par l’organisateur';end if;
  if p_score1<0 or p_score2<0 or p_score1>1000000 or p_score2>1000000 then raise exception 'Score invalide';end if;
  insert into public.tourneo_scores_proposes(tournoi_id,match_id,user_id,score1,score2)values(p_tournoi,p_match,auth.uid(),p_score1,p_score2)
  on conflict(tournoi_id,match_id,user_id)do update set score1=excluded.score1,score2=excluded.score2,statut='propose',updated_at=now();
end $$;
create or replace function public.tourneo_mes_arbitrages()
returns jsonb language sql security definer set search_path=public,pg_temp as $$
select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'nom',t.nom,'equipes',t.donnees->'equipes','matchs',t.donnees->'matchs','valides',t.donnees->'matchsValides','score',t.donnees->'optionsV2'->>'score')),'[]'::jsonb)
from public.tournois t join public.tourneo_arbitres a on a.tournoi_id=t.id where a.user_id=auth.uid() and auth.uid() is not null;
$$;
revoke all on function public.tourneo_ajouter_arbitre(uuid,text),public.tourneo_proposer_score(uuid,integer,integer,integer),public.tourneo_mes_arbitrages()from public;
grant execute on function public.tourneo_ajouter_arbitre(uuid,text),public.tourneo_proposer_score(uuid,integer,integer,integer),public.tourneo_mes_arbitrages()to authenticated;
commit;
