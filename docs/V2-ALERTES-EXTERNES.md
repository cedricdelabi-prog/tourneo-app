# Alertes externes — 13 novembre 2026

Code backend et interface intégrés sur la branche V2. Migration non appliquée : confirmation technique expirée. Fonction non déployée. Les boutons restent désactivés sans configuration serveur. Les appels internes fonctionnent indépendamment.

## Comportement

- Consentements séparés pour le téléphone et les e-mails, désactivés par défaut.
- Activation explicite sur chaque navigateur compatible. Sur iPhone, version web ajoutée à l’écran d’accueil. Le push natif APK/FCM n’est pas inclus.
- Déconnexion : retrait de l’appareil et désabonnement local. Le retrait d’un appareil conserve les autres appareils du compte.
- L’organisateur voit l’appareil enregistré et l’état de transmission. Une transmission au fournisseur ne prouve pas la réception ou la lecture.
- Worker limité à cinq envois par lot, baux de deux minutes, cinq tentatives maximum, vérification des préférences et de la lecture, expiration des appels après quinze minutes et conservation de trente jours.
- RLS par propriétaire, clés VAPID et jeton privés. Les endpoints sont limités aux fournisseurs push reconnus ; aucun contenu de participant dans l’aperçu des alertes.

## Activation restante

1. Appliquer la migration additive `tourneo_v2_alertes_externes` au seul projet V2 `kmjfmjhdnokkaiolxiin`.
2. Déployer `notifications-tourneo` avec `verify_jwt = false` : son corps vérifie le jeton privé du planificateur.
3. Une requête POST non authentifiée initialise les clés et retourne 401 sans traiter de message. Le planificateur prend ensuite le relais.
4. Pour les e-mails, configurer un expéditeur vérifié et les secrets Supabase Edge `RESEND_API_KEY` et `TOURNEO_EMAIL_FROM`. Aucun secret dans le dépôt ou dans une variable NEXT_PUBLIC.
5. Tester avec deux comptes dédiés et un vrai téléphone, après activation explicite. Aucun vrai message envoyé durant les contrôles locaux.

Tests : migrations et SQL consolidé, consentement, isolation des comptes, refus d’endpoint arbitraire, doubles prises, accusé lié au bail, retrait ; transport simulé, chiffrement Web Push local sans envoi, appareil expiré et liens du service worker.

Bilan des 85 points reconstitués : 80 développés, 4 à tester, 1 partiellement développé. Ne pas présenter 85/85 comme validés.
