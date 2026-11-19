# Tourneo V2 — procédure de publication sécurisée (19/11/2026)

## État vérifié
- Production Supabase V1: gjtxlzhfqcecyfciyllc; 59 auth.users, 59 profiles, 25 tournois.
- Test Supabase V2: kmjfmjhdnokkaiolxiin; 2 auth.users, 1 profile, 0 tournoi.
- V1: 25/25 tournois ont partage_id et est_public=true.
- Snapshot SQL V1: schema tourneo_backup_20261119, tables profiles, tournois, auth_users_inventory (sans mots de passe); comptes 59, profils 59, tournois 25.
- Snapshot SQL ≠ sauvegarde complète Supabase Auth, Storage, secrets, triggers, rôles et politiques.
- Sauvegardes GitHub: backup-v1-avant-v2-2026-11-19 et backup-v2-avant-production-2026-11-19.
- Branche de préparation: release-v2-preparation-2026-11-19; main et tourneo-v2-dev non modifiées.
- lib/supabase.ts sur branche de préparation interdit toute connexion V1 sauf NEXT_PUBLIC_TOURNEO_V2_PRODUCTION_APPROVED=true.

## Bloquants avant publication
1. Export restaurable Supabase V1 (auth, public, storage, policies, fonctions, triggers); vérifier une restauration sur environnement isolé. Ne pas copier les hash de mots de passe dans un fichier Git.
2. Adapter les 34 migrations V2 aux tables V1 existantes. Le script 20261112075950_tourneo_v2_socle_prive.sql utilise CREATE TABLE sans IF NOT EXISTS pour profiles et tournois; ne pas l'appliquer tel quel sur V1. Le script 20261112080022 contient l'avertissement explicite « Ne jamais exécuter ce script sur la base de la V1 ».
3. Conserver les colonnes V1 partage_id, est_public et les anciennes URLs de partage. Vérification du code main: app/partage/[id]/page.tsx transmet l'ID de l'URL à get_tourneo_public(p_id uuid), lequel filtre t.id=p_id (et non t.partage_id). Le code V2 transmet également l'ID à tourneo_public_v2(p_id uuid). Préserver les ID des tournois est donc indispensable. Les champs partage_id restent conservés pour compatibilité avec les autres usages potentiels.
4. Vérifier l'identité des 59 auth.users, les politiques RLS, les triggers, les emails de connexion, la récupération de mot de passe et les profils.
5. Migrer les 25 tournois et valider JSONB (matchs, equipes, résultats, photos), toutes les anciennes URL, médias Storage et les opérations de création/modification.
6. Exécuter les tests applicatifs et tests de sécurité, notamment tests de partage anonyme, absence de fuite de données, permissions organisateur et reprise après déconnexion.
7. Déployer d'abord une préproduction alimentée par une copie de production, pas sur la base V1 en direct.
8. Basculer le site officiel après feu vert et validation de restauration. Mettre à jour l'application Android avec la même signature et le même package; la publication Google Play peut nécessiter une validation du titulaire.

## Retour arrière
- Ne pas supprimer main ni la base V1.
- Revenir au déploiement V1 et restaurer la base seulement après analyse des nouvelles écritures V2 (risque de perdre des changements faits après bascule).
- Surveiller logs Vercel, Auth, erreurs RLS, flux de création tournoi et liens publics.

## Interdictions
- Ne jamais pointer la branche tourneo-v2-dev de test vers la base V1.
- Ne pas activer NEXT_PUBLIC_TOURNEO_V2_PRODUCTION_APPROVED avant que le schéma V1 ait été migré et testé.
- Ne pas prétendre que le snapshot SQL est un backup Auth restaurable.

## Contrainte budgétaire confirmée
- L'utilisateur refuse tout coût supplémentaire; ne pas créer de branche Supabase payante.
- Tarif communiqué par Supabase: 0,01344 USD/heure pour une branche additionnelle, non accepté.
- Utiliser les deux projets existants et la préparation GitHub. Le projet V2 test n'est pas un clone des données V1; ne jamais le présenter comme une restauration de production.
- Toute simulation réaliste nécessitant les 59 comptes exige une sauvegarde/restauration complète sécurisée ou une méthode alternative validée, sans facturation supplémentaire.

## Contrôle complémentaire du 19/11/2026 — lecture seule, aucune bascule

Nouvelle interrogation **en lecture seule** des deux projets Supabase :
- Production V1 : **59 comptes**, **59 profils**, **60 identités Auth** (une personne peut avoir plusieurs fournisseurs), **25 tournois**, **0 objet Storage**. Les 25 tournois possèdent des identifiants de partage non nuls, sans doublon, et sont actuellement publics.
- Test V2 indépendant : **2 comptes**, **1 profil**, **0 tournoi** et **1 objet Storage**. Il s'agit d'un environnement de développement, **pas** d'une copie restaurée de V1.
- Compteurs V1 : **0** tournoi orphelin, profil orphelin, nom incompatible, structure JSON de matchs/équipes invalide, partage manquant ou dupliqué. Ces résultats ne prouvent pas à eux seuls la compatibilité de toutes les fonctionnalités V2.
- En V1, `public.profiles` dispose de ses colonnes historiques et `public.tournois` conserve `partage_id` / `est_public`. Le schéma V2 de test ajoute notamment `ville_publique`, `revision`, `updated_at`, `termine_at`, `photos_expirent_at`; il comporte plusieurs dizaines de tables, politiques et fonctions supplémentaires.

### Commandes préparatoires sans production

- `docs/sql/preflight_v1_v2.sql` : requête **SELECT uniquement**, destinée à la base V1. Aucun nom, e-mail, mot de passe, token, lien individuel ou contenu de tournoi n'est extrait.
- `npm run test:bascule` : vérifie le **blocage volontaire** du lancement sans preuves, puis exécute le **vrai SQL additif de compatibilité**, uniquement dans une base locale synthétique PGlite. Les UUID, données de score et partages fictifs doivent rester intacts ; une donnée invalide doit arrêter le script.
- `npm run preflight:v2` : lit `docs/bascule-v2-preflight.json`, énumère les **prérequis encore non validés** et retourne un code d'erreur lorsque la bascule reste bloquée. **Cette commande ne déploie rien.**
- La CI GitHub V2 exécute les tests de préparation ; elle ne déclenche pas de migration et **une CI verte ne signifie pas autorisation de production**.

### Ordre impératif de la future publication

1. Obtenir une **sauvegarde V1 restaurable et testée** couvrant Auth (identités, fournisseurs et mécanismes de récupération), données, Storage, schémas, RLS, fonctions et triggers. Ne jamais stocker de secrets ni de hashes de mots de passe dans Git.
2. Tester la restauration dans un environnement existant isolé, sans créer d'infrastructure facturée ni écraser les 2 comptes et objets V2 de test. À défaut, ne **pas** lancer la bascule.
3. Sur cette copie, convertir la suite de migrations V2 en **migrations additives compatibles V1**, en préservant les UUID, les colonnes et les URLs historiques. Le script `compatibilite_v1_v2_staging_DRAFT.sql` n'est que la **première phase** : il ne constitue pas la migration V2 complète.
4. Vérifier Auth (email, Google, profils), RLS, partage anonyme filtré, création/modification de tournoi et reprise des 25 tournois existants. Inclure les quatre migrations SQL TV de la base test dans la procédure finale validée.
5. Préparer un retour arrière compatible : revenir au site V1 ne suffit pas si la nouvelle version a écrit des données incompatibles. Prévoir un gel court des écritures ou leur réconciliation.
6. Obtenir un accord explicite pour la fenêtre de publication ; seule alors une configuration de production protégée peut être autorisée. Déployer la V2 sur le domaine officiel, surveiller les erreurs et préparer séparément l'actualisation Android.

**État : BASCULE BLOQUÉE tant que ces preuves ne sont pas réunies.** Aucun champ, table, compte ni privilège de la production V1 n'a été modifié lors de ce contrôle.

## Compatibilité des résultats anciens — audit du 19 novembre 2026

Contrôle SQL de production **en lecture seule** (sans extraire de noms, identifiants ou résultats individuels) : **25 tournois, 613 matchs**, dont **70 matchs avec scores saisis**. Sur les **2 tournois V1** sans `formatTournoi` ni `matchsValides`, **51 matchs** sont présents dont **4 scores saisis**. Les **23 autres** possèdent les champs de format et validation et aucune des 25 lignes de données ne contient `optionsV2`.

Le code V2 utilise désormais `lireValidationsHistoriques` pour les chargements locaux et cloud, ainsi que le partage public. Quand la propriété `matchsValides` est totalement absente, seuls les matchs dont les deux scores entiers sont saisis sont considérés validés à l'affichage. En revanche, une liste `matchsValides` explicite, y compris `[]`, **n'est jamais remplacée ni complétée automatiquement**. Les changements sont en lecture seule : la base V1 n'a pas été mise à jour. Les formats inconnus continuent d'utiliser le repli historique `complet` dans l'interface. Les options V2 sont normalisées par l'application.

Il faut ensuite confirmer, sur une copie restaurée, que les podiums et classements historiques restent exacts ; ces vérifications fonctionnelles sur données réelles ne sont pas encore faites.

## Préparation d'un export sécurisé sans frais supplémentaires

Script Windows préparé : [scripts/sauvegarder-v1-prive.ps1](../scripts/sauvegarder-v1-prive.ps1). Procédure et limites : [SAUVEGARDE_V1_GRATUITE.md](SAUVEGARDE_V1_GRATUITE.md). Aucun export de données réelles n'est déclenché par la CI ou par ce dépôt ; la preuve `sauvegardeRestaurableComplete` du manifeste reste `a_faire` tant qu'un export réel et une restauration isolée ne sont pas vérifiés.

## Dernier contrôle dynamique de V1 — 19 novembre 2026

Nouveau relevé en lecture seule : **59 comptes, 59 profils, 60 identités Auth et 24 tournois**, contre 25 tournois recensés plus tôt. Aucun tournoi n'a été modifié par notre contrôle. Les 24 tournois actuels sont publics, ont un identifiant de partage distinct, et répondent au RPC V1 avec leur **ID canonique** ; ce RPC n'accepte pas les alias `partage_id`. Le RPC V2 de compatibilité vise précisément les deux formats de lien ; cela devra être confirmé sur copie isolée. La vérification des liens est décrite dans `docs/sql/preflight_partages_v1_v2.sql`.

**Nouvelle obligation de bascule** : prouver que l'inventaire final de V1 a été refait et comparé à la sauvegarde restaurable juste avant l'opération. Le chiffre 24 n'est pas une valeur figée ni une preuve de restauration.

## Deuxième phase additive V1 → V2 — reprise de la branche de préparation

Les fichiers `docs/sql/compatibilite_v1_v2_staging_PHASE2_SOCLE.sql` et `docs/sql/verification_socle_phase2_staging.sql` sont intégrés à la branche V2. Ils ajoutent `player_results`, un bucket privé `tourneo-media` et l'espace de fonctions privé **uniquement sur une copie restaurée de V1**, après la phase 1. Ils contrôlent le trigger de création de profil, les UUID des tournois et leurs anciens liens. Ils refusent une exécution sans un drapeau local de confirmation de staging et refusent de refaire aveuglément l'installation. Les tests `tests/migration-socle-v2.cjs` tournent sur des identités, scores et liens fictifs, sans toucher à Supabase V1 ni à la base V2 de test. **Ce n'est pas encore la migration complète** : les migrations applicatives suivantes doivent être adaptées aux tables V1 conservées avant toute bascule.

## Phase 3 applicative : installations uniquement sur une copie restaurée

Le fichier `docs/sql/compatibilite_v1_v2_staging_PHASE3_APPLICATIF.sql` reprend la création des six tables V2 d'inscriptions, événements et arbitrage, leurs fonctions métier et politiques RLS, tout en conservant les anciens comptes, profils, scores et URLs de partage. Son installation exige la phase 2, une copie V1 restaurée et un drapeau de confirmation défini manuellement sur cette connexion de staging. L'installation est transactionnelle et refuse une réinstallation ou un schéma partiel.

Le script **exclut volontairement** `tourneo_public_v2` : cette fonction doit être adaptée et protégée par `est_public` avant activation des liens publics. Les nouveaux RPC liés aux inscriptions et arbitres sont encore à tester en conditions réelles sur une copie complète, puis sous les rôles anonymes et authentifiés.

`tests/migration-applicatif-v2.cjs` valide cette phase sur des utilisateurs fictifs PGlite, et `docs/sql/verification_phase3_staging.sql` vérifie, en lecture seule, les protections des tables et des RPC. Ce n'est ni une sauvegarde, ni une autorisation d'installer la V2 sur la production, ni la fin des migrations : notifications, albums, TV et autres modules restent à adapter.

## Phase 4 applicative : notifications et préférences sur staging

Le fichier `docs/sql/compatibilite_v1_v2_staging_PHASE4_NOTIFICATIONS.sql` prépare trois autres tables V2 (`tourneo_preferences`, `tourneo_notifications`, `tourneo_evaluations`), les triggers d'alertes et de consentement, les contrôles de droits ainsi que les index et politiques de la phase 3.

Cette phase exige explicitement les phases 1 à 3 et une copie V1 restaurée et validée. Elle conserve les tables et valeurs historiques, refuse un partage manquant ou une réinstallation et ne touche pas au RPC de partage public. Les tests `tests/migration-notifications-v2.cjs` exécutent le véritable SQL sous PGlite avec des comptes fictifs, vérifient une notification d'arbitrage et la prise en compte du consentement. Les données de production n'ont pas été utilisées.

La fonction de partage public et les migrations restantes (TV, photos, clubs, album, règlements, statistiques, etc.) doivent encore être intégrées dans un ordre vérifié, puis réessayées sur une véritable copie restaurée avant tout feu vert de production.

## Phase 5 de partage V1/V2 : projection publique avec filtrage obligatoire

Le script `docs/sql/compatibilite_v1_v2_staging_PHASE5_PARTAGES.sql` crée sur une copie V1 restaurée les deux nouveaux RPC de partage (ID de tournoi V1 ou ancien `partage_id`). Il réutilise la projection V2 qui masque les références internes des participants et applique obligatoirement le filtre `est_public=true` au RPC direct et au RPC de compatibilité.

Le script conserve temporairement le RPC brut V1 `get_tourneo_public` pour ne pas casser les anciennes installations avant leur retrait contrôlé. **Cette ancienne fonction doit être désactivée uniquement après migration et retrait de tous les anciens clients**, selon `docs/sql/desactiver_rpc_v1_non_filtre_post_migration.sql`. L'installation phase 5 refuse un doublon de lien, un partage manquant, une étape précédente absente ou une exécution sans confirmation explicite du staging.

Le vrai SQL est éprouvé par `tests/migration-partages-v2.cjs` sur PGlite avec comptes et tournois fictifs : les deux formats de liens, le refus des tournois privés, le masquage du JSON interne et les privilèges anonymes. Ces contrôles ne valident ni une restauration réelle ni la mise en service sur le site public.

## Phase 6 — clubs, accompagnateurs et langues sur staging

`docs/sql/compatibilite_v1_v2_staging_PHASE6_GROUPES_LANGUES.sql` intègre les tables de clubs, membres et participants, les politiques RLS et le partage d'un groupe via un code joueur. Cette phase reprend les règles de quota des groupes et vérifie que seule une personne autorisée peut les gérer. Elle ajoute aussi la préférence de langue **FR/EN/NL/DE**, et retire l'accès anonyme direct à `player_results` pour protéger les résultats personnels.

L'installation est **interdite sur la production V1** : le script exige une copie restaurée, les phases précédentes et un drapeau explicite défini manuellement sur la connexion de staging. Aucune ligne des tables historiques n'est mise à jour. Les tests exécutent le vrai SQL sur une base fictive PGlite, avec vérification des refus d'accès, des langues et du maintien des anciens partages. `docs/sql/verification_phase6_staging.sql` rassemble les contrôles SQL en lecture seule.

**Toujours à faire avant publication** : sauvegarde V1 réelle et restaurée dans un environnement indépendant, adaptation des migrations applicatives restantes, essais des parcours réels (dont la caméra et Android), sécurité du retrait de l'ancienne API, autorisation finale explicite. La CI verte ne prouve pas à elle seule que la bascule est prête.

## Phase 7 — recherche de joueurs protégée

`docs/sql/compatibilite_v1_v2_staging_PHASE7_PROFILS.sql` fournit le RPC `tourneo_profils_publics` nécessaire aux écrans Joueur et Groupes. Il est réservé aux utilisateurs connectés, et limite les informations au pseudonyme, au code joueur et à la couleur. L'avatar est systématiquement masqué (`null`) : ni ville, ni nom civil, ni email, ni photo privée ne sont retournés. La recherche par lot est bornée à 256 identifiants.

Le script refuse toute exécution sans validation explicite de la copie V1 restaurée et les phases 1 à 6. Le test `tests/migration-profils-v2.cjs` utilise des profils fictifs pour vérifier les droits anonymes, les champs cachés et les limites. Aucun changement de profil en production n'est autorisé par cette préparation.

## Phases 8 et 9 sur staging isolé : tennis et olympiades

**Phase 8** : `docs/sql/compatibilite_v1_v2_staging_PHASE8_TENNIS.sql` reprend les propositions de résultats en manches de tennis et sécurise les accès arbitres. Les règles de scores sont contrôlées côté SQL ; les visiteurs anonymes et les personnes non arbitres ne peuvent pas proposer un résultat. Test : `tests/migration-tennis-v2.cjs` avec comptes fictifs.

**Phase 9** : `docs/sql/compatibilite_v1_v2_staging_PHASE9_OLYMPIADES.sql` prépare les olympiades et le suivi de révision des tournois. Le partage public des olympiades est limité aux noms d'équipes, épreuves validées et mesures, avec pseudonymisation des identifiants internes. Le wrapper public filtré garde l'accès au schéma privé fermé pour `anon` : l'ancienne migration V2 accordait cet accès, ce que le script de compatibilité évite. Test : `tests/migration-olympiades-v2.cjs`.

Ces scripts exigent toujours une **copie V1 restaurée et confirmée sur un staging indépendant**, conservent les lignes historiques, refusent les migrations partielles et sont éprouvés sur une base locale fictive PGlite. Ils ne constituent pas une restauration des comptes réels, une validation mobile sur appareils réels ou une autorisation de déploiement. Les migrations additionnelles (photos, compte/admin, albums, notification externe, TV, pronostics et discussions) restent à ordonner et adapter.

## Phase 10 — appels au match et modèles d'affiches personnels

`docs/sql/compatibilite_v1_v2_staging_PHASE10_APPELS_AFFICHES.sql` prépare les **appels internes des participants** (dans l'application et non des notifications push garanties sur un téléphone) ainsi que la **conservation de modèles d'affiches personnels**. Elle reprend les migrations V2 existantes avec leurs contrôles organisateur, anti-doublon, limite de fréquence, consentement aux alertes, RLS et protection des modèles. Les anciennes données de la V1 restent intactes.

Le script exige une **copie V1 réellement restaurée**, une confirmation manuelle sur cette connexion, les neuf premières phases installées et la présence des anciens identifiants de partage. `tests/migration-appels-affiches-v2.cjs` simule les appels entre comptes et vérifie les interdictions anonymes et les modèles privés, sur une base PGlite fictive. `docs/sql/verification_phase10_staging.sql` permet le contrôle de la copie restaurée en lecture seule.

Important : aucun appel réel n'a été envoyé et aucune photo ou affiche de production n'a été lue, créée ou modifiée. Les tests automatiques ne remplacent pas les essais sur une restauration authentique de la V1 ni la validation des clients existants avant la bascule.

## Phase 11 — espace personnel du joueur, sans album photo

`docs/sql/compatibilite_v1_v2_staging_PHASE11_JOUEURS.sql` ajoute à la copie V1 restaurée l'accès `tourneo_mes_participations` : un utilisateur connecté ne consulte que les rencontres où son profil participe. Le résultat transmet les adversaires, le terrain et les scores **validés**, pas le JSON historique complet ni les contacts privés. L'appel est interdit aux visiteurs anonymes. L'album photo est volontairement **exclu**, car ses règles de stockage, d'expiration et de partage nécessitent une phase de sécurité distincte.

`tests/migration-joueurs-v2.cjs` reproduit les contrôles sur PGlite et des joueurs entièrement fictifs : refus anon, absence de JWT, accès aux seuls matchs du joueur, exclusion des autres rencontres et préservation des données V1. Il ne remplace pas un essai de restauration réelle. Le contrôle SQL agrégé en lecture seule est `docs/sql/verification_phase11_staging.sql`.

## Phase 12 — album privé et conservation des photographies

`docs/sql/compatibilite_v1_v2_staging_PHASE12_ALBUM_PRIVE.sql` prépare le stockage privé, la table d'album du propriétaire, la limite de 200 photos, le refus d'accès anonyme et la conservation des photos : 15 jours pour un tournoi classique, 90 jours en mode expert après sa fin. Le script ne recrée pas les colonnes de conservation déjà présentes depuis la phase 1. Les règles Storage refusent aussi la création ou modification de fichiers sur un tournoi expiré.

Un script distinct recense les objets à supprimer ; **la suppression physique doit obligatoirement passer par l'API Storage**, et non par un `DELETE` SQL. Le déclenchement et l'exploitation opérationnelle de la tâche de nettoyage (Edge Function / Cron) restent à vérifier sur un environnement réel avant publication.

Le test `tests/migration-album-prive-v2.cjs` applique le vrai SQL sur PGlite avec des utilisateurs fictifs : droits du propriétaire, refus d'un autre utilisateur, expiration des fichiers, préparation de la purge, conservation des données V1 et refus d'exécution sur une mauvaise copie. `docs/sql/verification_phase12_staging.sql` produit les contrôles agrégés.

**Aucun partage public d'album n'est activé à cette étape.** La publication volontaire de photos dérivées nécessite une phase de migration séparée, notamment pour éviter la consultation ou le référencement d'originaux privés.

## Phase 13 — album public uniquement avec partage volontaire

`docs/sql/compatibilite_v1_v2_staging_PHASE13_ALBUM_PARTAGE.sql` ajoute l'option de publication d'un album de tournoi **sur une copie V1 restaurée**, après les 12 premières phases. La configuration est privée et `partage=false` par défaut. Les photographies originales demeurent dans des chemins privés ; l'API publique renvoie uniquement le chemin de l'aperçu décoré et, si l'organisateur active le téléchargement, le chemin de sa copie dérivée habillée. La politique Supabase Storage permet uniquement le GET explicite des fichiers partagés : elle refuse la liste, la signature et les photos d'origine.

L'installation est transactionnelle. Les protections définitives de l'aperçu remplacent les helpers transitoires **avant le COMMIT**. Le RPC de consultation publique fonctionne sans attribuer au rôle `anon` l'accès au schéma privé. Une désactivation du partage ou la fin de la conservation ferme la lecture Storage. Aucune ligne V1 existante n'est modifiée.

Le test `tests/migration-album-partage-v2.cjs` exécute le vrai SQL et simule les opérations Storage sur PGlite avec des utilisateurs, photos et tournois fictifs ; `docs/sql/verification_phase13_staging.sql` fournit l'audit SQL en lecture seule. Ces tests **ne valident pas encore** le comportement du service Storage réel ni la répétition sur une sauvegarde réelle de V1, nécessaires avant publication.

## Phase 14 — planning public / TV et compatibilité des anciens liens

Le script `docs/sql/compatibilite_v1_v2_staging_PHASE14_PLANNING_PUBLIC.sql` adapte la projection V2 des tournois pour rendre visibles les horaires aménagés, terrains fermés, affectations des matchs et manches, tout en limitant strictement les champs exposés. Il refuse un tournoi avec `est_public=false` **même quand l'identifiant direct ou son ancien `partage_id` est connu**. Les contacts, métadonnées privées et identifiants internes des participants ne font pas partie du résultat.

La fonction de partage historique V1 `get_tourneo_public` est **conservée temporairement** pendant cette préparation et devra être désactivée au bon moment. Ce point de transition reste un bloqueur pour la mise en production ; le script ne modifie ni ne désactive cette API encore utilisée par la V1.

`tests/migration-planning-public-v2.cjs` rejoue les phases 1 à 14 sur un PGlite fictif et compare les anciens liens avec les projections V2. Il vérifie les horaires autorisés, le filtrage des données privées, le refus des tournois cachés, le maintien des UUID et scores V1, et l'arrêt transactionnel en cas de liens manquants. `docs/sql/verification_phase14_staging.sql` est un contrôle de staging en lecture seule.

La migration reste **interdite** sur la production V1 et sur la base V2 de test existante. Une sauvegarde réelle, sa restauration puis des tests sur un environnement indépendant sont indispensables avant toute bascule.
