# Tourneo V2 — état de reprise

Branche exclusive : `tourneo-v2-dev`. `main` et la V1 restent hors du périmètre. Environnement prévu : Vercel et Supabase `tourneo-v2-test`.

## Fonctions intégrées au code

- Championnat simple et aller-retour, poules, poules/finale, élimination directe.
- Double élimination avec seconde finale si nécessaire ; consolante des perdants du premier tour.
- Système suisse : rondes configurables, appariements selon le classement, recherche de paires sans répétition, rotation des exemptions et points de victoire pour les exemptés.
- Doubles à partenaires tournants, points individuels et rotation des joueurs au repos.
- Tirage aléatoire, équilibrage par niveaux, positions et poules manuelles.
- Modes Simple, Expert et Camping/Animation ; sauvegarde des règles comme modèle sur l'appareil.
- Points/buts ou manches gagnantes ; barème de classement configurable ; préréglages modifiables par discipline et validation des manches.
- Planning des terrains, estimation de durée, repos minimum, déplacement des matchs au sein d'une ronde et appels vocaux sur l'appareil.
- Import CSV/texte de participants, export CSV protégé contre les formules, sauvegarde/restauration JSON validée.
- Feuilles papier/PDF avec scores ou vierges, pointage papier, planning et QR public.
- Vue publique avec classement commun au moteur organisateur, écran géant et actualisation ; résultat final distinct du classement provisoire.
- Cache local par tournoi, sauvegardes cloud séquentielles, reprise automatique des envois en attente ; service worker des pages déjà visitées et écran hors connexion.
- Suppression des publicités, suggestions de marques, fichier ads.txt et mentions publicitaires devenues inexactes dans l'interface.

## Modules installés sur Supabase V2 le 12 novembre 2026

- Brouillon avant lancement ; inscriptions par lien/QR, individuelle/équipe, noms/pseudos, consentement de publication.
- Quota, échéance, validation manuelle/automatique, liste d'attente, annulation depuis l'appareil invité, pointage.
- Intégration des demandes acceptées et fermeture atomique au démarrage.
- Événements regroupant plusieurs tournois et classement cumulé des profils identifiés.
- Arbitres avec compte, attribution par code joueur, propositions de scores et validation finale par l'organisateur.
- Projection publique explicite des données de jeu.

Douze migrations appliquées sur `tourneo-v2-test` (`kmjfmjhdnokkaiolxiin`). Socle profils/tournois/palmarès, stockage privé, inscriptions, événements et arbitrage installés. Test SQL transactionnel réussi : RLS profils/tournois, refus organisateur non propriétaire, score arbitre, quota, idempotence et annulation. Tests simultanés et parcours navigateur réels restent à faire.

## Vérifications

`npm test` couvre calendriers (0 à 64 participants), double élimination et consolante (jusqu'à 64, plusieurs scénarios de résultats), seconde chance en finale, disponibilité des terrains et repos, classements, rotation des partenaires, import CSV, sauvegardes, appariements suisses/exemptions et règles de score. Vérifier aussi TypeScript et la compilation Next.js.

Les builds locaux peuvent utiliser une URL Supabase factice : ils ne prouvent pas le fonctionnement du backend. Tests navigateur connecté, inscriptions simultanées, politiques RLS, stockage réel et déploiement effectif des migrations restent à réaliser sur V2.

## Limites et suite

Les échanges mentionnent 87 évolutions, mais la liste numérotée complète n'a pas été récupérée. Ce document ne prétend pas les remplacer et ne permet pas d'annoncer 87/87.

Restent notamment : tests navigateur et simultanéité des modules ci-dessus ; format coopératif à préciser ; traduction complète selon la langue du compte ; e-mails et notifications push (les notifications internes et les consentements séparés sont installés) ; statistiques administrateur globales (les statistiques organisateur sont installées) ; vérification du périmètre de la future option Expert à paiement unique à vie. Aucun paiement n'est ajouté.

Le mode hors connexion exige un premier chargement réseau et ne gère pas encore la résolution collaborative de modifications concurrentes sur plusieurs appareils. Les nouveaux modules d'inscriptions et d'arbitrage nécessitent le réseau. Les données locales non synchronisées restent prioritaires au rechargement.

## Évolutions complémentaires intégrées

- Activité : notifications internes des inscriptions, changements de statut identifiés, attributions arbitres et propositions de score ; marquage lu. E-mails et push téléphone non activés.
- Préférences privées : informations sportives séparées du consentement promotionnel Tourneo, horodatage serveur du consentement et retrait ; texte agrandi et animations réduites.
- Avis privés après clôture, réservés aux participants identifiés : une évaluation par compte/tournoi, modification/retrait ; refus de l'autoévaluation organisateur.
- Statistiques organisateur : période/sport, participations, matchs validés, état terminé selon le moteur commun, avis, export CSV protégé et impression. Pagination des lectures.
- Groupes privés club/accompagnement : liste de pseudos sans smartphone, partage par code joueur en lecture seule ou rôle accompagnateur, retrait d'accès, limite de 256 participants ; copie de la liste dans un nouveau tournoi sans modifier les tournois existants.
- Cache du tableau de bord isolé par compte, statut terminé corrigé pour les résultats non validés et le format suisse. Appels joueurs visuels uniquement.

## Accès et partage

Photos dans un bucket privé, limité à 5 Mo, avec accès propriétaire ; références stables sauvegardées et URL signées temporaires à l'affichage. Les données privées du profil restent accessibles uniquement au propriétaire. Recherche de pseudo/code et palmarès individuel avec identifiants de compte réservés aux comptes connectés.

L'utilisateur a explicitement approuvé le partage public des pseudos, matchs, scores et classement, sans photos ni coordonnées. La projection du tournoi utilise une liste de champs autorisés et des alias propres à chaque tournoi ; la cohérence des alias est conservée pour les doubles tournants et les exemptions. Aucun profilId, photo, jeton d'inscription ou champ supplémentaire n'est envoyé par cette projection. Les inscriptions invitées restent accessibles par lien et jeton.

Les fonctions SECURITY DEFINER exposées correspondent aux API autorisées (inscription par lien/jeton, projection publique approuvée, opérations avec contrôle de propriétaire ou attribution arbitre). Les alertes advisors sur ces fonctions sont suivies ; elles ne remplacent pas les tests. Les index manquants et les avertissements de coût des appels auth.uid() dans RLS ont été corrigés.

## Validation et limites

Tests moteur et statistiques, TypeScript et compilation locale réussis. Les tests SQL inscriptions/arbitrage/évaluations/consentements et projection publique ont réussi sur Supabase V2 avant l'ajout des groupes. Pour les groupes, la dernière confirmation Supabase a expiré ; aucune donnée de test n'a été ajoutée.

`npm run test:db` exécute les migrations et les tests SQL sur un PostgreSQL local WASM avec schémas Auth/Storage minimaux de test : accès, refus d'autoévaluation, notifications isolées, consentement/retrait, partage sans champs privés, rôles des groupes, quota et retrait d'accès. Le script vérifie aussi que l'activation consolidée donne les mêmes colonnes et politiques que les migrations ordonnées et que les jeux de test sont annulés. Ces tests passent ; ils ne valident pas Supabase Auth/Storage/REST réels ni les courses entre plusieurs connexions.

Le navigateur local n'a pas pu démarrer à cause d'une restriction système sur les sockets ; aucun parcours UI avec compte réel n'est donc annoncé comme testé. Le build local utilise une clé Supabase factice et ne prouve pas la configuration du déploiement.

L'accès à l'équipe Vercel Tourneo a été autorisé. Le problème de build provenait des variables Supabase du projet Vercel V2 : elles ne ciblaient pas la base V2. Les deux variables publiques (URL et clé publiable) ont été corrigées uniquement sur `tourneo-v2-test`, pour Preview et Production. L'aperçu du commit 07bdfdb est READY ; les pages login/groupes/nouveau tournoi ont répondu HTTP 200 via l'accès Vercel autorisé, et le RPC public a répondu HTTP 200 avec la clé publiable V2. Aucun parcours complet avec compte réel n'est encore validé ; ne pas annoncer 87/87.

Le client bloque tout projet Supabase autre que `tourneo-v2-test`, y compris en cas de mauvais paramétrage du déploiement, pour éviter une écriture accidentelle en V1.

## Conservation automatique des photos

Trois migrations supplémentaires, une Edge Function V2 et une tâche horaire sont déployées. Le premier enregistrement serveur d'un tournoi terminé fixe le délai : 15 jours en mode Simple/Camping, 90 jours en mode Expert. Le client ne peut ni imposer une date arbitraire ni prolonger le délai en changeant de mode après clôture. Les avatars de profil ne sont pas concernés.

Les photos de tournoi expirées ne peuvent plus obtenir de lien signé ; la durée du lien est bornée à l'échéance. Le nettoyage utilise l'API Storage pour supprimer les fichiers, puis enlève les copies de podium conservées dans le JSON. Les photos orphelines de tournois supprimés sont ciblées après un jour de sécurité. Un ancien cache ne peut pas réintroduire une photo après son échéance ; le client conserve l'échéance dans son cache local. Les copies exportées/téléchargées hors de l'application ne sont pas effaçables par ce mécanisme.

Authentification du traitement : jeton aléatoire, privé en base, valide dix minutes et consommable une fois ; aucune clé de service dans la requête du planificateur ni dans le navigateur. Les RPC administratives sont réservées au rôle serveur. `verify_jwt=false` est intentionnel, car la fonction vérifie ce jeton avant toute suppression. L'Edge Function utilise uniquement les secrets serveur fournis par Supabase.

Vérification réelle sur V2 : appel avec un jeton du planificateur → HTTP 200, 0 photo à supprimer ; appel avec un faux jeton → HTTP 401. Le cron `tourneo-v2-purge-photos` est actif, à la minute 17 de chaque heure. Cela confirme le trajet cron/HTTP/Edge/DB ; aucune suppression d'un véritable fichier expiré n'a été exécutée pour les tests.

Les tests locaux PostgreSQL ajoutent les limites 15/90 jours, protection des tournois actifs et avatars, interdiction de prolongation, refus de lecture après échéance, refus de restauration par un cache ancien et authentification à usage unique. Cron et HTTP sont remplacés localement par des substituts. `npm run test:purge` vérifie le refus des requêtes non autorisées, la suppression ciblée et la reprise possible après un échec Storage. Tests locaux, TypeScript et compilation réussis.

La traduction complète, les e-mails/push, le format coopératif et les autres points non retrouvés dans la liste initiale restent à traiter. La V2 n'est toujours pas annoncée 87/87. L'aperçu Vercel a démarré après correction des variables V2 ; la liste complète des parcours utilisateur reste à tester.

## Connexion des utilisateurs V2

La configuration publique Auth de Supabase V2 a été vérifiée : inscription e-mail active, confirmation d'e-mail demandée, connexion Google désactivée. L'écran consulte les réglages publics et affiche Google uniquement lorsqu'il est disponible ; le formulaire e-mail reste utilisable même si cette lecture échoue. Si un environnement autorise une session immédiate après inscription, le client ouvre le tableau de bord au lieu d'annoncer un e-mail de confirmation inexistant. Les comptes V2 sont indépendants de la base V1. Les redirections des e-mails de confirmation et de réinitialisation doivent encore être vérifiées avec un compte réel.

Retours du premier essai utilisateur : version accessible ; demande d'un retour immédiat au clic et d'un œil barré pour le mot de passe. Ajoutés sur connexion/inscription : messages d'attente, indicateur animé, confirmations/erreurs distinctes, blocage des doubles envois et prise en charge d'Entrée. Le mot de passe est masqué par défaut, affichable localement puis remasqué au départ du champ ou à la perte de visibilité de la fenêtre. Le même champ est utilisé pour la réinitialisation. La valeur envoyée à Auth ne change pas avec l'affichage. Premier parcours manuel dans `V2-PREMIER-TEST.md`.

## Profil et impression personnalisable — 12 novembre 2026

- Profil : verrou commun immédiat avant préparation d’un emoji, envoi de photo ou enregistrement de l’identité. Les doubles clics ne lancent plus d’opérations concurrentes. Les erreurs réseau libèrent les commandes pour permettre une nouvelle tentative. Une mise à jour de l’identité ne remplace plus l’avatar avec une ancienne valeur de la page. La copie du code joueur affiche une confirmation ou une erreur.
- Impression : A4/A3, portrait/paysage, choix indépendant des participants et pointage, planning/feuilles de scores et classement ; scores vierges, grandes cases, couleur, logo officiel et QR des résultats. Le classement reste indépendant du choix de scores vierges. Cache local prioritaire pour préparer les feuilles hors connexion ; repli cloud et erreur de chargement lisible. Aucun changement de base nécessaire.
- `node tests/profil.cjs` exerce les véritables gestionnaires de la page avec des API navigateur/réseau retardées : concurrence, encodage défaillant, échec réseau et nouvelle tentative, absence d’écrasement d’un avatar récent.
- `node tests/impression.cjs` exerce la page avec un tournoi local de quatre joueurs : six rencontres, choix des rubriques, scores vierges, A3 paysage, absence de photos des participants et blocage de l’impression sans rubrique. Ces tests en mémoire ne remplacent pas un navigateur ni une imprimante réelle.
- TypeScript, tests moteur et compilation locale passent. Le navigateur Chromium ne démarre pas dans cet environnement : l’aperçu visuel et le dialogue d’impression restent à vérifier sur l’appareil utilisateur. L’imprimante peut demander de sélectionner à nouveau le format et l’orientation.
- Le point 75 initial mentionnait aussi tableaux/poules, programme complet et QR par match : ces éléments ne sont pas annoncés comme terminés par ce lot. La liste originale 1–74 n’est toujours pas récupérée ; ne pas annoncer 87/87.

## Suivi local, papier détaillé et programme — 12 novembre 2026

- La projection publique masque les identifiants de compte : le suivi joueur ne dépend plus d’une reconnaissance impossible du compte dans ces données. Choix explicite du pseudo à suivre sur l’appareil, trois prochains passages, terrain et horaire estimés, rencontres précédentes et attente de validation. Aucune identité de compte ni autorisation de modification n’est ajoutée à la projection publique.
- Alertes locales avec consentement navigateur, retrait sur l’appareil et dédoublonnage par session ; utilisation du service worker lorsqu’il est actif pour les appareils mobiles. Un clic ouvre le match public correspondant. Ce ne sont pas des push serveur : la page doit continuer à s’exécuter ; les restrictions du navigateur peuvent suspendre son activité. Les e-mails/push lorsque l’application est fermée restent à configurer.
- Actualisation publique séquentielle : pas de requêtes concurrentes périodiques, dernier résultat conservé lors d’une coupure, nouvelle tentative à la reconnexion. Le planning respecte à nouveau le repos des joueurs lorsque la projection publique utilise des tableaux de joueurs vides.
- Impression : poules et classements par poule, tableaux sous forme de listes par tour et branche, filtre par tour, QR ouvrant un match précis. Les QR par match sont limités à 128 rencontres par impression pour éviter de surcharger un appareil ; sélectionner un tour pour les grands tournois.
- Événement : programme sélectionné classé par date, horaires/durées/terrains estimés et état de préparation ; l’impression exclut la liste d’édition et les tournois non sélectionnés. Création et édition protégées contre les clics simultanés, erreurs réseau récupérables.
- Tests ciblés : `node tests/suivi.cjs`, `node tests/impression.cjs`, `node tests/evenements.cjs`. Ils couvrent les repos avec données publiques, rotations, ordre manuel, validations en attente, consentement et échecs Notification, protection des liens de notification, QR par match, filtre par tour, poules et programme sélectionné/chronologique. Ce sont des tests locaux avec APIs simulées, sans test réel de notification sur téléphone ni impression physique.
- Traduction complète, e-mails/push serveur et format coopératif restent incomplets. Le détail original du format coopératif et la liste 1–74 ne sont pas récupérés malgré les recherches ; ne pas inventer ces spécifications ni annoncer 87/87.

## Import Excel direct — 12 novembre 2026

Le point d’import accepte désormais les classeurs `.xlsx` en plus du CSV et du texte. La première feuille est lue, avec recherche de la colonne Nom/Participant/Joueur/Équipe/Pseudo/Name ou utilisation de la première colonne. Aperçu des premiers noms puis ajout explicite ; doublons ignorés, limite de 256 participants cumulés avec la liste existante. Un changement de tournoi ignore une lecture de fichier encore en cours. Les fichiers `.xls` doivent être enregistrés en `.xlsx` ou CSV.

La lecture se fait sur l’appareil, sans envoi du classeur à un serveur. Le lecteur Excel est chargé à la demande et sa version est fixée dans le verrou de dépendances. Taille limitée à 500 Ko ; prélecture des métadonnées ZIP refusant les archives chiffrées, les structures invalides, plus de 512 entrées ou plus de 10 Mo déclarés après décompression. Les noms et les données d’autres colonnes ne sont pas rendus en HTML. Les formules/macros ne sont pas exécutées comme du code de l’application.

`node tests/import-excel.cjs` utilise un véritable classeur XLSX généré en mémoire et le parseur de la dépendance : première feuille, colonne Nom, entités XML, doublons, CSV/texte, quota cumulé, archives invalides et volume décompressé excessif. Le transport Worker navigateur n’est pas simulé par ce test et reste à essayer sur l’appareil. La détection du séparateur CSV ignore maintenant les virgules/points-virgules contenus dans des guillemets ; les lignes vides initiales n’ajoutent plus un faux participant « Nom ».

`npm run test:parcours` regroupe les tests locaux de profil, impression, suivi, événement et import ; `npm test` conserve les tests du moteur. TypeScript et compilation locale ont réussi pour ce lot. Aucun accès ni migration de base n’est nécessaire.

## Retours du test utilisateur — statistiques et annonce des matchs

- Statistiques : remplacement des chiffres collés par sept cartes distinctes, filtres alignés et réinitialisables, disciplines avec libellés français, tableau espacé et barres de progression, avis lisibles et état vide. Mise en page adaptée aux petits écrans et à l’impression. Les calculs existants sont conservés. Les erreurs réseau ne laissent plus un chargement permanent ; une nouvelle tentative est proposée.
- Le bouton « Appeler » ne transmettait rien aux joueurs. Il est renommé « Annonce sur place » et ouvre le texte directement sous la rencontre. Mention explicite « Aucune notification envoyée », copie du texte avec confirmation/échec et retour du focus à la fermeture. Aucun témoignage de réception n’est simulé.
- Repères nominatifs : « Profil lié » seulement après vérification avec la recherche authentifiée existante, « Sans profil lié » après vérification négative, « Profil non vérifié » pendant la recherche ou en cas d’erreur. Les UUID des joueurs saisis manuellement ne sont pas assimilés à des comptes. Les repères couvrent les doubles tournants et ne préjugent ni de l’installation de l’application, ni du consentement aux alertes, ni de leur réception.
- Les nouvelles insertions par profil/code conservent un profilId explicite ; une modification d’un participant conserve ses métadonnées de liaison. Les anciens participants sont vérifiés par leur identifiant via le RPC existant.
- `node tests/annonces.cjs` vérifie les profils liés/sans compte, l’échec réseau, la copie sans envoi de notification et les rotations. Aucun message n’est envoyé à de vrais joueurs pendant ces tests. Aucune migration de base n’est nécessaire.
