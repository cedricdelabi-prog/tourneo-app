# Revue du 17 novembre 2026

## Continuité V1 → V2 avant lancement

Exigence : aucun utilisateur ne doit recréer son compte, son profil ou ses tournois. Les mots de passe ne doivent pas être réinitialisés par défaut. La V1 demeure active pendant les essais.

La base de test V2 est indépendante : elle ne contient pas automatiquement les comptes et tournois de production. Ne pas substituer cette base vide à la production.

Stratégie privilégiée à valider en répétition : mettre à niveau la base de production existante avec des migrations compatibles, puis déployer le code V2. Les identifiants auth et les relations restent en place. La protection actuelle de lib/supabase.ts limite volontairement cette branche à la base V2 : une configuration de production distincte et revue sera nécessaire au lancement ; ne pas enlever cette protection pendant les essais.

Si une migration vers un autre projet est finalement retenue, elle doit préserver auth.users, les identités des fournisseurs et les mots de passe hachés, les UUID, profiles, tournois/donnees et toutes les relations (inscriptions, arbitres, scores, groupes, messages, préférences, photos, droits). Le déplacement des objets Storage et des références de médias est distinct de la copie des tables. Aucune fusion de comptes par simple correspondance de nom. Les comptes de test V2 ne doivent jamais écraser des comptes V1 ; établir une correspondance explicite pour tout conflit.

Avant bascule : sauvegarde restaurable et répétition isolée ; inventaire des schémas V1 réels et analyse des migrations (pas d'exécution aveugle du SQL consolidé) ; contrôles des nombres, UUID et relations ; connexion d'un compte V1 e-mail et d'un compte Google ; reprise d'un tournoi existant et de ses photos, liens publics historiques, Android et Web ; gel temporaire des écritures ou rattrapage des changements de dernière minute ; retour arrière testé. Une reconnexion peut être nécessaire si le projet d'authentification change, sans recréer le compte.

Référence : https://supabase.com/kb/troubleshooting/migrating-auth-users-between-projects

Aucune bascule V1, lecture de mots de passe hachés, copie de données réelles ou migration de production effectuée dans cette révision.

## Paramètres du compte

Section Connexion et sécurité dans Mon profil : mot de passe actuel + nouveau confirmé ; modification d'e-mail via confirmations Supabase ; lien de réinitialisation ; explication pour Google ; accès aux informations de confidentialité et suppression. Profil, photo, ville, couleur, langue et préférences restent dans leur section existante. Aucun secret ajouté aux fichiers ni aux journaux.

## Participants puis répartition

Saisie/import et récupération des inscriptions acceptées dans la même liste. La roue ne demande plus une seconde saisie : validation de liste, choix du nombre d'équipes, tirage, application, puis modification des équipes. Les identifiants des inscriptions sources sont conservés pour éviter de réajouter les joueurs au lancement. Un changement d'inscriptions après constitution des équipes bloque le lancement et demande de reprendre la liste. Nouvelle migration SQL requise : 20261117090000_equipes_inscriptions.sql.

## Écran TV

Communication → Écran TV. La TV est une fenêtre séparée dans le même profil Chrome, sur un écran étendu. Résultats sur plusieurs pages, classement basé sur les matchs validés, appels explicites de l'organisateur, pause et message libre, choix du temps de lecture (10 à 60 secondes), navigation manuelle, plein écran. Actualisation des données toutes les 15 secondes ; avertissement réseau et dernières données conservées en cas d'erreur.

Les commandes locales sont synchronisées entre les fenêtres du même navigateur. Aucun partage public supplémentaire n'est ouvert. Ce mode exige le compte propriétaire, un tournoi enregistré et une TV reliée au même ordinateur. Il ne transmet pas vers une TV distante. La pause d'affichage ne recalcule pas le planning. Les horaires prévisionnels ne sont pas des appels de joueurs.

## Validation

Tests unitaires : pagination intégrale TV, contrôle des annonces, suppression d'un appel terminé, récupération des inscriptions, absence de doublons, changements de liste après tirage. Tests SQL : refus d'un lancement qui omet une inscription, acceptation de la même inscription répartie dans une équipe. Tests navigateur préparés (API simulée) pour deux fenêtres, pause/reprise, appel, pagination et changement de mot de passe ; exécution et inspection visuelle encore nécessaires.

## Vérifications navigateur effectuées le 17 novembre

Après autorisation explicite du transfert du code seul, tests Chromium dans un environnement Vercel temporaire, comptes/données/API fictifs :
- 390 et 1920 px : commandes et fenêtre TV synchronisées, appel choisi, pause/reprise, pagination des résultats et du classement.
- 390 et 1920 px : refus de mots de passe différents avant tout appel API, modification confirmée par API simulée.
- 390 et 1920 px : ajout de quatre participants, validation, roue sans nouvelle saisie de noms, répartition sans omission, application et accès aux modifications ; aucun débordement horizontal.
- 320 et 1366 px : conseils logos/sponsors visibles, sponsor horizontal gardant son rapport largeur/hauteur, exports A4 2480 × 3508 et A3 3508 × 4961 pixels, aucun débordement horizontal.

Images de test inspectées : écran TV grand format et page d'affiche. La révision TV utilise quatre matchs par page et masque le pied de page général sur la fenêtre de projection. Pas d'essai physique HDMI/TV, Android ou Safari dans cette série. Les tests ne modifient aucun mot de passe réel. Les migrations V2 nouvelles et cette révision du code n'ont pas été déployées.

## Refonte de lisibilité du 17 novembre — après les captures utilisateur

Typographie de gestion harmonisée (texte courant 16 px, informations secondaires au moins 14 px, titres principaux réduits, famille commune). En-tête compact ; retour intégré à la ligne de navigation. Tournoi : accès direct Écran TV à côté de Partager ; trois vues principales Matchs / Classement / Communication, autres vues dans un menu. Les règles, annonces et imprévus restent accessibles dans Organisation et aides. Les informations de pronostics sont limitées à Communication ; les instructions de match ne s'y répètent plus. La prochaine action n'est affichée que si une vérification ou un bilan est nécessaire.

Intégration de la dernière version publiée c5899b3 : modération et signalement des discussions, traductions, saisies numériques, reprise des étapes et corrections conservées. Le code V2 local avait divergé de cette version ; aucune publication de l'ancien état n'a été faite.

Contrôles après intégration : compilation et TypeScript, tests de parcours et SQL (y compris modération et inscriptions en équipes). Le nouveau contrôle visuel mobile reste à exécuter : le transfert source vers l'environnement temporaire a été refusé par la validation automatique malgré l'autorisation antérieure de l'utilisateur ; l'environnement a été arrêté. Ne pas présenter les tests navigateur de la révision précédente comme validation de cette dernière refonte.
