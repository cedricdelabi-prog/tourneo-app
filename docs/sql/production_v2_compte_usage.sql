-- Réglages privés et lecture de l’offre du compte.
begin;
set local lock_timeout = '3s';

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

create table tourneo_private.acces_offerts(user_id uuid primary key references auth.users(id)on delete cascade,actif boolean not null default true,motif text not null check(char_length(trim(motif))between 3 and 300),accorde_par uuid references auth.users(id)on delete set null,updated_at timestamptz not null default now());
-- Reserved for a future verified payment backend. No checkout or billing provider is enabled.
create table tourneo_private.licences_expert_vie(user_id uuid primary key references auth.users(id)on delete cascade,actif boolean not null default true,reference_achat text unique,attribue_at timestamptz not null default now());
alter table tourneo_private.acces_offerts enable row level security;
alter table tourneo_private.licences_expert_vie enable row level security;
revoke all on tourneo_private.acces_offerts,tourneo_private.licences_expert_vie from public,anon,authenticated;
create function public.tourneo_mon_role_admin()returns text language sql stable security definer set search_path='' as $$select tourneo_private.role_admin()$$;
create function tourneo_private.mon_offre()returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid()is null then raise exception 'Connexion requise';end if;
 return jsonb_build_object('version','V2','paiement_actif',false,'expert_disponible',true,'tournois_par_mois',null,'participants_maximum_commercial',null,'expert_offert',exists(select 1 from tourneo_private.acces_offerts where user_id=auth.uid()and actif),'licence_expert_vie',exists(select 1 from tourneo_private.licences_expert_vie where user_id=auth.uid()and actif));
end$$;
create function public.tourneo_mon_offre()returns jsonb language sql stable security definer set search_path='' as $$select tourneo_private.mon_offre()$$;

revoke all on function tourneo_private.mon_offre(),public.tourneo_mon_offre(),public.tourneo_mon_role_admin() from public,anon,authenticated;
grant execute on function public.tourneo_mon_offre(),public.tourneo_mon_role_admin() to authenticated;

commit;
