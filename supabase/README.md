# Base Tourneo V2

Cible exclusive : `tourneo-v2-test` (`kmjfmjhdnokkaiolxiin`). Les cinq migrations de `migrations/` sont déjà appliquées le 12 novembre 2026. Ne pas les relancer sur ce projet. Les anciennes sources des modules sont dans `modules/`, hors du chemin des migrations.

`ACTIVER_V2.sql` regroupe le socle et les modules pour une base V2 entièrement vierge, en une transaction. Il ne supprime aucune table ni donnée existante. Vérifier le nom et l'identifiant du projet avant toute exécution ; ne jamais utiliser la V1.

## Tests

`tests/integration_v2.sql` crée deux utilisateurs et un tournoi temporaires dans une transaction, teste les autorisations, inscriptions, quota, annulation et arbitrage, puis effectue ROLLBACK. Exécuter seulement sur la V2. Aucun compte réel n'est nécessaire. Les tests concurrents et les essais navigateur restent nécessaires.

## Photos et partage

Le bucket `tourneo-media` est privé, limité aux images de 5 Mo et aux objets du propriétaire. Le client stocke le chemin et génère des liens signés temporaires. Le lien public tournoi est temporairement désactivé après refus du contrôle automatique ; voir la proposition non appliquée dans `proposals/`. La recherche de profil nécessite une connexion. Les inscriptions invitées restent utilisables.

## Reprise sur PC

Sauvegarder les modifications locales avant synchronisation. Récupérer la branche `tourneo-v2-dev`, ouvrir le dossier dans VS Code puis lancer `npm ci`. Dans `.env.local`, renseigner `NEXT_PUBLIC_SUPABASE_URL=https://kmjfmjhdnokkaiolxiin.supabase.co` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` avec la clé publiable du projet V2 (jamais service_role). Lancer `npm run dev`. Les mêmes variables doivent être vérifiées dans le déploiement Vercel V2.
