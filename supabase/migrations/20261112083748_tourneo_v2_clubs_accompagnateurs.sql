create table public.tourneo_groupes (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 nom text not null check(char_length(trim(nom)) between 1 and 100),
 type text not null default 'club' check(type in ('club','accompagnement')),
 created_at timestamptz not null default now()
);
create index tourneo_groupes_owner on public.tourneo_groupes(user_id);
create table public.tourneo_groupe_membres (
 groupe_id uuid not null references public.tourneo_groupes(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('accompagnateur','lecture')),
 primary key(groupe_id,user_id)
);
create index tourneo_groupe_membres_user on public.tourneo_groupe_membres(user_id);
create table public.tourneo_groupe_participants (
 id uuid primary key default gen_random_uuid(),
 groupe_id uuid not null references public.tourneo_groupes(id) on delete cascade,
 nom text not null check(char_length(trim(nom)) between 1 and 100),
 created_at timestamptz not null default now()
);
create unique index tourneo_groupe_nom_unique on public.tourneo_groupe_participants(groupe_id,lower(trim(nom)));
alter table public.tourneo_groupes enable row level security;
alter table public.tourneo_groupe_membres enable row level security;
alter table public.tourneo_groupe_participants enable row level security;
revoke all on public.tourneo_groupes,public.tourneo_groupe_membres,public.tourneo_groupe_participants from anon,authenticated;
grant select,insert,delete on public.tourneo_groupes to authenticated;
grant update(nom) on public.tourneo_groupes to authenticated;
grant select,delete on public.tourneo_groupe_membres to authenticated;
grant select,insert,delete on public.tourneo_groupe_participants to authenticated;
grant update(nom) on public.tourneo_groupe_participants to authenticated;
create function tourneo_private.role_groupe(p_groupe uuid)
returns text language sql stable security definer set search_path=public,pg_temp as $$
 select case when g.user_id=auth.uid() then 'proprietaire' else (select m.role from public.tourneo_groupe_membres m where m.groupe_id=g.id and m.user_id=auth.uid()) end
 from public.tourneo_groupes g where g.id=p_groupe and auth.uid() is not null;
$$;
revoke all on function tourneo_private.role_groupe(uuid) from public,anon;
grant execute on function tourneo_private.role_groupe(uuid) to authenticated;
create policy groupe_read on public.tourneo_groupes for select to authenticated using(tourneo_private.role_groupe(id) is not null);
create policy groupe_insert on public.tourneo_groupes for insert to authenticated with check(user_id=(select auth.uid()));
create policy groupe_update on public.tourneo_groupes for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy groupe_delete on public.tourneo_groupes for delete to authenticated using(user_id=(select auth.uid()));
create policy groupe_membres_read on public.tourneo_groupe_membres for select to authenticated using(user_id=(select auth.uid()) or tourneo_private.role_groupe(groupe_id)='proprietaire');
create policy groupe_membres_delete on public.tourneo_groupe_membres for delete to authenticated using(user_id=(select auth.uid()) or tourneo_private.role_groupe(groupe_id)='proprietaire');
create policy groupe_participants_read on public.tourneo_groupe_participants for select to authenticated using(tourneo_private.role_groupe(groupe_id) is not null);
create policy groupe_participants_insert on public.tourneo_groupe_participants for insert to authenticated with check(tourneo_private.role_groupe(groupe_id) in ('proprietaire','accompagnateur'));
create policy groupe_participants_update on public.tourneo_groupe_participants for update to authenticated using(tourneo_private.role_groupe(groupe_id) in ('proprietaire','accompagnateur')) with check(tourneo_private.role_groupe(groupe_id) in ('proprietaire','accompagnateur'));
create policy groupe_participants_delete on public.tourneo_groupe_participants for delete to authenticated using(tourneo_private.role_groupe(groupe_id) in ('proprietaire','accompagnateur'));
create function tourneo_private.verifier_quota_groupe()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or tourneo_private.role_groupe(new.groupe_id) not in ('proprietaire','accompagnateur') then raise exception 'Accès accompagnateur requis';end if;
 perform 1 from public.tourneo_groupes where id=new.groupe_id for update;
 if (select count(*) from public.tourneo_groupe_participants where groupe_id=new.groupe_id)>=256 then raise exception 'Le groupe est limité à 256 participants';end if;
 return new;
end $$;
revoke all on function tourneo_private.verifier_quota_groupe() from public,anon,authenticated;
create trigger groupe_quota before insert on public.tourneo_groupe_participants for each row execute function tourneo_private.verifier_quota_groupe();
create function public.tourneo_partager_groupe(p_groupe uuid,p_code text,p_role text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare membre uuid;
begin
 if auth.uid() is null or tourneo_private.role_groupe(p_groupe) is distinct from 'proprietaire' then raise exception 'Accès propriétaire requis';end if;
 if p_role is null or p_role not in ('accompagnateur','lecture') then raise exception 'Rôle invalide';end if;
 select id into membre from public.profiles where player_code=upper(trim(p_code));
 if membre is null then raise exception 'Code joueur introuvable';end if;
 if membre=auth.uid() then raise exception 'Vous êtes déjà propriétaire';end if;
 insert into public.tourneo_groupe_membres(groupe_id,user_id,role)values(p_groupe,membre,p_role)
 on conflict(groupe_id,user_id)do update set role=excluded.role;
end $$;
revoke all on function public.tourneo_partager_groupe(uuid,text,text) from public,anon;
grant execute on function public.tourneo_partager_groupe(uuid,text,text) to authenticated;
