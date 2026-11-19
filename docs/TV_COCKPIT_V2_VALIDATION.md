# Tourneo V2 — écran TV et statut de validation (19 novembre 2026)

## Périmètre et garde-fous
- Développement **uniquement** sur `release-v2-preparation-2026-11-19` dans `cedricdelabi-prog/tourneo-app`.
- Ne pas modifier `main`, la V1 sur `tourneo-app.vercel.app` ni la base Supabase V1.
- Projet de test Vercel: `prj_DNOvDvZiBbWwllu3CbQAINIeblGR`.
- Ne pas souscrire à un plan payant ni créer un environnement staging facturé.

## Fonctionnalités du cockpit TV en préparation
- Navigation manuelle, sélection rapide de la page des matchs et du classement et défilement automatique.
- Horloge commune enregistrée dans le stockage local pour conserver la même page entre l'ordinateur organisateur et la fenêtre TV ouverte dans **le même profil de navigateur**.
- Messages publics et diffusion immédiate de l'annonce.
- Pause 10/15/30 minutes, horaire de reprise, compte à rebours et bouton de reprise.
- Son de reprise activé par geste utilisateur avec tonalité de test; alerte limitée à une fenêtre de 10 secondes pour éviter les sons retardés.
- Logo de tournoi et sponsors définis dans les paramètres de tournoi; bandeau de partenaires et page dédiée facultative.
- Mise en avant immédiate des sponsors et retour aux résultats; pas de bandeau doublon sur la page sponsors.
- Commandes regroupées par rubriques et lisibles sur mobile.

## Vérifications effectuées
- `npm run test:tv` pointe vers `tests/ecran-tv.cjs`.
- Le test unitaire TV a été exécuté avec succès en local avec une copie à l'identique des blobs GitHub `lib/ecran-tv.ts` (SHA `f7d11682301660d4a47c9850017d359dd9c3d2a7`) et `tests/ecran-tv.cjs` (SHA `d972d21c59213d5bfff31fcaf9142fddcce890c2`).
- Cela valide les fonctions pures de réglages, pagination, horaires de diffusion, appels de joueurs et son de reprise.
- **Non encore vérifié**: build Next.js complet, intégration de l'interface, affichage TV sur vrai matériel, compatibilité multi-navigateurs.
- **Limite**: réglages TV partagés entre fenêtres du même profil navigateur uniquement. Le pilotage d'une TV distante par un autre appareil n'est pas implémenté.

## Blocage de déploiement
- GitHub indique un échec `build-rate-limit` chez Vercel, y compris pour le projet V2.
- Un essai **unique** de déploiement de la dernière version via l'API Vercel a renvoyé `402 api-deployments-free-per-day`, précisant plus de 100 déploiements et une attente de **24 heures**.
- Le déploiement Vercel `dpl_CmdpWyYwMtBytR5JZDh7SJE63ANX` est affiché `READY`, mais correspond à l'ancien commit `856f198eef8320e40f3c5e81b87250e484a41eec`. Il **ne contient pas** les dernières modifications du cockpit.
- **Ne pas relancer la publication tant que la limitation ne s'est pas levée**; éviter les déploiements à chaque petit commit.

## Prochaine validation de lot
1. Attendre le retour du quota gratuit. Regrouper les changements en un seul déploiement **preview V2**.
2. Faire un `npm run build`, `npm run test:tv`, puis tester sur le projet V2.
3. Vérifier: ouverture TV, connexion organisateur, affichage et synchronisation des pages entre fenêtres, annonce, pause/reprise, tonalité, sponsors et logo, commandes mobiles.
4. Traiter les problèmes constatés avant toute proposition de déploiement de production. Ne pas migrer les données V1 sans procédure d'accord explicite.

## Lot suivant : vue opérationnelle et filtres de diffusion
- Statistiques organisateur : total des rencontres, à jouer, à valider et validées.
- Liste des quatre prochains matchs (terrain et créneau si planifiés).
- Sélection des pages de matchs et de classement; filtre de matchs `tous / à jouer / à valider / validés`.
- Les filtres TV n'altèrent ni les scores ni les données métier du tournoi.
- Les calculs de planning/classement et les listes de pages sont mémorisés ; le compteur peut avancer sans recalculer la compétition chaque seconde.
- Trois annonces rapides (buvette, remise des prix, reprise des matchs) et retour en un clic au défilement, avec texte personnalisable ensuite.
- Tests unitaires ajoutés pour les comptes, les filtres et la compatibilité des anciens réglages.
- **À vérifier au prochain déploiement** : pages vides, filtres, défilement, affichage mobile et pertinence des créneaux selon le format sportif.

## Configuration des logos après la création
- Un éditeur de l'identité visuelle apparaît dans Communication pour les tournois existants.
- Logo, ordre et suppression des six sponsors, message pour l'affiche; fichiers contrôlés et normalisés.
- Réutilisation possible des modèles du profil, en copiant **uniquement** l'identité sans modifier discipline, nom ou résultats.
- Les données restent dans `optionsV2.identiteAffiche` et sont sauvegardées avec la synchronisation métier habituelle.
- Accès direct à ce réglage depuis le cockpit TV.

## Lot : liaison second écran et dépannage
- L'écran public publie toutes les cinq secondes un signal local minimal (heure du signal et de la dernière réception des données), sans données personnelles ni scores.
- Le poste organisateur vérifie toutes les trois secondes la présence d'une ou plusieurs fenêtres TV du **même navigateur**.
- Trois états : TV détectée et à jour, TV détectée mais sans réception récente, TV non détectée / signal trop ancien.
- Bouton d'actualisation immédiate : recharge les données Supabase dans la fenêtre organisateur et les fenêtres TV associées; le polling automatique de 15 secondes reste disponible.
- Après 45 secondes sans actualisation réussie, la TV montre une alerte et conserve le dernier tableau connu plutôt que de masquer les scores.
- À la fermeture normale de la TV, son signal est nettoyé; après crash, le signal devient périmé en 15 secondes.
- Échanges par `localStorage` strictement locaux au même navigateur/profil : **aucune fonction de télécommande à distance n'est revendiquée**.
- Tests unitaires inclus : signal présent, absent, périmé, données périmées, plusieurs écrans, messages invalides et faible dérive horaire.

## Pause professionnelle
- Le chronomètre est formaté dans une fonction partagée utilisée par le poste de pilotage et l'écran public.
- L'organisateur peut prolonger ou raccourcir une pause de cinq minutes, sans toucher aux résultats et au planning.
- L'heure de reprise atteinte **n'annule pas la pause** : l'organisateur confirme explicitement le retour des matchs.
- Le signal sonore est joué à l'heure prévue si le navigateur a été activé pour l'audio et si l'écran est connecté.
- Indicateur de présence : une fenêtre active n'est pas une preuve de connexion HDMI physique.

## Lot : appels immédiats et progression du tournoi
- Sélection d'un match à appeler : affiche immédiatement les joueurs, sans attendre la rotation TV; la diffusion automatique est suspendue.
- Boutons « Appeler sur la TV » pour les quatre prochaines rencontres et « Terminer l'appel et reprendre la diffusion ».
- Reprise du défilement automatique après la fin de l'appel, sans modifier les matchs ni leurs résultats.
- Page de progression facultative (pourcentage de matchs validés), avec barre de progression et nombres restants.
- Bouton organisateur pour afficher la progression immédiatement.
- Tests ajoutés pour l'emplacement de la page d'appel et le calcul fiable de la progression.

## Mode accueil
- Quand il n'y a aucune page de scores, classement, sponsors ou annonce, la TV affiche une page d'accueil plutôt qu'un écran noir.
- Cette page conserve le nom et le logo du tournoi, rassure le public et indique que le planning est en préparation.
- Aucun chiffre n'est inventé ; les rencontres apparaissent dès qu'elles sont enregistrées et diffusables.

## Appels et annonces temporisés
- Durée réglable d'une annonce : 15/30/60/120 secondes (défaut 30).
- Durée réglable d'un appel : 30/60/90/120 secondes (défaut 90).
- Message rapide ou appel en cours : lancement immédiat avec temps restant visible au poste de pilotage.
- À expiration, les réglages TV sont nettoyés et le défilement reprend automatiquement, même après suspension de l'onglet.
- Appel d'un match terminé : retour automatique à la diffusion; démarrer une pause interrompt les actions temporaires.
- Options uniquement locales au profil navigateur, sans migration de base ni modification de V1.

## Brouillon d'annonce (confidentialité de l'interface)
- Le champ de préparation des annonces utilise `brouillonAnnonce` : taper une phrase ne l'affiche plus sur la TV.
- Le bouton « Diffuser l'annonce maintenant » copie explicitement le brouillon vers le message public, avec son délai de disparition.
- Lancer un appel interrompt l'annonce précédente et donne la priorité aux joueurs; le brouillon est conservé.
- Compatibilité avec les anciens paramètres locaux : un message public antérieur peut être repris comme brouillon sans perdre sa saisie.

## Lisibilité du cockpit
- Réglages regroupés dans quatre sections repliables : diffusion, messages et pauses, partenaires, appels.
- Diffusion et pauses ouvertes par défaut, partenaires et appels repliés pour réduire la surcharge visuelle sur mobile.
- Contrôles d'accès clavier et zones de toucher adaptées.

## Correctif des transitions TV après annonces et appels
- La sélection d'un match donne toujours la priorité à sa page d'appel (page 1) même lorsqu'une ancienne annonce est stockée dans le navigateur.
- Les appels effacent le message public précédent sans supprimer le brouillon de l'organisateur.
- À l'expiration d'une action, les autres actions publiques encore actives ne sont pas coupées : pas de retour intempestif aux résultats.
- Fin d'appel, appel de match terminé, expiration d'annonce et pause couverts par tests automatisés.

## Expérience multi-appareils et correction de file d'écriture
- Un encart repliable fournit le QR code et le lien direct vers l'écran TV, avec copie au presse-papiers.
- Le deuxième appareil doit se connecter au **même compte organisateur** : l'accès public sans authentification n'est pas proposé.
- La mise à jour distante utilise une **capture immuable des réglages et de l'identifiant du tournoi** au moment de l'action : évite d'écrire par erreur les réglages du tournoi suivant dans le tournoi précédent pendant une navigation rapide.
- Extraction testée des données publiques envoyées au serveur ; le brouillon privé n'est jamais transmis à la table de pilotage distant.

## Connexion au second appareil
- Un spectateur/organisateur non connecté qui ouvre le QR code du second écran reçoit un lien explicite pour se connecter.
- Le retour après connexion accepte strictement `/tournoi/<uuid>/tv?ecran=1` ; les URLs externes, paramètres non autorisés et identifiants invalides restent rejetés.
- Les tests de retour de connexion sont désormais lancés avec les tests TV dans le workflow GitHub V2.

## Correctif de concurrence des télécommandes
- Un second appareil ne doit pas écraser les réglages non modifiés par son organisateur (ex. modifier les sponsors en même temps qu'un appel de joueurs).
- Écriture via fonction SQL `tv_pilotage_appliquer` (**Supabase V2 test uniquement**) : fusion atomique des **seuls champs modifiés**, sans écriture de l'intégralité du dernier état local.
- Droits SQL `SECURITY INVOKER` et RLS propriétaire conservés, exécution RPC réservée au rôle authentifié, liste blanche des clés autorisées et taille limitée à 12 Ko.
- Chaque action cohérente (appel + heure d'expiration + priorité, ou message + durée) est appliquée dans une seule transaction.
- La file locale conserve l'ordre des commandes émises par le même poste. Deux postes peuvent encore modifier le **même champ** simultanément : la dernière commande validée est conservée (pas de verrou de prise de contrôle).
- Contrôles automatisés sur l'extraction de patch et la confidentialité du brouillon, plus test SQL RLS transactionnel sur la base V2.

## Signal réel d'écran TV (plusieurs appareils)
- Migration de test `docs/sql/tv_presence_heartbeat_v2_TEST_ONLY.sql` appliquée seulement dans Supabase V2.
- La TV authentifiée envoie une pulsation toutes les 15 secondes, horodatée par la base : aucune donnée de tournoi n'est incluse.
- L'organisateur voit si **une TV connectée à son compte** a signalé sa présence dans les 45 dernières secondes, même si elle est ouverte sur un autre navigateur ou appareil.
- Le signal distant est distinct du signal de fenêtre locale et **ne garantit pas l'image sur le téléviseur physique**.
- La fonction SQL de présence n'écrit pas les réglages. Le trigger ne fait plus évoluer la révision TV lorsque seule la présence est mise à jour.
- RLS propriétaire et exécution `SECURITY INVOKER`, accès RPC authentifié uniquement.
- En cas d'absence de réseau, l'état devient absent après 45 secondes, sans écraser les derniers réglages TV.

## Test navigateur du pilotage distant (API simulée)
- `tests/tv-multi-appareils-browser.cjs` simule deux contextes Chromium distincts (organisateur en 420px, écran public 1280px) et une API Supabase locale simulée.
- Contrôle du signal de présence distant, annonce de buvette, pause/reprise, appel prioritaire des joueurs et confidentialité des brouillons.
- Vérifie absence d'exception JS et absence de débordement horizontal.
- Le navigateur ne se connecte **jamais** à un compte réel ni aux données V1; les appels vers la base V2 sont interceptés dans la session de test.
- Le parcours fonctionne sans déploiement Vercel, mais reste un **test simulé**; l'essai avec deux appareils réels demeure nécessaire.

## Lot : confirmation d'envoi et sécurité des écrans publics
- À l'expiration d'un appel ou d'une annonce, une fenêtre **TV publique** met à jour uniquement son affichage local, sans écrire les commandes du poste organisateur dans `localStorage` ni dans la base distante.
- Les commandes de l'organisateur sont écrites dans une file séquentielle. Lorsqu'une transmission échoue, les champs non envoyés sont conservés dans le navigateur, avec une alerte visible et un bouton `Réessayer l'envoi des commandes`.
- Un rafraîchissement de page retrouve les commandes en attente, limitées aux clés autorisées, et **jamais les brouillons privés**.
- En cas d'échec, la lecture distante ne remplace pas les commandes locales en attente. Un simple rafraîchissement des données ne suffit pas à masquer l'erreur d'envoi.
- Les données du tournoi restent intactes ; seuls les réglages de diffusion sont concernés.
- À confirmer en test navigateur : panne RPC, alerte, récupération, réessai manuel et réception sur second écran.

## Reprise automatique en cas de coupure réseau
- Les modifications en échec sont conservées et automatiquement réessayées après 5, 10, 20 puis 40 secondes si la connexion réseau est disponible.
- Un événement `online` du navigateur peut relancer immédiatement un nouvel essai.
- Les réessais cessent après quatre échecs supplémentaires ou après 120 secondes depuis la première erreur : une **ancienne pause** ou un ancien appel ne doit jamais se rejouer automatiquement beaucoup plus tard.
- Un bouton de réessai manuel reste utilisable, y compris après une expiration ou un rechargement de page.
- L'horodatage de la panne est sauvegardé séparément dans le navigateur ; les anciennes files dépourvues d'horodatage ne sont jamais réémises automatiquement.
- Réussite RPC confirmée avant de supprimer le message d'alerte et les commandes conservées.

## Initialisation sans écrasement
- Quand le premier écran connecté crée un enregistrement de présence distant vide, le cockpit organisateur initialisera la diffusion depuis ses réglages locaux existants.
- Fonction SQL `tv_pilotage_initialiser` sur la **base de test V2 uniquement** : remplit l'enregistrement seulement s'il est absent ou si ses réglages sont vides.
- Une seconde initialisation ne remplace jamais les commandes enregistrées sur le serveur, même avec d'autres réglages locaux.
- La première configuration inclut tous les champs publics de diffusion mais **jamais** le brouillon de message de l'organisateur.
- En cas de commandes non transmises, l'initialisation attend leur traitement plutôt que d'écraser l'état distant.

## Fiabilité du pipeline de validation
- La compilation Next.js et TypeScript est obligatoire avant les tests navigateur.
- Le Chromium Playwright est installé sur un runner Ubuntu 24.04 sans dépendre d'une installation APT supplémentaire : le miroir Ubuntu a retourné des erreurs HTTP 503 lors d'une vérification antérieure.

## Nouveaux outils « Gérer un imprévu » (jour J)
- Réglage rapide d'un retard de 0, 5, 10, 15, 30 ou 60 minutes, avec saisie personnalisée jusqu'à 240 minutes.
- Possibilité de fermer temporairement plusieurs terrains tout en en conservant au moins un disponible ; bouton « Rouvrir tous les terrains ».
- Simulation **sans écriture** des changements, en préservant les horaires et terrains des rencontres dont le score est déjà saisi ou validé.
- Compteurs pour les rencontres déplacées, terrains modifiés, horaires modifiés, matchs protégés et matchs inchangés.
- Avant/après de l'heure de fin et retard maximal estimé.
- Affichage détaillé de toutes les rencontres déplacées sur demande, confirmation avant application et annulation de la dernière adaptation tant que les résultats n'ont pas changé.
- Export CSV du comparatif avant/après, prêt pour Excel et protégé contre les formules injectées par les noms d'équipe.
- Aucune migration SQL, aucun résultat modifié par la simulation. Tests spécifiques automatisés via `npm run test:imprevus`.

## Validation navigateur des imprévus
- Parcours Chromium en largeur mobile (390 px) : simulation d'un retard, fermeture d'un terrain, aperçu des impacts, téléchargement CSV, confirmation, annulation puis nouvelle application.
- Vérifie qu'aucune modification du tournoi n'est enregistrée avant confirmation et que les scores déjà saisis sont conservés.
- Étape intégrée au workflow GitHub Actions V2, sans utilisation de la V1 ni de comptes réels.

## Tableau de bord « Suivi du tournoi en direct » (jour J)
- Le bloc « Prochaine action » est remplacé par une vue d'ensemble de quatre compteurs : matchs validés, scores terminés à valider, saisies incomplètes et rencontres à jouer.
- Progression calculée sur les résultats **réellement validés** et jamais sur les scores simplement saisis.
- Priorités : propositions d'arbitres (si vérifiées), résultats prêts à valider, scores partiels, prochaine rencontre, puis partage du bilan.
- Choix d'une rencontre par son horaire planifié, plutôt que par un identifiant de match arbitraire ; le raccourci se positionne sur le véritable identifiant DOM `organisateur-match-<id>`.
- Raccourcis persistants vers le pilotage TV et les imprévus (ouverture automatique des panneaux concernés).
- Les erreurs temporaires de lecture des propositions d'arbitres sont signalées sans masquer l'état des matchs locaux.
- Tests métier dédiés et parcours mobile de bout en bout sur la base de test simulée, sans publication Vercel ni modification V1.

## Lot unique : filtre et actions rapides du planning
- Recherche des rencontres par équipe, joueur ou numéro, sans distinction de majuscules ni d'accents.
- Filtres cumulables par statut (validé, saisie complète à valider, score incomplet, à jouer) et par terrain réellement planifié.
- Affichage du nombre de matchs correspondants, message en cas de liste vide et réinitialisation accessible sur mobile.
- Badges de statut sur les fiches. Filtrer n'altère ni les scores ni le classement, et désactive la réorganisation des rencontres masquées.
- Tableau de bord : jusqu'à cinq résultats urgents (à valider ou incomplets) avec raccourci vers la véritable fiche de match.
- Un raccourci retire les filtres, positionne la fiche au centre de l'écran, la met en évidence et lui donne le focus pour le clavier.
- Vérifications : tests unitaires des statuts et filtres, test Chromium en format mobile pour la recherche, la réinitialisation et la navigation.
- Livraison prévue en une seule mise à jour de la branche `release-v2-preparation-2026-11-19`, sans migration SQL et sans modification de la V1.
