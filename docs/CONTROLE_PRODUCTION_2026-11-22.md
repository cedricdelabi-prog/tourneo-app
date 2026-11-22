# Tourneo — contrôle de production du 22 novembre 2026 (lecture seule)

Projet Supabase : `gjtxlzhfqcecyfciyllc`. Branche de préparation : `tourneo-v2-dev`.

## Comptages réels

| Mesure | 22 novembre 2026 |
| --- | ---: |
| Comptes Auth | 59 |
| Identités de connexion | 61 |
| Profils | 59 |
| Tournois | 25 |
| Tournois publics | 25 |
| Identifiants de partage | 25 |
| Fichiers Storage | 1 |
| Liens manquants / doublons | 0 / 0 |
| Comptes et tournois orphelins | 0 |
| Anomalies JSON / titres | 0 |

SQL source : `docs/sql/preflight_v1_v2.sql`. Aucun nom, courriel ou identifiant personnel exporté.

## Compatibilité et intégrité

- `docs/sql/controle_restauration_v1_readonly.sql` donne `COHERENT_A_COMPARER_A_L_ARCHIVE` : ce statut ne prouve **pas** une restauration.
- Les 25 identifiants principaux sont reconnus par les fonctions de partage V1 **et** V2.
- Les 25 identifiants secondaires sont reconnus par `tourneo_public_compat_v2`.
- Les liens /partage/<id> de la V1 historique emploient l'identifiant principal de tournoi (vérifié dans le code `main`).
- Les deux triggers Auth requis sont actifs ; la présence des fonctions et tables V2 essentielles a été vérifiée.
- **Un objet Storage** dans le bucket `tourneo-media`, taille totale **48 191 octets**. Il faut sauvegarder son contenu binaire distinctement des exports SQL.
- Les URLs `tourneo.org` et `www.tourneo.org` fonctionnent, avec HTTPS et redirection 308, suivant la vérification GitHub Actions du 22/11.
- La variable `NEXT_PUBLIC_TOURNEO_PUBLIC_ORIGIN` est configurée pour **Production** sur Vercel mais ne s'applique qu'à un nouveau build de production.

## Points non validés

Aucune sauvegarde Auth + base + Storage réellement restaurée dans un environnement isolé n'a été produite au cours de ce contrôle. Les connexions Google, confirmation d'e-mail et mot de passe oublié sur le nouveau domaine demandent un test réel. Les vérifications de sécurité des RPC V1, des anciennes sessions et de la compatibilité Android restent des conditions de bascule globale. Ce rapport n'autorise aucun déploiement ni modification des données en production.

## Contrôle HTTP exhaustif des anciens liens (22 novembre 2026)

L'API publique `/api/partage?id=<uuid>` retourne un contenu de tournoi avec HTTP **200 pour les 25 identifiants publics** sur `https://www.tourneo.org` ET sur `https://tourneo-app.vercel.app`. Deux pages de tournoi ont également été vérifiées en HTML sur chacun des deux domaines. Aucun identifiant ni contenu utilisateur n'a été conservé dans ce rapport.

Contrôle des droits SQL du même jour : `get_tourneo_public(uuid)` est désormais interdit aux rôles `anon` et `authenticated` (contrairement au constat initial du 19/11). Les nouveaux liens publics passent par une route serveur. L'audit de sécurité des fonctions privilégiées et l'éventuelle compatibilité d'une ancienne APK restent à réaliser avant migration totale.
