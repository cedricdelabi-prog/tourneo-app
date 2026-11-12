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

Sept migrations appliquées sur `tourneo-v2-test` (`kmjfmjhdnokkaiolxiin`). Socle profils/tournois/palmarès, stockage privé, inscriptions, événements et arbitrage installés. Test SQL transactionnel réussi : RLS profils/tournois, refus organisateur non propriétaire, score arbitre, quota, idempotence et annulation. Tests simultanés et parcours navigateur réels restent à faire.

## Vérifications

`npm test` couvre calendriers (0 à 64 participants), double élimination et consolante (jusqu'à 64, plusieurs scénarios de résultats), seconde chance en finale, disponibilité des terrains et repos, classements, rotation des partenaires, import CSV, sauvegardes, appariements suisses/exemptions et règles de score. Vérifier aussi TypeScript et la compilation Next.js.

Les builds locaux peuvent utiliser une URL Supabase factice : ils ne prouvent pas le fonctionnement du backend. Tests navigateur connecté, inscriptions simultanées, politiques RLS, stockage réel et déploiement effectif des migrations restent à réaliser sur V2.

## Limites et suite

Les échanges mentionnent 87 évolutions, mais la liste numérotée complète n'a pas été récupérée. Ce document ne prétend pas les remplacer et ne permet pas d'annoncer 87/87.

Restent notamment : tests navigateur et simultanéité des modules ci-dessus ; gestion collective des clubs et accompagnateurs ; format coopératif à préciser ; traduction complète selon la langue du compte ; e-mails et notifications push (les notifications internes et les consentements séparés sont installés) ; cycle de conservation et suppression des photos (15 jours gratuit / 90 jours Expert) ; statistiques administrateur globales (les statistiques organisateur sont installées) ; vérification du périmètre de la future option Expert à paiement unique à vie. Aucun paiement n'est ajouté.

Le mode hors connexion exige un premier chargement réseau et ne gère pas encore la résolution collaborative de modifications concurrentes sur plusieurs appareils. Les nouveaux modules d'inscriptions et d'arbitrage nécessitent le réseau. Les données locales non synchronisées restent prioritaires au rechargement.

## Sécurité et partage au 12 novembre 2026

Photos privées : références stables en base et URL signées à l'affichage, sans URL publique sauvegardée. Données privées du profil accessibles uniquement au propriétaire ; recherche de pseudo/code réservée aux comptes connectés. Le partage du tournoi sans connexion est temporairement désactivé suite au refus du contrôle automatique sur la divulgation publique. Une proposition limitée aux noms/pseudos et données de jeu, sans photos ni profilId, se trouve dans `supabase/proposals/PARTAGE_PUBLIC_A_VALIDER.sql` ; elle n'est pas appliquée. Les RPC d'inscription invité restent ouvertes par lien/jeton. Les alertes advisors sur les fonctions SECURITY DEFINER correspondent aux API protégées par contrôles de propriétaire, attribution arbitre ou jeton ; elles ne remplacent pas les tests.

La configuration du client bloque tout projet Supabase autre que la base V2 afin d'éviter des écritures accidentelles vers V1. La compilation avec clé factice ne vérifie pas les variables du déploiement Vercel.

## Modules ajoutés le 12 novembre 2026

- Activité : notifications internes pour attribution arbitre, proposition de score, nouvelle inscription et changement de statut d'une inscription identifiée. Marquage lu ; pas d'e-mail ou de push téléphone annoncé.
- Évaluations : une note par participant identifié après clôture ; avis accessibles seulement à leur auteur et à l'organisateur ; autoévaluation organisateur refusée ; modification/retrait possibles.
- Statistiques organisateur : filtre période/sport, participations (équipes comptées comme une place), matchs validés, fin de tournoi calculée avec le même moteur, avis, export CSV protégé contre les formules et impression. Pagination des requêtes.
- Préférences : consentement promotionnel Tourneo séparé, horodaté par le serveur, retrait pris en compte ; informations sportives internes ; texte agrandi et animations réduites.
- Protection du cache du tableau de bord par compte ; statut terminé corrigé pour les matchs non validés et le format suisse. Appel des joueurs visuel uniquement, conformément au refus des appels vocaux retrouvé dans les décisions utilisateur.

Tests moteur/statistiques, TypeScript et compilation réussis. Tests SQL transactionnels des évaluations, refus d'autoévaluation, notifications isolées, consentement/retrait et désactivation des informations sportives réussis. Le déploiement Vercel du commit 59584dd a échoué, cause non vérifiée : accès aux journaux Vercel requis. Ne pas annoncer la V2 déployée ni les 87 points terminés. La liste intégrale 1–75 n'a toujours pas été retrouvée ; les exigences complémentaires connues restent dans la section Limites et suite.

Cinquième migration : index des clés étrangères et optimisation des politiques RLS. Advisors performance : aucun avertissement restant, seulement les index neufs encore inutilisés. Le dernier nouveau passage du test transactionnel a expiré à la confirmation ; le passage précédent avait réussi avant cette optimisation équivalente des politiques.

## Partage public approuvé le 12 novembre 2026

L'utilisateur a explicitement autorisé pseudos, matchs, scores et classement, sans photos ni coordonnées. La sixième migration remplace la désactivation temporaire décrite plus haut. Les données de jeu sont projetées par liste de champs autorisés et les identifiants des joueurs sont remplacés par des alias propres au tournoi, y compris pour les doubles tournants et exemptions. Les identifiants de compte, photos et champs supplémentaires ne sont pas envoyés. Test SQL transactionnel de la projection anonyme réussi. Ce test ne prouve pas le succès du déploiement Vercel, toujours à diagnostiquer après connexion.

Septième migration : le palmarès individuel contenant les UUID de compte exige une connexion ; le classement public reste fourni par la projection du tournoi avec alias. Vérification des droits : accès anonyme au classement tournoi oui, lecture brute du palmarès non, photos publiques non.
