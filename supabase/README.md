# Base Tourneo V2

Cible exclusive : `tourneo-v2-test` (`kmjfmjhdnokkaiolxiin`). Les neuf migrations du dossier `migrations/` sont appliquées le 12 novembre 2026. Ne pas les relancer sur ce projet. Les anciennes sources des modules sont conservées dans `modules/`, hors du chemin des migrations.

`ACTIVER_V2.sql` regroupe le socle et les modules pour une base V2 entièrement vierge, en une transaction. Vérifier le nom et l'identifiant du projet avant toute exécution ; ne jamais utiliser la V1.

## Vérifications locales

- `npm test` : calendriers, formats, scores, import/export, sauvegardes et statistiques.
- `npm run test:db` : PostgreSQL local WASM (PGlite épinglé), migrations, contrôles d'accès et scripts SQL ; comparaison avec l'activation consolidée. Les schémas Auth et Storage sont des substituts minimaux de test, sans connexion Supabase.
- `npx tsc --noEmit` puis `npm run build` : types et compilation avec les variables V2.

Sur Supabase V2 uniquement, `tests/integration_v2.sql`, `tests/partage_public_v2.sql` et `tests/groupes_v2.sql` créent des jeux temporaires dans une transaction puis font ROLLBACK. Ne jamais les exécuter sur la V1. Les tests simultanés, Auth/Storage réels et parcours navigateur restent nécessaires.

## Accès

Bucket `tourneo-media` privé, images de 5 Mo maximum, objets accessibles au propriétaire. Le client conserve les chemins et génère les URL signées temporaires. Le partage public approuvé contient pseudos/données de jeu avec alias propres au tournoi, sans photos ni coordonnées ni identifiants de compte. Le palmarès individuel et la recherche de profil nécessitent une connexion.

Groupes club/accompagnement privés, accès propriétaire/lecture/accompagnateur, quota 256 ; copie de la liste dans un nouveau tournoi. Notifications internes et avis privés ; consentement promotionnel distinct des informations sportives. E-mails et push téléphone non activés.

## Reprise sur PC

Sauvegarder les modifications locales avant synchronisation. Récupérer `tourneo-v2-dev`, ouvrir le dossier dans VS Code et lancer `npm ci`. Dans `.env.local`, renseigner `NEXT_PUBLIC_SUPABASE_URL=https://kmjfmjhdnokkaiolxiin.supabase.co` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` avec la clé publiable V2 (jamais service_role). Lancer `npm run dev`. Vérifier les mêmes variables dans le projet Vercel V2. La configuration du client bloque les URL Supabase autres que la V2.
