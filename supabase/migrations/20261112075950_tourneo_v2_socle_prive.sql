create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default 'Joueur' check(char_length(trim(display_name)) between 1 and 100),
 player_code text not null unique default ('TRN-'||upper(replace(gen_random_uuid()::text,'-',''))),
 avatar_url text, favorite_color text default '#3B82F6',
 first_name text, last_name text, city text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.tournois (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 nom text not null check(char_length(trim(nom)) between 1 and 150),
 sport text not null default 'autre',
 donnees jsonb not null default '{}'::jsonb check(jsonb_typeof(donnees)='object'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index tournois_user_id on public.tournois(user_id);
create table public.player_results (
 id uuid primary key default gen_random_uuid(),
 tournament_id uuid not null references public.tournois(id) on delete cascade,
 profile_id uuid not null references public.profiles(id) on delete cascade,
 tournament_name text not null, sport text not null,
 placement integer not null check(placement between 1 and 256),
 points integer not null check(points between 0 and 100),
 created_at timestamptz not null default now(),
 unique(tournament_id,profile_id)
);
create index player_results_profile_id on public.player_results(profile_id);
alter table public.profiles enable row level security;
alter table public.tournois enable row level security;
alter table public.player_results enable row level security;
revoke all on public.profiles,public.tournois,public.player_results from anon,authenticated;
grant select,insert,update,delete on public.profiles,public.tournois to authenticated;
grant select on public.player_results to anon,authenticated;
grant insert,update,delete on public.player_results to authenticated;
create policy profiles_owner on public.profiles for all to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy tournois_owner on public.tournois for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy results_read on public.player_results for select to anon,authenticated using(true);
create policy results_owner_insert on public.player_results for insert to authenticated with check(exists(select 1 from public.tournois t where t.id=tournament_id and t.user_id=(select auth.uid())));
create policy results_owner_update on public.player_results for update to authenticated using(exists(select 1 from public.tournois t where t.id=tournament_id and t.user_id=(select auth.uid()))) with check(exists(select 1 from public.tournois t where t.id=tournament_id and t.user_id=(select auth.uid())));
create policy results_owner_delete on public.player_results for delete to authenticated using(exists(select 1 from public.tournois t where t.id=tournament_id and t.user_id=(select auth.uid())));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('tourneo-media','tourneo-media',false,5242880,array['image/jpeg','image/png','image/webp','image/gif']);
create policy media_owner_read on storage.objects for select to authenticated using(bucket_id='tourneo-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy media_owner_insert on storage.objects for insert to authenticated with check(bucket_id='tourneo-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy media_owner_update on storage.objects for update to authenticated using(bucket_id='tourneo-media' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='tourneo-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy media_owner_delete on storage.objects for delete to authenticated using(bucket_id='tourneo-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
