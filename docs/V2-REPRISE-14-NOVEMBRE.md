# Reprise du 14 novembre 2026

Branche `tourneo-v2-dev`, projet Vercel `tourneo-v2-test`, base V2 `kmjfmjhdnokkaiolxiin`. Main et V1 hors périmètre.

## Changements disponibles sans migration

- Bulles d’aide mesurées et placées près du champ, hors des conteneurs transformés, avec suivi du défilement et du redimensionnement ; Échap et retour du focus.
- Fiches tennis et volley enrichies : service, fautes et let ; touches, contre, rotation et service. Synthèses depuis LTA et FIVB 2025–2028 ; liens conservés dans les sources du code, aucune sortie imposée dans l’interface. Traductions FR/EN/NL.

## Modules prêts, activation de base encore nécessaire

`20261114171715_tourneo_v2_compteur_et_photos.sql` est testé localement mais **non appliqué** : les deux confirmations techniques Supabase ont expiré. Ne pas annoncer ces modules comme activés :

- Compteur public en fourchette de comptes confirmés, organisateurs/joueurs/spectateurs comptés une seule fois. Aucun visiteur anonyme inventé ni nouvelle collecte de suivi. Comptes supprimés, bannis en cours, anonymes et non confirmés exclus. Aucun compteur de personnes connectées en direct.
- Photo publique : image séparée limitée à 800 px et filigrane répétitif dans le fichier. Téléchargement de qualité distinct avec autorisation de l’organisateur vérifiée par Storage. Les originaux gardent leurs politiques privées. Ni blocage des captures Web, ni paiement ajouté.
- Modération : seuls les aperçus des albums déjà partagés, superadmin, motif obligatoire et journal administratif. L’écran se ferme après cinq minutes. Cette durée est une limite de consultation dans l’interface, pas un secret ni une expiration des liens publics d’un album partagé. Aucun nouvel accès aux albums privés.
- Les réglages photo nouveaux sont cachés si la colonne de base n’existe pas ; le partage existant reste utilisable. Sans RPC de compteur, aucun chiffre de remplacement n’apparaît. L’onglet de modération apparaît seulement si sa RPC est disponible pour le superadmin.

La migration désactive le partage d’anciens albums qui n’ont pas encore leur aperçu distinct ; l’organisateur devra réenregistrer le partage pour générer les aperçus. Contrôle en ligne avant tentative d’activation : aucun album partagé ni photo dérivée enregistré, donc aucun partage utilisateur à couper à ce moment.

## Vérifications

- TypeScript et compilation Next.js avec configuration V2 de test ; clé factice en local, aucun accès utilisateur réel établi par ce build.
- Moteurs et parcours, purge, traductions, alertes et transport Android : réussis.
- PostgreSQL local : migrations ordonnées et activation consolidée, compteur sans identifiants, aperçu seul, refus de qualité malgré URL connue, autorisation/retrait, rôles admin/superadmin, motif et journal ; originaux privés. Ces contrôles ne remplacent pas Auth/REST/Storage réels.
- Chromium 320 et 1366 px avec API simulée : compteur avant connexion, aide ancrée même sous transformation CSS, défilement, Échap/focus, motif et fin de consultation après cinq minutes ; album et génération du fichier d’aperçu JPEG de 800 px maximum ; téléchargement sur demande et retrait.
- Compatibilité avec la base précédente vérifiée séparément ; les nouveaux contrôles photo n’apparaissent pas sans activation.

Les essais physiques iPhone/Android, les e-mails sans expéditeur et les autres limites précédentes restent ouverts. Aucun message réel envoyé. Aucune annonce 85/85 ou 87/87.

## Suite — création, pronostics invités et affiche spectateurs

- Le bouton d’aide général près des drapeaux est retiré ; les aides des champs sont conservées.
- Configuration validée avant l’onglet Participants : nom, choix explicite d’activité, paramètres de format/planning/barème. Date et lieu restent facultatifs et annoncés comme tels. Les valeurs par défaut valides sont acceptées. Le choix de la même activité conserve les réglages personnalisés.
- Les cinq modes de pronostic se choisissent avec des cartes radio. Un minimum de 2/3/5 participants est annoncé ; le manque d’effectif bloque l’enregistrement, pas la lecture des modes. Après un vote, une clôture ou le lancement, les restrictions sont expliquées. L’enregistrement ramène au tournoi et confirme le succès.
- Migration `20261114181722_tourneo_v2_pronostics_invites.sql` **appliquée avec succès sur Supabase V2**. Vote sans compte : nom/pseudo obligatoire, jeton aléatoire privé par navigateur et tournoi, modification jusqu’à clôture, retrait de sa participation. Les anciens votes avec compte restent compatibles. Aucune garantie d’identité ni d’unicité par personne entre appareils. Table privée sans lecture/écriture directe anon ; RPC contrôlées. Publication des noms/points/rangs, jamais des jetons ou choix privés.
- Nouvelle page organisateur `/tournoi/[id]/pronostics/affiche`, raccourcis visibles depuis la préparation du tournoi, sauvegarde de la configuration avant navigation. QR ouvrant directement `/partage/[id]/pronostics`. Affiche dédiée A4/A3/social : marque Tourneo, activité, titre, CTA, QR contrasté, accès sans compte, échéance, lieu/date, organisateur et six sponsors. Téléchargement et partage.
- Bibliothèque `/regles` : les 57 entrées sont couvertes, avec recherche. 36 fiches pratiques, 13 variantes à préciser, 8 cadres de catégories générales. Sources et date de revue conservées, textes FR/EN/NL. Cette couverture ne signifie pas automatisation des décomptes spécialisés (bowling, tarot, mah-jong, jeux de plateau ou règles propres aux jeux vidéo).

### Vérifications de cette suite

- SQL : migrations ordonnées et script consolidé, invités anonymes, pseudo requis, isolation des jetons, modification, fermeture, classement mêlant comptes/invités, retrait, droits directs refusés ; tests annulés après exécution sur PostgreSQL local.
- Supabase réel : activation confirmée ; exécution RPC accordée au rôle anon, lecture/écriture directe de la table privée refusées. Aucun tournoi utilisateur créé ou modifié pour le test.
- Chromium 320/1366 px avec API simulée : les 57 fiches, recherche, configuration bloquante puis complète, modes radio, retour après sauvegarde, téléchargement de l’affiche, décodage réel des QR A4/A3/social, vote sans session de compte, modification puis clôture, classement. Stress affiche : titre long et six sponsors.
- Tests moteur et parcours, traductions, TypeScript et compilation Next réussis. Vérification visuelle de l’export social.

Les modules photo/compteur de la section précédente restent non activés ; cette migration de pronostics n’en dépend pas. Les essais physiques iPhone/Android et un parcours complet avec comptes réels restent à réaliser. Pas d’annonce de complétude globale 85/85.

### Flyers d’inscription A6

Nouveau format « A4 · 4 flyers A6 à découper » dans l’affiche d’inscription : feuille A4 2480 × 3508 px, quatre exemplaires identiques avec zones blanches, titre/activité/date/lieu/organisateur, logos et QR d’inscription. Deux lignes pointillées centrales. Export PNG, impression/PDF A4 à 100 %. Le QR n’est présent que si les inscriptions en ligne sont ouvertes et sélectionnées ; sinon le flyer indique l’inscription sur place. Le format est conservé sur cet appareil et revient à A4 quand on choisit les résultats. Contrôles navigateur 320/1366 px : décodage des quatre QR, lien vers la vraie route d’inscription, absence de QR après fermeture, persistance et PDF A4 d’une seule page.
