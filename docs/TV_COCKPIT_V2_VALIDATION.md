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
