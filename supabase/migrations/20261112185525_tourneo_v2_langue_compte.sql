alter table public.tourneo_preferences add column langue text not null default 'fr' check(langue in ('fr','en','nl'));
