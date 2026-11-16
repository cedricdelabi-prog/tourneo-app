# Tourneo V2 — revue du 16 novembre 2026

Périmètre : retours du parcours oral, application simple, fluide et intuitive. Travail sur `tourneo-v2-dev` ; aucune modification de `main` ou de la V1. État décrit ici : code et migrations préparés, publication non effectuée.

## Parcours

- Configuration, Participants, Communication : trois étapes explicites. Navigation d’étape, retour depuis les inscriptions et les supports, mémorisation de l’étape d’un brouillon sur cet appareil.
- Participants : ajout manuel, import, profils, inscriptions par QR/lien, formation des équipes avec roulette et son approuvé. Application explicite du tirage, avec confirmation avant remplacement de la liste. Les profils individuels ne sont pas attribués à une équipe tirée au hasard.
- Actualisation des inscriptions acceptées depuis les étapes Participants/Communication ; fusion avec la liste manuelle et vérification serveur au démarrage. Les inscriptions annulées/refusées ne sont pas conservées comme acceptées ; un compte inscrit n’est pas ajouté deux fois. Un homonyme manuel ambigu doit être renommé.
- Le démarrage par inscriptions en ligne n’est plus désactivé uniquement parce que la liste manuelle est vide. La validation de l’effectif fusionné reste obligatoire avant création des matchs.
- Communication : annonce, inscriptions, flyers A6, pronostics, classement et résultats par journée/phase. Route de regroupement `/tournoi/[id]/affiches` ajoutée ; elle manquait derrière le bouton de création. Les supports reprennent nom/date/lieu/organisateur depuis le brouillon sauvegardé. L’impression brute des inscriptions est remplacée par le créateur d’affiches Tourneo.
- Les annonces d’action apparaissent dans Matchs ; la gestion des pronostics est placée dans Communication. Les modèles personnels restent facultatifs et repliés pendant la configuration.

## Saisie et visuel

Dates et heures séparées, libellés distincts, champs natifs utilisables au clavier et sur mobile. Composant commun utilisé pour le départ, les échéances d’inscription, la clôture des pronostics et la date des affiches.

Les champs numériques de réglage conservent temporairement une saisie vide, puis acceptent un entier dans les bornes ; une saisie invalide revient à la dernière valeur valide au départ du champ. Les rondes sont affichées uniquement pour les formules concernées. Fond Arena renforcé et liens du pied de page agrandis avec zones tactiles/focus visibles.

## Échanges et modèles

- Conversations par tournoi avant/pendant/après, pour comptes membres identifiés : organisateur, arbitres désignés, inscrits acceptés et profils liés. Invités sans compte exclus. Messages à tous, à son groupe ou à l’organisateur ; l’organisateur peut adresser les deux groupes. React affiche le contenu comme texte.
- Lecture et suppression contrôlées par RLS ; envoi via RPC qui vérifie rôle, audience, longueur et compte actif. Aucune insertion directe autorisée au client, aucune lecture anonyme. Verrou d’envoi, UUID conservé après réponse réseau perdue, limite de dix messages par minute. Les cent derniers messages accessibles sont affichés, actualisation toutes les quinze secondes, sans push.
- Retrait par auteur ou organisateur ; lien de signalement vers Contact avec références. Le service Contact externe reste un blocage indépendant avant lancement général : ne pas annoncer un dispositif de signalement opérationnel tant que l’envoi réel n’est pas configuré et vérifié.
- Modèles d’affiche personnels privés dans le compte (logo, sponsors, lieu, organisateur et texte), avec copie indépendante par tournoi. Aucune ancienne date ni aucun ancien score dans un modèle. Tests d’isolation entre propriétaires.
- Conditions d’utilisation et confidentialité complétées pour les échanges, le respect des personnes, les photos, les autorisations, les contenus interdits et le retrait. Ce travail n’est pas une certification juridique ou RGPD.

## Règles

Préparation commune ajoutée : matériel/sécurité, engagement/service, manches, fautes et arbitrage à annoncer. Fiche badminton détaillée (points, prolongation, terrain, service, fautes et côtés) avec source FFBaD. Le choix historique 21 points reste distingué du format français 15 points ; aucun changement silencieux des réglages de l’utilisateur.
Sources consultées : https://www.ffbad.org/pratiquer-comment-jouer-au-badminton et https://www.cnil.fr/fr/demander-le-retrait-de-votre-image-en-ligne.

## Vérification

Réussis : compilation Next.js et TypeScript ; tests des parcours (profil, impression, planning, événements, import, annonces, appels, synchronisation, outils, langues) ; données des affiches, modèles et règles ; tests des nombres/dates et d’envoi avec réponse perdue ; fusion des inscriptions. Tests SQL dans les deux modes (migrations ordonnées et activation consolidée) : audiences privées, refus étranger/anonyme, suppression/modération, UUID d’envoi, modèles privés et interdiction de réassigner leur propriétaire.

Les parcours navigateur mobile réels et le rendu des nouveaux écrans restent à vérifier dans un environnement compatible. Aucun message réel envoyé et aucun tournoi utilisateur modifié pour ces tests. Les scripts navigateur préparés ne valent pas un résultat de test réussi.

## Avant publication sur le site V2 de test

Appliquer les deux migrations `20261116140317_tourneo_v2_discussions.sql` et `20261116141521_modeles_affiche_personnels.sql` uniquement sur `kmjfmjhdnokkaiolxiin`, vérifier les protections et déployer le commit V2. Pas de bascule V1.

Google : l’utilisateur a renseigné la configuration ; le parcours OAuth réel complet reste à vérifier. Le contact public de l’éditeur et le service d’envoi Contact restent à finaliser avant diffusion générale.
