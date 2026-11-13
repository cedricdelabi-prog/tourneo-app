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

## Idée suivante : jeu de pronostics du public (non développé)

Option organisateur, gratuite, sans mise d’argent et sans récompense par défaut. Formats envisagés : vainqueur ; trio dans l’ordre ; cinq premiers dans l’ordre ou sans ordre. Classement des pronostiqueurs suffisant, éventuel cadeau externe décidé par l’organisateur et non condition de participation.

Prévoir fermeture horodatée avant le début du tournoi, un pronostic par compte, règles de classement et d’égalité annoncées avant ouverture, pas de modification après fermeture, calcul après résultats validés. Garder un écran spectateur simple et une affiche dédiée avec QR code ; seul un petit rappel facultatif sur l’affiche du tournoi. Ne pas qualifier cette idée d’inédite et ne pas annoncer la fonction comme disponible.

Références de cadrage France : https://www.anj.fr/professionnels/porteur-de-projet et https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/loterie-des-pratiques-commerciales-reglementees . L’absence de mise est un choix de conception, pas une garantie générale de conformité dans tous les pays.
