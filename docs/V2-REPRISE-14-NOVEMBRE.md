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
