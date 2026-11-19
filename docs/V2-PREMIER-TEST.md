# Premier parcours de test V2

## Tester dès maintenant — interface déjà en ligne (19 novembre 2026)

**Lien stable de la V2 de test :** https://tourneo-v2-test-git-tourneo-v2-dev-tourneo.vercel.app

Dernier aperçu Vercel confirmé **READY** : commit `9fcdb3a`, projet **tourneo-v2-test**. Le code actuel de développement (`9fb9e2e`) a **exactement les mêmes écrans** : la comparaison GitHub ne montre depuis cet aperçu que des ajouts de tests, de documentation et de scripts SQL. Les phases SQL 15 à 17 ne sont **pas appliquées sur la production V1**.

L'aperçu est protégé par la connexion **Vercel Authentication** : si une page de connexion Vercel apparaît, ouvrir le lien avec le compte Vercel ayant accès au projet Tourneo. Ne pas désactiver la protection ni publier de clé privée. En cas d'accès refusé, noter le message exact.

La base **Supabase V2 de test** est différente de la V1. Les comptes et tournois de la production ne sont pas recopiés dans cet aperçu : utiliser uniquement un **compte de test V2** et des noms fictifs. Ne pas essayer d'y retrouver directement ses 24/25 anciens tournois.

### Parcours prioritaire (15 à 30 minutes selon ton rythme)

1. **Compte et tournoi :** se connecter ou créer un compte *de test* V2 ; créer « Essai Tourneo V2 » en championnat avec A, B, C et D. Vérifier les **6 rencontres**.
2. **Pilotage organisateur :** ouvrir le tableau de bord du tournoi, les rencontres, les filtres de statut et la validation d'un score ; vérifier le classement puis recharger la page.
3. **Identité :** dans les réglages/Communication, placer un **logo fictif** et deux **sponsors fictifs**, puis vérifier leur réutilisation dans les visuels et la TV sans les saisir plusieurs fois.
4. **Écran TV :** ouvrir l'affichage TV dans un autre onglet ou navigateur connecté au projet de test. Essayer l'affichage des matchs, du classement et des sponsors ; vérifier la lisibilité à distance.
5. **Pause / annonces :** depuis le pilotage, essayer la pause, le compte à rebours, un message « Buvette ouverte » et la reprise. Le son de reprise peut demander un clic préalable à cause des règles des navigateurs.
6. **Lien public :** tester le lien de partage du tournoi avec des participants fictifs ; vérifier qu'il montre des informations sportives, pas des paramètres privés ni une possibilité de modifier les scores.
7. **Téléphone :** parcourir l'interface V2 sur mobile, rechercher les commandes organisateur et signaler les textes trop petits ou les débordements. Les essais Chromium ne remplacent pas un test physique Android/iPhone.
8. **En option :** avec un second compte de test, essayer les inscriptions, les appels internes et les discussions. Les alertes internes ne garantissent pas un push lorsque l'application est fermée.

**Retour de test :** indiquer l'écran, ce que tu as fait, ce qui s'est affiché et ce que tu attendais ; une capture d'écran est utile, sans mot de passe, identité réelle ni donnée privée.

### Blocage constaté, sans paiement

L'API Vercel a refusé la création d'un **nouvel** aperçu avec `402 api-deployments-free-per-day` : plus de 100 créations sur la période gratuite, reprise annoncée après 24 h. **L'aperçu READY ci-dessus fonctionne comme version de test existante** ; aucun abonnement n'est requis pour le consulter. La publication du dernier commit sera à retenter lorsque le quota gratuit le permettra, en **un seul lot**.

**Ne pas confondre validation de l'interface et bascule officielle :** il reste à sauvegarder réellement la V1, restaurer sur un staging indépendant, y rejouer les scripts compatibles, vérifier Auth/RLS/Storage et valider le retour arrière avant toute mise en production.

---

Utiliser uniquement l'aperçu de la branche `tourneo-v2-dev`. Actualiser la page après chaque mise à jour.

1. Connexion/inscription : le mot de passe est masqué par défaut. Cliquer sur l'œil barré affiche le texte sur l'appareil ; recliquer, quitter le champ ou changer d'onglet le masque. La valeur saisie doit rester identique.
2. Envoi : après un clic sur Se connecter/Créer mon compte, le texte du bouton et le message indiquent l'action en cours. Le bouton et le formulaire sont bloqués pendant la requête. Une erreur est rouge, une confirmation est verte. Le formulaire doit aussi fonctionner avec Entrée. Ne pas multiplier les créations de comptes pour tester.
3. Tournoi : créer « Test V2 », format championnat, avec quatre participants A/B/C/D. Six rencontres sont attendues. Saisir et valider les résultats ; vérifier le classement puis actualiser la page pour vérifier la sauvegarde.
4. Partage : ouvrir le lien du tournoi dans un nouvel onglet. Vérifier les noms, scores et classement, sans commande de modification des résultats. L'aperçu Vercel peut demander une connexion Vercel avant d'ouvrir l'application.

Pour signaler un problème : indiquer l'étape, l'action, le résultat obtenu et le résultat attendu ; joindre une capture sans mot de passe visible.

Les délais de conservation des photos sont testés automatiquement : ne pas attendre 15 ou 90 jours pour ce premier parcours. Les essais avec de vrais comptes, les mails de confirmation et les parcours multi-appareils complètent les vérifications du code.

Appels dans Tourneo : ajouter son propre profil et un joueur sans profil à un tournoi de test, puis ouvrir « Annonce sur place ». Le panneau distingue l’annonce orale de l’envoi dans Tourneo. Vérifier les états par joueur ; un joueur sans profil reste à prévenir sur place. Pour un appel vers son propre profil, l’état doit passer à « Déposé » après le clic explicite, apparaître dans Activité, puis devenir « Marqué comme lu » après cette action côté destinataire et une actualisation côté organisateur. Une actualisation de l’état ne doit jamais envoyer un appel. Ne pas attendre un SMS, un e-mail ou un push application fermée.
