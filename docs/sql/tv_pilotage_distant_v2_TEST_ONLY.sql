-- V2 TEST ONLY: Supabase project kmjfmjhdnokkaiolxiin.
-- Applied 2026-11-19; do not execute on production V1 without separate approved migration.
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
