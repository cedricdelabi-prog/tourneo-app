-- Tourneo V2 TEST ONLY (kmjfmjhdnokkaiolxiin). Applied 2026-11-19.
-- Requires docs/sql/tv_pilotage_distant_v2_TEST_ONLY.sql and atomic patch migration.
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
