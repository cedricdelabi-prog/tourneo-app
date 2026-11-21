-- Tourneo V2: compatibility for existing public links and remote TV.
-- Apply after phases 1–17 on a restored copy for validation.
begin;
do $$
begin
 if current_setting('tourneo.v1_copy_verified',true) is distinct from 'true'
 or to_regprocedure('public.tourneo_public_compat_v2(uuid)') is null
 or to_regprocedure('public.get_tourneo_public(uuid)') is null
 or to_regprocedure('public.tourneo_moderation_liste(text,integer)') is null
 then raise exception 'Expected Tourneo V1 + V2 migration through phase 17'; end if;
end $$;

-- Preserve the V1 RPC name, arguments and row shape for existing clients.
-- V2 resolves both canonical IDs and old aliases and filters private tournaments.
create or replace function public.get_tourneo_public(p_id uuid)
returns table(id uuid, nom text, sport text, donnees jsonb)
language sql stable security definer set search_path='' as $$
 select (payload->>'id')::uuid, payload->>'nom', payload->>'sport', payload->'donnees'
 from public.tourneo_public_compat_v2(p_id) as payload
 where payload->>'id' is not null;
$$;
revoke all on function public.get_tourneo_public(uuid) from public;
grant execute on function public.get_tourneo_public(uuid) to anon,authenticated;



CREATE TABLE public.tourneo_tv_pilotage (
  tournoi_id uuid PRIMARY KEY REFERENCES public.tournois(id) ON DELETE CASCADE,
  reglages jsonb NOT NULL DEFAULT '{}'::jsonb,
  revision bigint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tv_reglages_object CHECK (jsonb_typeof(reglages) = 'object'),
  CONSTRAINT tv_reglages_size CHECK (octet_length(reglages::text) <= 12000),
  CONSTRAINT tv_revision_positive CHECK (revision > 0)
);
ALTER TABLE public.tourneo_tv_pilotage ENABLE ROW LEVEL SECURITY;
CREATE POLICY tv_pilotage_owner_select ON public.tourneo_tv_pilotage
 FOR SELECT TO authenticated
 USING (EXISTS (SELECT 1 FROM public.tournois t WHERE t.id=tournoi_id AND t.user_id=(SELECT auth.uid())));
CREATE POLICY tv_pilotage_owner_insert ON public.tourneo_tv_pilotage
 FOR INSERT TO authenticated
 WITH CHECK (EXISTS (SELECT 1 FROM public.tournois t WHERE t.id=tournoi_id AND t.user_id=(SELECT auth.uid())));
CREATE POLICY tv_pilotage_owner_update ON public.tourneo_tv_pilotage
 FOR UPDATE TO authenticated
 USING (EXISTS (SELECT 1 FROM public.tournois t WHERE t.id=tournoi_id AND t.user_id=(SELECT auth.uid())))
 WITH CHECK (EXISTS (SELECT 1 FROM public.tournois t WHERE t.id=tournoi_id AND t.user_id=(SELECT auth.uid())));
REVOKE ALL ON public.tourneo_tv_pilotage FROM anon;
GRANT SELECT,INSERT,UPDATE ON public.tourneo_tv_pilotage TO authenticated;
CREATE FUNCTION public.tv_pilotage_touch() RETURNS trigger LANGUAGE plpgsql
 SET search_path=public,pg_temp AS $$
BEGIN
 NEW.revision=OLD.revision+1;
 NEW.updated_at=now();
 RETURN NEW;
END;
$$;
CREATE TRIGGER tv_pilotage_revision_trigger BEFORE UPDATE ON public.tourneo_tv_pilotage
 FOR EACH ROW EXECUTE FUNCTION public.tv_pilotage_touch();

CREATE FUNCTION public.tv_pilotage_appliquer(p_tournoi_id uuid,p_patch jsonb)
RETURNS TABLE(nouveaux_reglages jsonb,nouvelle_revision bigint)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF p_patch IS NULL OR jsonb_typeof(p_patch) IS DISTINCT FROM 'object'
    OR octet_length(p_patch::text)>12000
    OR EXISTS (SELECT 1 FROM jsonb_object_keys(p_patch) cle
       WHERE cle NOT IN ('secondes','pause','message','dureeAnnonce','annonceExpireA','appel','dureeAppel','appelExpireA','defilement','repriseA','afficherSponsors','pageSponsors','afficherMatchs','afficherClassement','afficherProgression','filtreMatchs','pageManuelle','debutDefilement'))
 THEN
  RAISE EXCEPTION 'Paramètres TV non autorisés.' USING ERRCODE='22023';
 END IF;
 RETURN QUERY
 INSERT INTO public.tourneo_tv_pilotage AS t(tournoi_id,reglages)
 VALUES (p_tournoi_id,p_patch)
 ON CONFLICT (tournoi_id) DO UPDATE SET reglages=t.reglages || EXCLUDED.reglages
 RETURNING t.reglages,t.revision;
END;
$$;
REVOKE ALL ON FUNCTION public.tv_pilotage_appliquer(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tv_pilotage_appliquer(uuid,jsonb) TO authenticated;

ALTER TABLE public.tourneo_tv_pilotage ADD COLUMN derniere_tv_at timestamptz;
CREATE OR REPLACE FUNCTION public.tv_pilotage_touch() RETURNS trigger LANGUAGE plpgsql
 SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.reglages IS DISTINCT FROM OLD.reglages THEN
  NEW.revision=OLD.revision+1;
  NEW.updated_at=now();
 ELSE
  NEW.revision=OLD.revision;
  NEW.updated_at=OLD.updated_at;
 END IF;
 RETURN NEW;
END;
$$;
CREATE FUNCTION public.tv_pilotage_ping(p_tournoi_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE vu timestamptz:=clock_timestamp();enregistre timestamptz;
BEGIN
 INSERT INTO public.tourneo_tv_pilotage AS t(tournoi_id,reglages,derniere_tv_at)
 VALUES (p_tournoi_id,'{}'::jsonb,vu)
 ON CONFLICT (tournoi_id) DO UPDATE SET derniere_tv_at=EXCLUDED.derniere_tv_at
 RETURNING t.derniere_tv_at INTO enregistre;
 RETURN enregistre;
END;
$$;
REVOKE ALL ON FUNCTION public.tv_pilotage_ping(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tv_pilotage_ping(uuid) TO authenticated;

CREATE FUNCTION public.tv_pilotage_initialiser(p_tournoi_id uuid,p_reglages jsonb)
RETURNS TABLE(nouveaux_reglages jsonb,nouvelle_revision bigint)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF p_reglages IS NULL OR jsonb_typeof(p_reglages) IS DISTINCT FROM 'object'
    OR octet_length(p_reglages::text)>12000
    OR EXISTS (SELECT 1 FROM jsonb_object_keys(p_reglages) cle
      WHERE cle NOT IN ('secondes','pause','message','dureeAnnonce','annonceExpireA','appel','dureeAppel','appelExpireA','defilement','repriseA','afficherSponsors','pageSponsors','afficherMatchs','afficherClassement','afficherProgression','filtreMatchs','pageManuelle','debutDefilement'))
 THEN
  RAISE EXCEPTION 'Paramètres TV non autorisés.' USING ERRCODE='22023';
 END IF;
 RETURN QUERY
 INSERT INTO public.tourneo_tv_pilotage AS t(tournoi_id,reglages)
 VALUES (p_tournoi_id,p_reglages)
 ON CONFLICT (tournoi_id) DO UPDATE SET reglages=EXCLUDED.reglages
   WHERE t.reglages='{}'::jsonb
 RETURNING t.reglages,t.revision;
 IF NOT FOUND THEN
  RETURN QUERY SELECT t.reglages,t.revision
   FROM public.tourneo_tv_pilotage t WHERE t.tournoi_id=p_tournoi_id;
 END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.tv_pilotage_initialiser(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tv_pilotage_initialiser(uuid,jsonb) TO authenticated;

revoke all on public.tourneo_tv_pilotage from public;

commit;
