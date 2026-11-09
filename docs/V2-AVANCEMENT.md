# Tourneo V2 — reprise du 9 novembre 2026

Branche exclusive : `tourneo-v2-dev`. Ne pas fusionner dans `main` et ne pas modifier la V1.
Le contexte précédent identifie Vercel `tourneo-v2-test` et une base Supabase V2 séparée. Ne pas remplacer cette base par la base V1.

## Lot de cette reprise

- Format championnat aller-retour disponible dans les deux sélecteurs de configuration, génération des rencontres et classement général.
- Import de participants CSV Excel UTF-8 (virgule ou point-virgule) ou texte : colonne Nom/Participant/Joueur/Équipe, doublons ignorés, champs cités, limites de taille et de longueur.
- Export CSV organisateur avec protection contre les formules et échappement des guillemets ; même protection ajoutée à l'export public.
- Mode écran géant sur la vue publique, avec plein écran lorsque le navigateur le permet.
- Respect de la préférence système de réduction des animations.
- Cache local distinct pour chaque tournoi ; récupération des modifications non synchronisées avant la copie cloud ; nouvelle tentative lors du retour du réseau.
- Suppression du bloc de suggestions de marques restant et du fichier ads.txt.
- Tests de régression du moteur, des calendriers pour 0 à 64 participants, de l'import, des classements, des séries et des exports : `npm test`.

## Limites de vérification

TypeScript et compilation Next.js peuvent fonctionner avec une URL Supabase factice pour le build. Cela ne vérifie ni la base réelle, ni ses politiques RLS, ni les parcours connectés, ni la synchronisation sur plusieurs appareils. Le cache local ne rend pas encore toute l'application installable/utilisable sans premier chargement réseau. Les modifications locales en attente sont prioritaires sur la copie cloud au rechargement ; la résolution collaborative de conflits reste à construire.

## Périmètre retrouvé, pas une liste exhaustive validée

Les échanges précédents mentionnent **87 évolutions**, mais leur liste numérotée complète n'a pas été récupérée. Ne pas annoncer 87/87 terminées à partir de ce document et ne pas inventer les points manquants.

Restent notamment à spécifier, intégrer et tester de bout en bout : inscriptions autonomes lien/QR (quotas, échéance, validation, pointage, liste d'attente, fermeture au démarrage), modes Simple/Expert, double élimination et consolantes, partenaires tournants, tirages équilibrés/manuels, scores adaptés aux disciplines, arbitres authentifiés, modèles, terrains et repos, multi-tournois/événements et classement cumulé, accompagnateurs/parents, notifications et consentements distincts, multilingue, photos (15 jours gratuit / 90 jours Expert), exports papier complets, mode Camping/Animation, fonctionnement hors connexion complet et sécurité Supabase V2.

La gratuité de la V2 et l'absence de publicité sont confirmées ; les échanges évoquent aussi une option Expert avec paiement unique à vie. Ne pas mettre en place une facturation sans clarifier son périmètre exact.
