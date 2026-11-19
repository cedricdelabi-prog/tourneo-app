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
