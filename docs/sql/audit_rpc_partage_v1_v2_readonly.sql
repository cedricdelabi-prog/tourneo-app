-- Tourneo V1/V2 - audit des permissions de partage - LECTURE SEULE
-- Executer une fois sur la production V1 et une fois sur la base de test V2.
-- Ne divulgue ni noms d'utilisateurs, ni identifiants de tournoi, ni donnees personnelles.
-- ATTENTION : la presence textuelle de est_public ne prouve pas la securite d'une fonction.
-- Il faut ensuite auditer son corps, ses fonctions appelees et ses politiques RLS.
SELECT n.nspname AS schema_nom,
       p.proname AS fonction,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       p.prosecdef AS security_definer,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS execute_anonyme,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS execute_connecte,
       pg_get_functiondef(p.oid) ~* 'est_public' AS mentionne_est_public,
       pg_get_functiondef(p.oid) ~* 'auth\\.uid' AS mentionne_auth_uid
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN (
      'tourneo_public_v2',
      'tourneo_public_compat_v2',
      'tourneo_partage_web_v2',
      'tourneo_pronostics_lecture',
      'tourneo_infos_inscriptions'
  )
ORDER BY p.proname, arguments;
-- STOP avant la bascule si une fonction publique privilegiée
-- donne acces a des donnees privees sans controle explicite.
