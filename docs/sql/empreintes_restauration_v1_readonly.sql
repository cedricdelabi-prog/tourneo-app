-- TOURNEO V1 -> COPIE RESTAUREE : EMPREINTES D'INTEGRITE EN LECTURE SEULE.
-- Executer sur la V1 puis sur une copie restauree d'une sauvegarde DE MEME INSTANT.
-- Ne renvoie ni identifiant individuel ni donnees personnelles, uniquement comptes et MD5 agreges.
-- MD5 ici = comparateur technique non secret, PAS signature de securite ni preuve
-- de restauration des mots de passe, jetons, sessions, photos binaires ou OAuth.
-- Des inscriptions ou modifications entre les deux exports changent les empreintes.
WITH e AS (
  SELECT 'auth.users' AS origine, id::text AS tri, md5(id::text) AS ligne FROM auth.users
  UNION ALL
  SELECT 'auth.identities', id::text, md5(id::text || '|' || user_id::text)
    FROM auth.identities
  UNION ALL
  SELECT 'public.profiles', id::text,
    md5(id::text || '|' || coalesce(display_name,'<null>') || '|' ||
        coalesce(player_code,'<null>') || '|' || coalesce(avatar_url,'<null>'))
    FROM public.profiles
  UNION ALL
  SELECT 'public.tournois', id::text,
    md5(id::text || '|' || user_id::text || '|' || coalesce(nom,'<null>') ||
        '|' || coalesce(sport,'<null>') || '|' || coalesce(donnees::text,'<null>') ||
        '|' || coalesce(to_jsonb(t)->>'partage_id','<null>') || '|' || coalesce(to_jsonb(t)->>'est_public','<null>'))
    FROM public.tournois t
  UNION ALL
  SELECT 'storage.objects', id::text,
    md5(id::text || '|' || coalesce(bucket_id,'<null>') || '|' || coalesce(name,'<null>'))
    FROM storage.objects
)
SELECT origine, count(*)::bigint AS lignes,
       md5(coalesce(string_agg(ligne, '' ORDER BY tri), 'VIDE')) AS empreinte_agregee
FROM e
GROUP BY origine
UNION ALL
SELECT nom, 0::bigint, md5('VIDE')
FROM (VALUES ('auth.users'),('auth.identities'),('public.profiles'),('public.tournois'),('storage.objects')) AS attendues(nom)
WHERE NOT EXISTS (SELECT 1 FROM e WHERE e.origine=attendues.nom)
ORDER BY origine;
-- En cas d'ecart: STOP, ne pas lancer la V2. Comparer une archive du meme instant.
-- Egalite des empreintes : donnees selectionnees concordantes, PAS preuve de restauration complete.
