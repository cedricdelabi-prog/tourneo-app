-- Réglages individuels et boîte de réception V2.
begin;
set local lock_timeout = '3s';

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

alter table public.tourneo_preferences enable row level security;
alter table public.tourneo_notifications enable row level security;
revoke all on public.tourneo_preferences,public.tourneo_notifications from public,anon,authenticated;
grant select,insert,update on public.tourneo_preferences to authenticated;
grant select,delete on public.tourneo_notifications to authenticated;
grant update(lu) on public.tourneo_notifications to authenticated;
create policy preferences_owner on public.tourneo_preferences for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy notifications_owner on public.tourneo_notifications for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
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

commit;
