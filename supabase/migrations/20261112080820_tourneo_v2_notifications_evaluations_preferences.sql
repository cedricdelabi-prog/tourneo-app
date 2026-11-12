create schema if not exists tourneo_private;
revoke all on schema tourneo_private from public,anon;
grant usage on schema tourneo_private to authenticated;
create table public.tourneo_preferences (
 user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
 notifications_sportives boolean not null default true,
 communications_tourneo boolean not null default false,
 consentement_promotion_at timestamptz,
 texte_agrandi boolean not null default false,
 animations_reduites boolean not null default false,
 updated_at timestamptz not null default now()
);
create table public.tourneo_notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 tournoi_id uuid references public.tournois(id) on delete cascade,
 type text not null check(type in ('inscription','statut_inscription','arbitrage','score')),
 message text not null,
 lu boolean not null default false,
 created_at timestamptz not null default now()
);
create index tourneo_notifications_user_date on public.tourneo_notifications(user_id,created_at desc);
create index tourneo_notifications_tournoi on public.tourneo_notifications(tournoi_id);
create table public.tourneo_evaluations (
 tournoi_id uuid not null references public.tournois(id) on delete cascade,
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 note integer not null check(note between 1 and 5),
 commentaire text not null default '' check(char_length(commentaire)<=1000),
 created_at timestamptz not null default now(),
 primary key(tournoi_id,user_id)
);
create index tourneo_evaluations_user on public.tourneo_evaluations(user_id);
alter table public.tourneo_preferences enable row level security;
alter table public.tourneo_notifications enable row level security;
alter table public.tourneo_evaluations enable row level security;
revoke all on public.tourneo_preferences,public.tourneo_notifications,public.tourneo_evaluations from anon,authenticated;
grant select,insert,update on public.tourneo_preferences to authenticated;
grant select,delete on public.tourneo_notifications to authenticated;
grant update(lu) on public.tourneo_notifications to authenticated;
grant select,insert,delete on public.tourneo_evaluations to authenticated;
grant update(note,commentaire) on public.tourneo_evaluations to authenticated;
create policy preferences_owner on public.tourneo_preferences for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy notifications_owner on public.tourneo_notifications for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create function tourneo_private.peut_evaluer(p_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select auth.uid() is not null and exists(
 select 1 from public.tournois t where t.id=p_id and t.user_id<>auth.uid()
 and t.donnees->>'termine'='true'
 and (
 exists(select 1 from public.player_results r where r.tournament_id=t.id and r.profile_id=auth.uid())
 or exists(select 1 from public.tourneo_inscriptions i where i.tournoi_id=t.id and i.user_id=auth.uid() and i.statut='accepte')
 or exists(select 1 from jsonb_array_elements(coalesce(t.donnees->'equipes','[]'::jsonb)) e where coalesce(e->>'profilId',e->>'id')=auth.uid()::text)
 ));
$$;
revoke all on function tourneo_private.peut_evaluer(uuid) from public,anon;
grant execute on function tourneo_private.peut_evaluer(uuid) to authenticated;
create policy evaluations_read on public.tourneo_evaluations for select to authenticated using(user_id=(select auth.uid()) or exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=(select auth.uid())));
create policy evaluations_insert on public.tourneo_evaluations for insert to authenticated with check(user_id=(select auth.uid()) and tourneo_private.peut_evaluer(tournoi_id));
create policy evaluations_update on public.tourneo_evaluations for update to authenticated using(user_id=(select auth.uid()) and tourneo_private.peut_evaluer(tournoi_id)) with check(user_id=(select auth.uid()) and tourneo_private.peut_evaluer(tournoi_id));
create policy evaluations_delete on public.tourneo_evaluations for delete to authenticated using(user_id=(select auth.uid()));
create function tourneo_private.horodater_preferences()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if TG_OP='INSERT' then
 new.consentement_promotion_at:=case when new.communications_tourneo then now() else null end;
 elsif new.communications_tourneo is distinct from old.communications_tourneo then
 new.consentement_promotion_at:=case when new.communications_tourneo then now() else null end;
 else new.consentement_promotion_at:=old.consentement_promotion_at;
 end if;
 new.updated_at:=now();
 return new;
end $$;
revoke all on function tourneo_private.horodater_preferences() from public,anon,authenticated;
create trigger preferences_timestamp before insert or update on public.tourneo_preferences for each row execute function tourneo_private.horodater_preferences();
create function tourneo_private.notifier()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare destinataire uuid; genre text; contenu text;
begin
 if TG_TABLE_NAME='tourneo_arbitres' then
 destinataire:=new.user_id; genre:='arbitrage'; contenu:='Un organisateur vous a attribué un tournoi à arbitrer.';
 elsif TG_TABLE_NAME='tourneo_scores_proposes' then
 select user_id into destinataire from public.tournois where id=new.tournoi_id;
 genre:='score'; contenu:='Un arbitre a proposé un résultat à valider.';
 elsif TG_TABLE_NAME='tourneo_inscriptions' and TG_OP='INSERT' then
 select user_id into destinataire from public.tournois where id=new.tournoi_id;
 genre:='inscription'; contenu:='Une nouvelle demande d’inscription est arrivée.';
 elsif TG_TABLE_NAME='tourneo_inscriptions' and TG_OP='UPDATE' then
 if new.statut is not distinct from old.statut then return new;end if;
 destinataire:=new.user_id; genre:='statut_inscription'; contenu:='Le statut de votre inscription a changé : '||new.statut||'.';
 end if;
 if destinataire is not null and coalesce((select notifications_sportives from public.tourneo_preferences where user_id=destinataire),true) then
 insert into public.tourneo_notifications(user_id,tournoi_id,type,message) values(destinataire,new.tournoi_id,genre,contenu);
 end if;
 return new;
end $$;
revoke all on function tourneo_private.notifier() from public,anon,authenticated;
create trigger notification_inscription after insert or update of statut on public.tourneo_inscriptions for each row execute function tourneo_private.notifier();
create trigger notification_arbitrage after insert on public.tourneo_arbitres for each row execute function tourneo_private.notifier();
create trigger notification_score after insert or update on public.tourneo_scores_proposes for each row execute function tourneo_private.notifier();
