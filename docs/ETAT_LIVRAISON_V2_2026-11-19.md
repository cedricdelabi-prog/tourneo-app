# Tourneo V2 — décision de livraison et audit réel du 19 novembre 2026

## Ce qui fonctionne déjà

- **Interface V2 testable** : https://tourneo-v2-test-git-tourneo-v2-dev-tourneo.vercel.app (authentification Vercel possible). Dernier aperçu Vercel **READY** au commit `9fcdb3a`.
- **Dernière validation du code V2** : commit `9fb9e2e`, [GitHub Actions réussie](https://github.com/cedricdelabi-prog/tourneo-app/actions/runs/44587366256). Entre la compilation disponible et ce commit, aucune modification de l'interface ; seuls SQL de migration, tests et documentation ont changé.
- **17 scripts de migration validés sur base fictive PGlite**, tests navigateur TV, tests mobile simulés, compilation Next.js réussis. Ceci **ne prouve pas** une migration Auth réelle ni une publication des scripts sur la base de test ou V1.
- Un nouveau déploiement Vercel de prévisualisation a renvoyé `402 api-deployments-free-per-day` (quota gratuit de plus de 100 créations sur 24 h). Ne pas payer et ne pas multiplier les builds ; l'aperçu précédent reste disponible.

## Inventaire V1 vérifié en lecture seule

Le 19 novembre 2026, sur le projet de production existant, sans export d'informations privées :

| Vérification | Constat |
| --- | ---: |
| Comptes Auth | 59 |
| Profils publics | 59 |
| Identités Auth | 60 |
| Tournois | 24 |
| Tournois publics | 24 |
| Liens de partage présents | 24 |
| Objets Storage | 0 |
| Tournois orphelins / profils orphelins / comptes sans profil | 0 |
| Liens manquants / dupliqués | 0 |
| JSON de tournois, équipes et matchs malformés | 0 |
| Noms de tournoi ou de profil incompatibles | 0 |

Le projet **V2 de test**, totalement distinct, possède 2 comptes, 1 profil, 2 identités Auth, 0 tournoi et 1 objet Storage. Un de ces comptes n'a pas de profil : avant les tests à deux comptes, vérifier le parcours de création du profil. **Ne pas restaurer la V1 sur ce projet test sans préserver ses données.**

La lecture du schéma confirme que le RPC historique `public.get_tourneo_public(uuid)` est `SECURITY DEFINER`, exécutable par le rôle `anon`, et retourne la colonne JSON brute `donnees` sans clause `est_public`. Tous les 24 tournois V1 étaient marqués publics lors de ce contrôle ; cela n'élimine pas le risque de divulgation de champs privés à l'intérieur du JSON. **Ne pas retirer cette fonction à chaud : ses anciens liens doivent rester fonctionnels jusqu'à une migration contrôlée.** Les scripts de durcissement prévus devront être essayés sur une vraie copie, puis associés à la bascule.

## Les trois seuls chantiers restants pour la livraison

1. **Essai réel de l'interface V2 existante** avec des comptes et tournois fictifs : création, cockpit/TV, sponsors, scores, lien public, mobile. [Guide de test](V2-PREMIER-TEST.md). Cette validation ne doit pas être annoncée comme faite avant des essais réels.
2. **Sauvegarde privée complète de la V1 + restauration indépendante** avant de lancer une migration sur le projet original. Script [Windows prêt à l'emploi](../scripts/sauvegarder-v1-prive.ps1), instructions [sans abonnement](SAUVEGARDE_V1_GRATUITE.md). Aucune sauvegarde réelle ni restauration n'a été exécutée dans cette conversation. Le contrôle d'inventaire restera `a_faire` tant que les chiffres n'auront pas été rapprochés de cette sauvegarde.
3. **Répétition sur la vraie copie restaurée**, vérification des anciens logins, liens, sécurité RLS et RPC publique, Android, retour arrière et accord final explicite. Aucune bascule ou modification de `main` ne peut être déclenchée par la réussite des tests fictifs.

**Statut : V1 inchangée ; déploiement de production interdit ; pas de coût supplémentaire.**

Les preuves détaillées et les blocages automatiques restent dans `docs/bascule-v2-preflight.json`. Ce rapport ne remplace pas un essai de restauration ou une autorisation de mise en ligne.
