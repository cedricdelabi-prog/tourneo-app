# Corrections issues des essais du 13 novembre

Branche cible : tourneo-v2-dev uniquement. Main et V1 conservées.

- Trois vrais drapeaux SVG FR/EN/NL toujours visibles, y compris sur Windows (sans dépendre des emojis de drapeau), langue appliquée immédiatement et synchronisée au compte.
- Aides i accessibles au clic et au clavier, fermeture Échap et clic extérieur, paramètres détaillés de création et explications propres à chaque écran principal. Une aide ne dépend pas d’un survol.
- Calendrier natif ouvert sur tout le champ lorsqu’il est pris en charge ; saisie clavier et icône restent utilisables sinon. Date prévue et lieu visibles dès les réglages courants.
- Affiche : reprise automatique du nom, du sport, de la date, du lieu et de l’organisateur (avec repli sur la structure du compte), capacité et terrains si disponibles. Les anciennes personnalisations vides ne masquent plus ces informations. Les retouches volontaires restent propres à l’affiche.
- Aperçu jamais démonté pendant la saisie, calcul différé de 200 ms, remplacement après décodage de la nouvelle image ; export désactivé le temps de sa mise à jour pour éviter une image périmée.
- Contraste imposé aux champs et options même en thème système clair. Modèles annonce/résultats, inscriptions en ligne/QR ou sur place, illustration vectorielle selon le sport (boules et cochonnet pour pétanque, raquettes, ballons, cible, cartes ; trophée pour les autres), logo facultatif et informations pratiques.
- Partage PNG par la fenêtre système si disponible, boutons Facebook/Instagram/Snapchat/WhatsApp ; sinon téléchargement et consigne explicite pour joindre l’image. WhatsApp propose aussi un lien texte. Pas d’envoi ou de publication automatique, ni de promesse de ciblage direct d’un réseau non pris en charge par le téléphone.
- Liens publics et QR d’inscription/résultats toujours sur https://tourneo-v2-test.vercel.app : ils ne recopient plus l’adresse d’une prévisualisation Vercel protégée.
- Bouton Désigner les arbitres pendant la préparation ; enregistrement du brouillon puis accès direct à leur gestion. Raccourci dans Matchs. Les arbitres sont désignés pour l’ensemble du tournoi, pas encore affectés individuellement à chaque rencontre. La validation finale appartient toujours à l’organisateur.
- Avant de quitter pour les affiches, inscriptions ou arbitres, sauvegarde complète avec contrôle de révision ; en cas de conflit, aucune navigation ni écrasement silencieux.

## Vérifications

Métadonnées et personnalisation anciennes/nouvelles, URL publique et dates FR/EN/NL ; parcours existants et synchronisation ; navigateur Chromium 320/390/1366 px pour affiches, champs, partage simulé, aide et drapeaux, plus 320/390/768/1366 px pour les espaces. PDF A4 vérifié en une seule page. Les essais réels Safari iPhone et partages natifs vers chaque réseau restent à faire sur un appareil.

Le 13 novembre, le compte propriétaire confirmé a reçu le rôle superadmin dans la base V2 (activation tracée). Aucun privilège n’est attribué automatiquement à l’inscription. Les notifications Android/e-mail restent dépendantes des configurations externes déjà recensées. Aucune facturation activée.
