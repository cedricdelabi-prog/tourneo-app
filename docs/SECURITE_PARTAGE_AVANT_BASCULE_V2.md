# Tourneo V1 → V2 — sécurité des partages avant publication

Contrôle en lecture seule du **26 novembre 2026**. Aucun changement de base ni de production réalisé par cet audit.

## Constats observés

La production V1 comporte **65 comptes Auth, 65 profils, 67 identités Auth et 25 tournois**. Aucun tournoi orphelin, profil orphelin, lien manquant ou lien dupliqué n'a été détecté pendant l'inventaire agrégé.

Le schéma de test V2 n'est **pas** une copie restaurée de V1. Il ne contient ni les 65 comptes ni les 25 tournois.

Le contrôle des permissions des fonctions PostgreSQL met en évidence un écart majeur :

| Fonction | Production V1 | Base V2 de test |
| --- | --- | --- |
| `public.tourneo_public_v2(uuid)` | `anon` : EXÉCUTION REFUSÉE ; la définition mentionne `est_public` | `anon` : EXÉCUTION AUTORISÉE ; la définition ne mentionne pas `est_public` |
| `public.tourneo_public_compat_v2(uuid)` | Présente, `anon` : REFUSÉE ; mentionne `est_public` | Absente |
| `public.tourneo_partage_web_v2(uuid)` | Présente, `anon` : AUTORISÉE ; utilise un contrôle de partage serveur à auditer | Absente |
| `public.tourneo_pronostics_lecture(uuid)` | `anon` : REFUSÉE, `SECURITY DEFINER` | `anon` : AUTORISÉE, `SECURITY INVOKER` |

**Ces différences ne permettent pas d'autoriser la bascule.** Une fonction pouvant être exécutée sans connexion n'est pas nécessairement une faille, mais son résultat, ses contrôles internes et les fonctions appelées doivent être audités. Inversement, la présence textuelle d'un filtre `est_public` ne prouve pas qu'aucune donnée privée ne sort.

L'API web actuelle `app/api/partage/route.ts` appelle `tourneo_partage_web_v2` avec `TOURNEO_SHARE_SERVER_TOKEN` et refuse la requête si `NEXT_PUBLIC_TOURNEO_V2_PRODUCTION_APPROVED` n'est pas `true`. Il faudra conserver et tester ce chemin, sans exposer le jeton dans le client.

## Conditions non négociables avant toute migration de production

1. Restaurer les **vraies** sauvegardes Auth, public, Storage et binaires dans un environnement Supabase **isolé et dédié**, sans écraser `tourneo-v2-test`.
2. Y appliquer les migrations V2 compatibles V1, sans perdre les colonnes et les liens historiques.
3. Vérifier que les anciens utilisateurs peuvent se reconnecter et que les 25 tournois et liens restent accessibles selon leurs droits.
4. Tester avec un tournoi **privé fictif** qu'un utilisateur anonyme ne peut obtenir ses données ni via `tourneo_public_v2`, ni via les anciennes et nouvelles routes de partage.
5. Vérifier les fonctions `SECURITY DEFINER`, les privilèges `EXECUTE`, les politiques RLS et les contrôles d'autorisation internes ; revérifier avec l'audit Supabase.
6. Répéter le retour arrière et tenir compte des nouvelles écritures créées après la bascule.
7. Ne publier que sur autorisation explicite, après l'ensemble des preuves.

## Contrôle reproductible

Exécuter séparément sur production et test le script de consultation `docs/sql/audit_rpc_partage_v1_v2_readonly.sql`. Il ne contient aucun SQL de modification.

**Ne pas** copier aveuglément les droits ou les fonctions de la base de test vers la production. L'état de référence sûr est à construire et à éprouver sur une copie restaurée de la V1.

Liens utiles : [audit Supabase SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) ; [tests de préparation](../scripts/controle-bascule-v2.cjs).
