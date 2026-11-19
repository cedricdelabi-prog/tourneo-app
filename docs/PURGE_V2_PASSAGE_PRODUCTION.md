# Tourneo V2 — Nettoyage des photos : protection contre les mauvais projets

Cette préparation est réalisée **sans déploiement, sans tâche programmée et sans modification de V1**.

## Problème résolu
La fonction Edge \`purge-photos-v2\` de V2 était fixée à la référence du projet de test \`kmjfmjhdnokkaiolxiin\`. Elle n'aurait pas fonctionné telle quelle lors d'une migration vers le projet V1 \`gjtxlzhfqcecyfciyllc\`. Le contrôle \`config.mjs\` impose désormais l'égalité exacte entre \`SUPABASE_URL\` et \`TOURNEO_PURGE_PROJECT_REF\` (avec HTTPS, sans autre domaine). Si la variable de référence n'est pas renseignée, le défaut reste **strictement le projet V2 de test**, afin d'empêcher toute activation implicite en production.

## Avant toute activation
1. Sauvegarder réellement les comptes, tournois et objets Storage V1, puis restaurer le tout sur une base isolée.
2. Appliquer les phases de migration et en vérifier toutes les règles RLS / Auth / Storage.
3. Déployer le worker sur **le projet de destination validé**, avec la variable secrète de référence \`TOURNEO_PURGE_PROJECT_REF\` alignée sur son \`SUPABASE_URL\`; ne jamais mettre une clé \`service_role\` dans le client web.
4. **Ne pas réutiliser** le SQL de programmation \`supabase/migrations/20261112095634_tourneo_v2_purge_photos_horaire.sql\` : son endpoint est fixé au projet V2 de test. Préparer un déclenchement pg_cron/pg_net spécifique au projet validé, après accord explicite.
5. Tester un job à jeton éphémère et à usage unique. Les suppressions physiques doivent passer par l'API Supabase Storage, jamais un \`DELETE\` dans \`storage.objects\`. Vérifier le refus d'un jeton rejoué, les erreurs de suppression et la récupération lors d'une nouvelle exécution.

**Statut :** contrôle de destination et tests simulés ajoutés. Aucun Cron de purge n'est créé ni lancé dans cette étape ; l'activation automatique et la restauration réelle restent **à faire**.
