# Diagnostic de publication complète Tourneo V2 — 23 novembre 2026

## Autorisation
Le propriétaire a demandé explicitement de publier l'ensemble de la V2. Accord enregistré dans `docs/bascule-v2-preflight.json`.

## En production aujourd'hui
- Domaine officiel `https://www.tourneo.org`, HTTP 200
- Connexion Google vérifiée par le propriétaire, ancien domaine et 25/25 anciens liens de tournoi préservés
- Compteur `50+` sur la base des comptes confirmés
- Code `main` et V1 Git non modifiés

## Dernier inventaire SQL de production (lecture seule)
60 comptes Auth, 60 profils, 62 identités de connexion, 25 tournois, 1 fichier Storage, zéro tournoi sans propriétaire.

## Prévisualisation V2 complète
- Projet de test indépendant `tourneo-v2-test`
- Aperçu READY : `https://tourneo-v2-test-doe0pjiyh-tourneo.vercel.app`
- Pages accueil, connexion, guides et statistiques accessibles en HTTP 200
- Aucun déploiement complet sur les alias publics

## Écarts entre schémas
Production `gjtxlzhfqcecyfciyllc`, test `kmjfmjhdnokkaiolxiin`.

Quatre tables publiques du projet de test ne sont pas présentes en production :
- `tourneo_android_appareils`
- `tourneo_envois`
- `tourneo_jobs_photos`
- `tourneo_push_abonnements`

Trois colonnes du test manquent dans `tourneo_preferences` en production :
`notifications_push`, `notifications_email`, `notifications_android`.

Treize fonctions publiques V2 manquent en production, notamment Android, pronostics invités et entretien des photos. L'ancienne production contient des colonnes historiques `tournois.partage_id`, `tournois.est_public` et `tourneo_album_config.telechargement` à préserver.

## Conditions de publication globale
1. Exécuter un export privé restaurable de la production (Auth, tables, rôles/RLS/triggers, Storage) selon `docs/SAUVEGARDE_V1_GRATUITE.md`.
2. Tester la restauration isolée, sans effacer le projet de test existant.
3. Adapter et tester des migrations additives V2 conservant les UUID, liens, comptes et tournois existants.
4. Vérifier sécurité RLS/fonctions, Google, e-mail, création/modification de tournoi, écran TV et retour arrière.
5. Valider l'application Android existante : `capacitor.config.ts` utilise encore `tourneo-v2-test.vercel.app` et `com.cedricdelabi.tourneo.v2`; la diffusion Google Play ne fait pas partie du déploiement web.
6. Construire et tester la production V2 après ces validations, puis la promouvoir dans Vercel.

### Conclusion
Accord utilisateur acquis ; la publication complète reste BLOQUÉE techniquement. Ne pas promouvoir le code V2 avec des tables et fonctions manquantes ou sans restauration vérifiée. Le site actuel continue de fonctionner.