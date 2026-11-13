# Alertes externes — 13 novembre 2026

Code backend et interface intégrés sur la branche V2. Migration 20261113072840 appliquée au seul projet V2 le 13 novembre 2026. Fonction notifications-tourneo ACTIVE, version 1. Initialisation sans traitement : POST sans jeton retourne 401, clés prêtes, planificateur actif, aucun appareil ni envoi. Les comptes ne peuvent lire les secrets ni invoquer le worker. Les appels internes fonctionnent indépendamment.

## Comportement

- Consentements séparés pour le téléphone et les e-mails, désactivés par défaut.
- Activation explicite sur chaque navigateur compatible. Sur iPhone, version web ajoutée à l’écran d’accueil. Le push natif APK/FCM n’est pas inclus.
- Déconnexion : retrait de l’appareil et désabonnement local. Le retrait d’un appareil conserve les autres appareils du compte.
- L’organisateur voit l’appareil enregistré et l’état de transmission. Une transmission au fournisseur ne prouve pas la réception ou la lecture.
- Worker limité à cinq envois par lot, baux de deux minutes, cinq tentatives maximum, vérification des préférences et de la lecture, expiration des appels après quinze minutes et conservation de trente jours.
- RLS par propriétaire, clés VAPID et jeton privés. Les endpoints sont limités aux fournisseurs push reconnus ; aucun contenu de participant dans l’aperçu des alertes.

## Activation et validation

1. Fait : appliquer la migration additive `tourneo_v2_alertes_externes` au seul projet V2 `kmjfmjhdnokkaiolxiin`.
2. Fait : déployer `notifications-tourneo` avec `verify_jwt = false` : son corps vérifie le jeton privé du planificateur.
3. Vérifié : une requête POST non authentifiée initialise les clés et retourne 401 sans traiter de message. Le planificateur prend ensuite le relais.
4. Pour les e-mails, configurer un expéditeur vérifié et les secrets Supabase Edge `RESEND_API_KEY` et `TOURNEO_EMAIL_FROM`. Aucun secret dans le dépôt ou dans une variable NEXT_PUBLIC.
5. Tester avec deux comptes dédiés et un vrai téléphone, après activation explicite. Aucun vrai message envoyé durant les contrôles locaux.

Tests : migrations et SQL consolidé, consentement, isolation des comptes, refus d’endpoint arbitraire, doubles prises, accusé lié au bail, retrait ; transport simulé, chiffrement Web Push local sans envoi, appareil expiré et liens du service worker.

Bilan des 85 points reconstitués : 80 développés, 4 à tester, 1 partiellement développé. Ne pas présenter 85/85 comme validés.

## Vérification en service

Requête du planificateur vérifiée : HTTP 200, zéro transmission et zéro échec (file vide). HTTP 401 sans jeton. Déploiement Vercel V2 READY pour le commit 4f21ca7, domaine public HTTP 200. Seule nouvelle information advisors : RLS sans politique sur la configuration privée, volontairement sans accès client.

Les essais UI simulés couvrent l’absence de demande de permission au chargement, le refus utilisateur, les clics rapides, le retour arrière en cas de sauvegarde échouée, les e-mails indisponibles, l’APK non compatible Web Push et la désactivation d’un appareil. Ils ne remplacent pas le test d’une notification sur téléphone.
