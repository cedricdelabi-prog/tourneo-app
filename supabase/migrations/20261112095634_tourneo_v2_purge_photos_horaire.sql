create extension if not exists pg_cron;
create extension if not exists pg_net;
create function tourneo_private.planifier_purge_photos()
returns bigint language plpgsql security definer set search_path=public,pg_temp as $$
declare jeton uuid; requete bigint;
begin
 delete from public.tourneo_jobs_photos where expires_at<=now();
 insert into public.tourneo_jobs_photos default values returning token into jeton;
 select net.http_post(
  url:='https://kmjfmjhdnokkaiolxiin.supabase.co/functions/v1/purge-photos-v2',
  headers:='{"Content-Type":"application/json"}'::jsonb,
  body:=jsonb_build_object('token',jeton),
  timeout_milliseconds:=60000
 )into requete;
 return requete;
end $$;
revoke all on function tourneo_private.planifier_purge_photos() from public,anon,authenticated;
select cron.schedule('tourneo-v2-purge-photos','17 * * * *','select tourneo_private.planifier_purge_photos();');
