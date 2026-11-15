# Accueil découverte — Arena

La page publique `/` présente Tourneo en quatre écrans : convivialité, organisateur, joueur, spectateur. Le logo officiel est conservé ; bleu nuit, bleu électrique, turquoise et lignes de terrain forment la première déclinaison du thème Arena retenu.

Les aperçus sont explicitement illustratifs. Les avantages présentés existent déjà : formats, génération des rencontres, résultats, classement, affiches, QR, favoris publics et pronostics activables par l’organisateur. Aucun chiffre commercial ou témoignage inventé.

Navigation par boutons, points, flèches du clavier et balayage tactile horizontal. Défilement automatique toutes les 9 secondes : suspendu au survol, à la mise en arrière-plan et désactivé avec la préférence système de réduction des mouvements. Une interaction manuelle ou la prise de focus arrête le défilement ; le bouton de lecture permet de le relancer. Une visite mémorisée après clic vers la connexion ne relance pas automatiquement la présentation. Les refus de stockage ne bloquent aucun parcours.

La connexion reste accessible directement sur `/login`, depuis chaque écran ou via « Passer la présentation ». Aucun écran n’est ajouté aux liens publics d’inscription, de partage ou de pronostics. Le formulaire de connexion comporte un lien de retour à la découverte. Textes de présentation FR/EN/NL/DE.

L’en-tête propose deux accès explicites dès le premier écran : « Se connecter » et « S’inscrire ». L’inscription et les boutons « Créer mon tournoi » ouvrent directement le formulaire de création de compte via `/login?mode=inscription`. Aucun temps de lecture, écran terminé ou état de stockage n’est requis pour accéder aux formulaires.

## Allemand

Le sélecteur propose Deutsch avec un drapeau SVG allemand. La préférence `de` est reconnue sur l’appareil, dans les préférences du compte et avec le format de date `de-DE`. La migration étend uniquement la liste des langues autorisées, sans modifier les préférences existantes ni les consentements.

Le catalogue allemand couvre maintenant l’ensemble des entrées des catalogues d’interface existants, les règles complémentaires et les appels de traduction statiques repérés lors de l’audit. Les écrans de tournoi, outils, affiches, aide et guides utilisent ces entrées. Un glossaire corrige les ambiguïtés de vocabulaire sportif (groupes, rondes, auslosung, Schweizer System, etc.). Les noms et contenus saisis par les utilisateurs restent inchangés. Les textes sont préparés hors ligne : aucune traduction externe n’est appelée dans l’application. Les messages externes émis par le service de notification ne font pas partie de cette correction d’interface.

## Autres demandes à poursuivre séparément

Cette livraison ne prétend pas achever les demandes fonctionnelles précédentes : rappels 15/30 minutes, annonces administrateur, affichage de la ville, personnalisation photo et sponsors, réorganisation du menu connecté et intégration du son de roue validé. Les travaux locaux non publiés de la session précédente doivent être repris, ils ne sont pas contenus dans le commit de base 5ab8d28. Le son pile ou face proposé a été refusé et ne doit pas être intégré.

Le fournisseur Google est présent dans le code mais a été constaté désactivé dans les paramètres publics de l’authentification V2. Ne pas annoncer une connexion Google opérationnelle avant correction de la configuration et vérification.
