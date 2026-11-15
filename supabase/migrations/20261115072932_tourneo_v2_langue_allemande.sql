-- Preserve existing language choices and allow German account preferences.
alter table public.tourneo_preferences drop constraint tourneo_preferences_langue_check;
alter table public.tourneo_preferences add constraint tourneo_preferences_langue_check check(langue in ('fr','en','nl','de'));
