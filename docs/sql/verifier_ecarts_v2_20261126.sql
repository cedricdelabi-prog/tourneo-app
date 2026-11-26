-- TOURNEO V1 -> V2 : controle reproductible EN LECTURE SEULE.
-- 26/11/2026. Executer separement sur la production et sur la base V2 de test.
-- Ne retourne aucune donnee personnelle ni aucun secret. Ne modifie aucune table.
-- Production observee au 26/11 : 4 tables, 3 colonnes et 17 fonctions absentes.
-- Environnement V2 de test observe au 26/11 : aucun des elements attendus absent.
-- Ce controle ne prouve PAS l'equivalence des definitions, RLS, triggers, vues
-- ni la restauration / migration d'une copie complete de la production.
WITH
expected_tables(name) AS (
 VALUES ('tourneo_jobs_photos'), ('tourneo_push_abonnements'),
        ('tourneo_envois'), ('tourneo_android_appareils')
),
expected_columns(name) AS (
 VALUES ('notifications_push'),('notifications_email'),('notifications_android')
),
expected_functions(name) AS (
 VALUES ('tourneo_album_public'), ('tourneo_android_inscrire'),
 ('tourneo_android_retirer'), ('tourneo_chercher_arbitres'),
 ('tourneo_config_alertes'), ('tourneo_consomme_job_photo'),
 ('tourneo_nettoyer_photos_inline'), ('tourneo_olympiade_publique'),
 ('tourneo_photos_a_supprimer'), ('tourneo_profils_identites'),
 ('tourneo_pronostics_invite_lecture'), ('tourneo_pronostics_invite_retirer'),
 ('tourneo_pronostics_invite_voter'), ('tourneo_worker_android'),
 ('tourneo_worker_finir'), ('tourneo_worker_initialiser'),
 ('tourneo_worker_prendre')
)
SELECT
 (SELECT COALESCE(jsonb_agg(name ORDER BY name), '[]'::jsonb)
    FROM expected_tables e WHERE to_regclass('public.'||e.name) IS NULL)
    AS tables_absentes,
 (SELECT COALESCE(jsonb_agg(name ORDER BY name), '[]'::jsonb)
    FROM expected_columns e WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns c
       WHERE c.table_schema='public'
         AND c.table_name='tourneo_preferences'
         AND c.column_name=e.name))
    AS colonnes_absentes,
 (SELECT COALESCE(jsonb_agg(name ORDER BY name), '[]'::jsonb)
    FROM expected_functions e WHERE NOT EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.proname=e.name))
    AS fonctions_absentes;
