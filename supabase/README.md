# Activation de la V2

Cible exclusive : projet Supabase nommé **tourneo-v2-test**. Vérifier son identifiant réel, sa disponibilité, le schéma `tournois` (`id uuid`, `user_id uuid`, `donnees jsonb`) et `profiles` avant toute application. Ne jamais exécuter ces migrations sur la base V1.

Appliquer dans l'ordre les migrations du dossier `migrations/`, puis vérifier les parcours avec des comptes de test distincts : organisateur, arbitre et visiteur.

1. Inscriptions : ouverture/fermeture, échéance, quota concurrent, doublons, annulation par jeton, demandes en attente, acceptation, pointage et démarrage atomique.
2. Événements : création et attribution limitées aux tournois du propriétaire ; classement cumulé après clôture des résultats.
3. Arbitrage : ajout par code joueur, accès limité aux tournois attribués, propositions séparées des résultats officiels, retrait de l'accès.
4. Partage : fonction `tourneo_public_v2`, projection explicite des données de jeu publiques ; aucun jeton d'inscription ni propriétaire du compte exposé. Le client peut utiliser l'ancienne fonction tant que cette migration n'est pas appliquée.

Les fonctions d'inscription utilisent un verrou de ligne du tournoi pour sérialiser quota, acceptation et démarrage. Les requêtes publiques ne peuvent pas modifier les scores. Les identifiants de reprise des inscriptions invitées restent sur l'appareil et ne sont pas exposés publiquement.

Aucune migration n'a encore été appliquée depuis cet environnement. Les politiques RLS et les fonctions SQL doivent être vérifiées sur le projet V2 après connexion. La compilation du frontend ne constitue pas une validation de ces fonctions.
