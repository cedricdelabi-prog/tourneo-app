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

Trois migrations appliquées sur `tourneo-v2-test` (`kmjfmjhdnokkaiolxiin`). Socle profils/tournois/palmarès, stockage privé, inscriptions, événements et arbitrage installés. Test SQL transactionnel réussi : RLS profils/tournois, refus organisateur non propriétaire, score arbitre, quota, idempotence et annulation. Tests simultanés et parcours navigateur réels restent à faire.

## Vérifications

`npm test` couvre calendriers (0 à 64 participants), double élimination et consolante (jusqu'à 64, plusieurs scénarios de résultats), seconde chance en finale, disponibilité des terrains et repos, classements, rotation des partenaires, import CSV, sauvegardes, appariements suisses/exemptions et règles de score. Vérifier aussi TypeScript et la compilation Next.js.

Les builds locaux peuvent utiliser une URL Supabase factice : ils ne prouvent pas le fonctionnement du backend. Tests navigateur connecté, inscriptions simultanées, politiques RLS, stockage réel et déploiement effectif des migrations restent à réaliser sur V2.

## Limites et suite

Les échanges mentionnent 87 évolutions, mais la liste numérotée complète n'a pas été récupérée. Ce document ne prétend pas les remplacer et ne permet pas d'annoncer 87/87.

Restent notamment : tests navigateur et simultanéité des modules ci-dessus ; gestion collective des clubs et accompagnateurs ; format coopératif à préciser ; traduction complète selon la langue du compte ; notifications et e-mails avec consentements distincts ; évaluations ; cycle de conservation et suppression des photos (15 jours gratuit / 90 jours Expert) ; statistiques administrateur globales ; vérification du périmètre de la future option Expert à paiement unique à vie. Aucun paiement n'est ajouté.

Le mode hors connexion exige un premier chargement réseau et ne gère pas encore la résolution collaborative de modifications concurrentes sur plusieurs appareils. Les nouveaux modules d'inscriptions et d'arbitrage nécessitent le réseau. Les données locales non synchronisées restent prioritaires au rechargement.

## Sécurité et partage au 12 novembre 2026

Photos privées : références stables en base et URL signées à l'affichage, sans URL publique sauvegardée. Données privées du profil accessibles uniquement au propriétaire ; recherche de pseudo/code réservée aux comptes connectés. Le partage du tournoi sans connexion est temporairement désactivé suite au refus du contrôle automatique sur la divulgation publique. Une proposition limitée aux noms/pseudos et données de jeu, sans photos ni profilId, se trouve dans `supabase/proposals/PARTAGE_PUBLIC_A_VALIDER.sql` ; elle n'est pas appliquée. Les RPC d'inscription invité restent ouvertes par lien/jeton. Les alertes advisors sur les fonctions SECURITY DEFINER correspondent aux API protégées par contrôles de propriétaire, attribution arbitre ou jeton ; elles ne remplacent pas les tests.

La configuration du client bloque tout projet Supabase autre que la base V2 afin d'éviter des écritures accidentelles vers V1. La compilation avec clé factice ne vérifie pas les variables du déploiement Vercel.
