# Retours du 13 novembre — rôles, arbitrage et photos

Développement ajouté au suivi initial des 85 évolutions. Ces ajouts ne changent pas artificiellement la numérotation.

## Écrans par rôle

Le menu Mon espace choisit Organisateur, Joueur ou Arbitre. Arbitre n’apparaît que pour un compte désigné. Une personne peut cumuler les rôles. Ce choix modifie la navigation, jamais les permissions serveur. Le joueur voit uniquement ses rencontres et les résultats validés, sans la configuration du tournoi ni les données privées des autres profils.

## Arbitrage

La gestion des arbitres sort des Statistiques et rejoint l’onglet Arbitrage. Les résultats reçus sont séparés de l’ajout d’arbitres, replié dans Gérer les arbitres. Les noms remplacent les numéros quand le profil est disponible. L’arbitre ouvre son match, compte les points ou utilise le chrono, reporte le résultat ou le saisit à la main, puis le transfère. Le transfert n’est jamais une validation officielle.

L’organisateur choisit Vérifier ce résultat, retrouve le score dans Matchs puis clique Valider ce résultat. La validation automatique au simple changement de champ est retirée afin que la décision soit explicite. Les règles de score et la progression du tableau restent communes. Une proposition modifiée entre affichage et import n’est pas importée silencieusement.

## Photos

Nouvel onglet Photos dans le tournoi de l’organisateur. Boutons Prendre une photo et Ajouter depuis mon appareil, légende facultative et galerie. Images redimensionnées en JPEG (métadonnées de caméra retirées) ; stockage privé existant, URL temporaire. Album réservé au propriétaire, pas de publication automatique aux joueurs/arbitres. Conservation existante après fin : 15 jours, 90 jours en mode Expert. La caméra du profil reste distincte.

## Validation

SQL migrations et activation consolidée : permissions propriétaire/joueur/étranger, exclusion des champs privés et des scores non validés, album privé et refus des ajouts par un joueur. Parcours Chromium avec API simulée à 320/390/768/1366 px. Moteur, parcours existants, TypeScript et compilation Next vérifiés. Android debug compile avec les notifications natives désactivées en l’absence de Firebase.

Les essais de caméra physique, Safari/iPhone et appel entre deux sessions réelles restent à faire. WebKit local indisponible faute de bibliothèques système.

Compteur reconstitué : 81 développés, 3 à tester, 1 partiellement développé. E-mail/Firebase exigent une configuration du propriétaire ; aucun secret demandé en clair dans la conversation.

Activation V2 confirmée : migrations Android 20261113080537, correction safe-update 20261113082255 et espaces/album 20261113082655 appliquées. Worker actif, contrôle signé HTTP 200, aucun envoi de test. RLS actif sur les appareils et l’album, vue joueur interdite à anon, configuration du serveur interdite aux comptes. Aucun nouvel avertissement sécurité sur les modules ajoutés.

Une commande combinée CLI/build a été bloquée par le contrôle automatique pour télémétrie PostHog. Le build Next séparé avec NEXT_TELEMETRY_DISABLED=1 a réussi ; aucun accord d’envoi de télémétrie demandé.
