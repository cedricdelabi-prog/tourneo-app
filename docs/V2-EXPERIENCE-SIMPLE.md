# Tourneo V2 — expérience simple, fluide et intuitive

Demande du 14 novembre 2026 : enrichir Tourneo pour organisateurs, joueurs et spectateurs, sans surcharger l’organisation. **Vidéo et captation exclues à la demande de Cédric.** Branche `tourneo-v2-dev` uniquement ; déploiement `tourneo-v2-test`, base `kmjfmjhdnokkaiolxiin`. Aucun changement V1/main.

## Première vague implémentée

- Assistant de formule facultatif, replié : effectif, terrains, temps, durée et priorité. Propositions mesurées par le même moteur de planning. Après sélection, l’assistant se replie et rend le focus à son résumé ; la confirmation reste visible. Championnat, suisse, coupe lorsque l’effectif est compatible, doubles tournants explicitement annoncés. Estimations de toute la formule simulée ; le suisse reste estimatif car ses adversaires dépendent des résultats. Entre 2 et 128 participants pour cet assistant, sans modifier la limite du tournoi manuel. Une simulation ne crée aucun faux joueur.
- Vérification avant démarrage : noms, identifiants, doublons de profils, paramètres et contraintes de formule. Les homonymes donnent une indication ; les erreurs bloquantes empêchent le lancement. Les inscriptions acceptées côté serveur sont recontrôlées au démarrage. Réestimation disponible directement dans l’étape Participants pour éviter les allers-retours.
- Imprévus : décalage choisi et fermeture d’un ou plusieurs terrains ; proposition avant application, détails des huit premiers changements et total, possibilité de garder le planning. Conservation exacte des créneaux des rencontres validées ou contenant un score, y compris une manche partiellement saisie. Aucun forfait, suppression de joueur ou résultat automatique. Les rencontres à venir conservent les repos et utilisent les terrains restants. Les nouveaux tours ajoutés ensuite héritent des contraintes. Annulation de la dernière adaptation tant que résultats, validation et réglages n’ont pas changé. Cette annulation locale n’est pas un journal permanent des scores.
- Repère de journée : rencontres restant à valider et fin estimée des rencontres effectivement générées. Mention explicite lorsque les tours futurs ne sont pas encore générés ; aucune fausse heure de fin globale. Annonces des six prochains matchs prêtes à lire/copier, sans envoi automatique.
- Famille/favoris : jusqu’à douze participants du même tournoi, sans compte, sélection conservée sur cet appareil. Programme commun dédoublonné et trié ; trois prochains passages visibles, suite à la demande, indication des passages simultanés sur différents terrains. Ce module ne modifie pas le planning et n’agrège pas encore plusieurs tournois.
- QR évolutif `/t/[id]` : inscription/statut, matchs/favoris, pronostics ou classement du public et résultats selon l’avancement. Lit seulement les RPC publiques existantes. Actualisation, reprise après erreur et absence de compte obligatoire. Le QR général de partage et les nouveaux supports d’inscription pointent vers cet accueil. Les QR des matchs et des pronostics restent directs. Les anciens liens imprimés restent valables.
- Dossier du jour J dans l’impression : pointage, planning, règles de l’activité, vérifications de matériel et panneaux de terrain avec QR évolutif. Disponible par `Gérer le tournoi → Dossier prêt pour le jour J`. Les panneaux et les règles restent des supports à adapter ; aucune certification ou document réglementaire automatique.
- Affichage mobile : onglets publics corrigés pour éviter le débordement à 320 px. Réglages et modules avancés repliés. Traductions FR/EN/NL des nouveaux parcours. Export PDF sans filtre sur toute la page pour conserver le texte sélectionnable et les bordures.

## Base V2

Migration `20261114190703_tourneo_v2_planning_adapte_public.sql` appliquée avec succès : la projection publique conserve uniquement les champs numériques nécessaires aux horaires adaptés. Les objets libres et données privées sont filtrés, les participants restent aliasés. Aucun nouveau droit de lecture directe sur `tournois`. Aucun tournoi utilisateur modifié pour les essais. La migration des photos/compteur encore en attente reste indépendante.

## Vérifications

- Moteur : effectifs 2 à 128, nombre total de matchs et temps, formats effectivement compatibles ; invariance des résultats, protection des créneaux, absence de conflit terrain/joueur et repos ; tours ajoutés après adaptation ; favoris et dédoublonnage.
- SQL local : migrations ordonnées et activation consolidée, projection numérique, filtrage des champs privés et JSON malformé, refus de lecture directe anon. Données d’essai annulées.
- Supabase réel : définition mise à jour, rôle anon autorisé sur la projection et refusé en lecture directe de la table.
- Chromium 320/1366 avec API simulée : assistant/application, garde de configuration, aperçu sans mutation, adaptation/annulation, conservation des scores, accueil évolutif, famille sans compte persistante, dossier et PDF rendu. Régressions flyers A6 (quatre QR vers `/t/[id]`) et pronostics passées. Vérification visuelle des pages et de l’impression.
- TypeScript, tests moteur/parcours et langues réussis ; compilation Next locale réussie. Le déploiement V2 doit être vérifié jusqu’au statut READY avant livraison.

## Suite approuvée, non encore implémentée par cette vague

- Travail à plusieurs avec droits distincts accueil/terrains/photos/organisation et historique durable des actions.
- Correction réversible des résultats avec aperçu des conséquences sur les tours suivants.
- Prochaine édition, saisons et classements cumulés dédiés aux événements récurrents.
- Disponibilités personnelles, conflits entre plusieurs tournois et suivi familial commun à plusieurs événements.
- Recherche de partenaire/remplaçant dans l’événement.
- Objectif de participation minimale et équilibrage avancé, avec preuve que le planning peut le respecter.
- Progression par discipline, distinctions conviviales et votes fair-play séparés des résultats sportifs.
- Explication de l’enjeu d’un match et animation supplémentaire entre les matchs.
- Cartes souvenirs enrichies et récapitulatif automatique vérifié depuis les résultats validés et les photos autorisées.

Les briques déjà présentes (groupes, événements cumulés, profils, photos, pronostics, annonces et formats avancés) serviront à ces extensions. Cette liste n’est pas une annonce de livraison de toutes les idées ni de complétude globale 85/85. Aucun module vidéo à prévoir sans nouvelle demande explicite.
