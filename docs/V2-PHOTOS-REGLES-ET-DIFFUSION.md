# Retours du 13 novembre : photos, règles et diffusion

## Réalisé dans ce lot

- Explication du code TRN dans la gestion arbitres, lien interne Mon profil, choix d’un participant dont le profil est déjà lié (sans inventer de code).
- Aucun lien sortant dans les fiches de règles, quelle que soit la discipline. Les références officielles et versions sont affichées comme information. Synthèses françaises intégrées et recherche ; fiches tennis de table et pétanque enrichies depuis FFTT/FIPJP, sans reproduire leurs règlements complets. Une discipline sans fiche vérifiée est annoncée comme telle, sans règle inventée.
- Photos : originaux privés, choix organisateur seul / toutes les personnes ayant le lien du tournoi. Partage explicite des versions décorées uniquement. Bandeau Tourneo toujours présent, cadre/bandeau/sobre, couleurs, logo organisateur, nom et date ; aperçu, téléchargement et partage. Réglages disponibles avant démarrage.
- Les accès publics sont contrôlés en base, pas seulement masqués dans l’interface. L’album public utilise la lecture Storage autorisée de chaque fichier et des URL blob locales ; aucun lien signé public de longue durée. Listing anonyme et signature Storage interdits par cette politique. Arrêt du partage et échéance bloquent les nouvelles récupérations. Les copies déjà téléchargées ne sont pas rappelables.
- Le superadmin de l’application n’a pas d’accès général aux albums privés. Test SQL explicite avec rôle superadmin et propriétaire distinct. Aucun accès de surveillance ajouté. La politique de confidentialité décrit cette réalité et les prestataires techniques.
- Les fichiers dérivés reprennent le préfixe de tournoi déjà nettoyé par le worker de conservation, sans rendre le bucket public.

## Vérifications

TypeScript ; migrations et activation consolidée identiques ; tests d’accès organisateur/étranger/superadmin/anonyme, désactivation et expiration ; navigateur 320/1366 px avec API simulée pour cadres, fichier téléchargé, partage volontaire, retrait et information RGPD. Des essais réels Storage/Safari et réseaux sociaux restent nécessaires.

## Demandé ensuite, encore à finaliser

1. Cadre juridique complet : impossible de promettre une responsabilité nulle. L’identité/statut de l’éditeur et le contact à publier n’ont pas été confirmés (question de statut interrompue par l’utilisateur). Ne pas publier des mentions inventées ni l’e-mail privé du compte comme contact public sans instruction. Préparer CGU/mentions avec les éléments manquants identifiés et garder les droits légaux impératifs.
2. Service e-mail : expéditeur vérifié et secret fournisseur à installer hors conversation. Le circuit applicatif du bilan est développé et testé ; aucun e-mail réel n’a été envoyé et aucun succès de livraison n’est simulé.
3. Essais réels iPhone/Android et réception par plusieurs comptes sur un vrai tournoi à poursuivre.

## Bilan final et guidage organisateur

- Bloc « Prochaine action » : propositions d’arbitres, résultats à valider, prochain match ou partage du bilan, sans répéter les réglages.
- Bilan automatique facultatif pour les nouveaux tournois ; désactivé pour les tournois historiques tant que l’organisateur ne le demande pas.
- Préparation après résultats enregistrés et validés, révision contrôlée en base, un seul bilan par tournoi. Comptes dédupliqués : participants liés, arbitres et organisateur ; préférences sportives et e-mail respectées. Les invités non identifiés ne sont pas contactables automatiquement.
- Affiche finale privée en pièce jointe, lien écrit des résultats et lien photos uniquement si partage actif. Les réglages graphiques/sponsors de l’appareil finalisant sont repris ; sans personnalisation locale, modèle par défaut.
- Suivi séparé des notifications déposées, e-mails en attente, échecs et acceptation par le fournisseur. Aucune affirmation de lecture ou livraison effective.
- Tests SQL sur droits, révisions, idempotence et préférences ; navigateur avec API simulée sur génération d’affiche et absence de rediffusion au rechargement ; tests de contenu des e-mails et des pièces jointes.

## Références consultées pour les brouillons juridiques

- LCEN : https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000801164/2026-03-10
- Mentions obligatoires : https://entreprendre.service-public.gouv.fr/vosdroits/F37351
- Information des personnes : https://www.cnil.fr/fr/informer-les-personnes
- Retrait d’image : https://www.cnil.fr/fr/demander-le-retrait-de-votre-image-en-ligne
- Clauses abusives : https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/clauses-abusives-12-clauses-interdites-et-10-clauses-dont-il-faut-demontrer-la-legitimite
- Hébergeur Vercel et DPA : https://vercel.com/legal/dpa

Les points commerciaux, médiation, rétractation, facturation et obligations spécifiques d’entreprise devront être revus si une offre payante est activée ; la V2 reste gratuite et sans publicité.

## Sponsors et formats de lien

Jusqu’à six logos de sponsors sont importés localement dans l’affiche, individuellement retirable, sous « Avec le soutien de ». Ils restent inclus dans les fichiers exportés et conservés sur cet appareil. Choix QR ou liens écrits ; un lien photos n’est ajouté à l’affiche de résultats que si l’album est effectivement partagé.

## Jeu de pronostics du public : développé

- Activation facultative avant lancement, un format par tournoi : vainqueur, podium ou cinq premiers, dans l’ordre ou sans ordre. Jeu gratuit sans mise, paiement ni récompense gérés par Tourneo.
- Un pronostic par compte confirmé, modifiable avant clôture. Barème et ex æquo annoncés. En mode ordonné : un point par participant trouvé dans le groupe, deux points supplémentaires pour sa place exacte ; mode libre : un point par participant trouvé. Égalité de points = même rang.
- Le lancement ou une clôture manuelle ferme définitivement le jeu. Une échéance facultative peut fermer plus tôt. Le serveur applique ces limites, quel que soit l’horloge ou l’interface du téléphone.
- Format et échéance figés après la première participation. Un changement d’identifiants des participants suspend le jeu. Toute modification du tournoi invalide la publication précédente ; le classement est republié par l’espace organisateur après validation de tous les scores et contrôle de révision.
- Calcul depuis le classement du moteur de compétition de l’organisateur. Publication automatique pendant que son tournoi terminé est ouvert, reprise au retour réseau, bouton manuel dans la gestion des pronostics. Aucune publication depuis le téléphone d’un spectateur.
- Écran public avec choix, état de clôture, top 100, rang personnel ; autres choix privés et aucun e-mail/identifiant de compte exposé. Règles de confidentialité à la collecte. Suppression en cascade avec le compte ou le tournoi.
- QR/lien dédiés et affiche A4/A3/social indépendante. Métadonnées, logo organisateur et sponsors locaux repris, date de clôture imprimée lorsqu’elle existe. Partage par la feuille du téléphone ou téléchargement volontaire.
- Inscription compte simplifiée : pseudo, e-mail et mot de passe ; identité civile, ville et structure facultatives. Profil public préparé pour son propre compte à la connexion ou en participant, sans écraser un profil existant ni publier l’e-mail. Retour de connexion vers la page de pronostics contrôlé pour éviter les redirections externes.
- Pile ou face gratuit dans les outils et dans chaque match de l’espace arbitre, noms des adversaires et résultat accessible, animation respectant la réduction de mouvement.
- Ajout d’arbitre en un clic depuis les participants liés, recherche des noms affichés de comptes Tourneo (organisateur seulement, dix résultats max, aucun e-mail privé), code joueur dans un volet secondaire.
- Icône d’aide SVG et aides situées près des champs de création (sport, format, poules, paramètres avancés et équipe).

Tests : SQL sur les cinq barèmes, isolation des choix, rôles, compte non confirmé, échéance, clôture irréversible, révision et invalidation ; navigateur 320/1366 px avec API simulée pour configuration, vrai fichier d’affiche, vote/modification/fermeture/classement, recherche arbitre, aide contextuelle, inscription allégée et pile ou face. Outils arbitre aussi contrôlés en 390/768 px. Essais physiques iPhone/Android restant à faire.

Références de cadrage France : https://www.anj.fr/professionnels/porteur-de-projet et https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/loterie-des-pratiques-commerciales-reglementees . L’absence de mise est un choix de conception, pas une garantie générale de conformité dans tous les pays.
