-- Remplacer @TOKEN_SHA256@ par le SHA-256 hexadécimal du secret Vercel.
-- Ne jamais enregistrer le secret en clair dans la migration.
begin;

create function public.tourneo_partage_web_v2(p_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  jeton text := coalesce(nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-tourneo-share-token', '');
begin
  if encode(sha256(convert_to(jeton, 'UTF8')), 'hex') <> '@TOKEN_SHA256@' then
    raise insufficient_privilege using message = 'Accès serveur requis';
  end if;
  return public.tourneo_public_compat_v2(p_id);
end;
$$;

revoke all on function public.tourneo_partage_web_v2(uuid) from public, anon, authenticated;
grant execute on function public.tourneo_partage_web_v2(uuid) to anon;

commit;
