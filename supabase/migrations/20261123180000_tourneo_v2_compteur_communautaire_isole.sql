-- Standalone, non-destructive Tourneo community counter.
-- Can be installed while V1 remains live. Never exposes auth.users or exact counts.
-- The full V2 album migration later uses CREATE OR REPLACE for compatibility.
begin;

create or replace function public.tourneo_communaute_publique()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $tourneo$
  with confirmes as (
    select count(*)::bigint as n
    from auth.users u
    where u.email_confirmed_at is not null
      and u.deleted_at is null
      and not coalesce(u.is_anonymous,false)
      and (u.banned_until is null or u.banned_until <= now())
  ), bornes as (
    select n,
           case when n < 100 then 10::bigint
                when n < 1000 then 100::bigint
                else 1000::bigint end as pas
    from confirmes
  )
  select jsonb_build_object(
    'minimum',(n / pas)*pas,
    'maximum',(n / pas)*pas+pas-1,
    'mesure','comptes_confirmes'
  )
  from bornes
$tourneo$;

revoke all on function public.tourneo_communaute_publique()
  from public,anon,authenticated;
grant execute on function public.tourneo_communaute_publique()
  to anon,authenticated;

comment on function public.tourneo_communaute_publique() is
  'Tourneo public social proof: bucket of confirmed, active, non-anonymous accounts; never exact counts, emails or IDs. No parameters or writes.';

commit;
