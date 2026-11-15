# Corrections et contrôle V2 — 15 novembre 2026

Branche `tourneo-v2-dev` uniquement. Aucun changement à main, à la V1, aux droits administrateur ni aux données des utilisateurs.

## Livraison

- Aide, formats et tous les guides : navigation commune avec le logo officiel et retour vers l’espace. Les anciens appels « Créer un tournoi » n’envoient plus systématiquement vers `/login` : la création vérifie elle-même la session. Aucun signOut n’a été trouvé dans ces pages. Le parcours connecté réel reste à vérifier avec une session de test ; ne pas affirmer qu’une perte de session a été reproduite.
- Identité Arena déjà retenue dans `V2-DECOUVERTE-ARENA.md` : palette bleu nuit/électrique/turquoise et tracés de terrain étendus aux pages applicatives, en-tête et cartes. Impression sans fond décoratif. Logo officiel conservé.
- Audio : préchargement, démarrage dans le clic utilisateur, reprise AudioContext, amplification x2 de la roue avec compresseur. Fichier approuvé inchangé. Aucune erreur de lecture masquée ; aide et état de lecture visibles. Respect du choix muet et arrêt lors du changement d’outil. Animation roue alignée sur les 3,8 secondes de l’enregistrement.
- Onglet « Mes affiches » dans le tournoi : inscriptions, quatre A6, spectateurs/pronostics, classement final et résultats par journée/phase. Les accès directs choisissent le modèle sans effacer photo ou sponsors.
- Résultats par phase : journées, rondes suisses, phases de poules/finale distinctes, branches repêchage/consolante. Douze rencontres maximum par page, scores non validés signalés, A4/A3 et impression/enregistrement PDF. QR uniquement si le tournoi est effectivement partagé ; logos sponsors locaux repris. Les futures phases n’existent qu’après génération des matchs.
- Conditions d’utilisation publiques et liens persistants. Confidentialité complétée : bases légales, informations facultatives, stockage local, promotions sur consentement et droits. Traductions FR/EN/NL/DE ajoutées.
- Google : bouton visible avec état indisponible explicite. Fournisseur désactivé en V2, activation pas réalisée et aucune connexion OAuth annoncée comme fonctionnelle.

## Contrôle et limites

- Tests des migrations dans les deux modes, administration et non-auto-promotion compris : réussis. RLS activé sur les tables applicatives inspectées.
- Une seule attribution administrative vérifiée en lecture dans V2 : le compte Cédric confirmé est superadmin. Cela ne recense pas les collaborateurs des consoles d’hébergement/GitHub/Supabase.
- Auth Google `false`, e-mail `true`, inscription ouverte. Tableau de bord Supabase accessible uniquement après connexion interactive ; les outils disponibles ne modifient pas la configuration Auth.
- Vercel V2 ne configure pas encore l’envoi Contact : ni RESEND_API_KEY ni NEXT_PUBLIC_CONTACT_EMAIL. Blocage réel pour le contact et l’exercice des droits avant une diffusion générale.
- Protection des mots de passe compromis désactivée. Alertes SECURITY DEFINER à examiner selon les contrôles d’accès internes ; aucune suppression aveugle des RPC publiques nécessaires aux inscriptions.
- Mentions légales de l’éditeur : statut particulier gratuit confirmé, identité/coordonnées/choix d’anonymat auprès de l’hébergeur non finalisés. DPA, durées détaillées des journaux/sauvegardes et procédures d’incident à finaliser. Pas de certification « conforme RGPD » ni de garantie « zéro bug ».
