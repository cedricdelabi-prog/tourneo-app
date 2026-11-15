# Reprise des demandes du 15 novembre 2026

Branche : `tourneo-v2-dev` uniquement. La V1 et `main` ne sont pas modifiées.

| Demande | Résultat vérifiable |
|---|---|
| Barre du haut plus claire | Logo, Notifications, Messages, Mon compte et action principale. Le choix d’espace passe sur la ligne de navigation. Les langues, le profil, l’aide et le contact sont rangés dans Mon compte. |
| Éloigner la déconnexion de la création | Déconnexion uniquement au bas du menu du compte connecté, avec confirmation. |
| Notifications visibles | Accès nommé et compteur des notifications et appels non lus. L’ancienne page Activité devient Mes notifications. |
| Messagerie Tourneo | Nouvelle page Messages avec informations/promotions, lecture individuelle, compteur et filtres. Le contenu rédigé n’est pas traduit arbitrairement. |
| Administrateur : annonces, évolutions, promotions | Administration → Messages aux utilisateurs pour le super administrateur. Aperçu, nombre de destinataires, validation finale et historique. UUID de diffusion conservé en cas de réponse réseau perdue. Les promotions respectent l’accord du destinataire. Aucune diffusion réelle n’a été déclenchée pendant le développement. |
| Rappel 15/30 minutes avant | Option dans la configuration, inactive sans date. Heure locale et fuseau mémorisés. Tâche SQL active chaque minute sur la base V2, dédoublonnage, préférence sportive et comptes actifs respectés. Les invités sans compte/contact ne reçoivent pas d’alerte automatique. Push/e-mail selon leur activation dans le profil et le service existant. |
| Pseudo et ville | Affichage « Alex · Calais » pour les nouveaux ajouts de profils et les recherches d’arbitres lorsque la personne autorise la publication de sa ville. Les villes auparavant privées restent privées et les noms déjà enregistrés ne sont pas modifiés automatiquement. |
| Image personnelle sur les affiches | Visuel du sport conservé par défaut, ajout d’une photo JPG/PNG/WebP avec aperçu, redimensionnement sans déformation et retour au visuel proposé. Personnalisation conservée sur l’appareil. |
| Sponsors du club | Section dédiée visible hors du panneau facultatif. Jusqu’à 6 petits logos dans le bas des exports, à distance des QR codes. |
| Affiche spectateurs | Affiche de pronostics et QR conservée, reprise de la personnalisation image/logo/sponsors du tournoi. |
| Quatre A6 à découper | Export A4 avec quatre cartes A6 ; les quatre QR sont décodables dans le contrôle graphique. |
| Son de la roue | Fichier approuvé original, SHA-256 `f1811c9a726bb6824be215f1023c864ba2aa84fc2cc18dac838f3da6a4c992e0`. Révélation synchronisée à 2,4 s, écoute et préférence de coupure persistante. |
| Son pile ou face | Nouveau son métallique de pièce avec rebonds, distinct de la roue et du son refusé. Révélation à 2,1 s, écoute et coupure persistante. Ce nouveau son reste à apprécier par l’utilisateur. |
| Pronostic du vainqueur et autres formats | Présents. Format modifiable avant les participations ; blocage expliqué si des pronostics sont déjà déposés ou si le jeu est clôturé/démarré. Participation invitée gratuite avec nom, sans compte, maintenue. |
| Retour après enregistrement du jeu | Redirection vers la configuration du tournoi déjà présente et conservée. |
| Configuration avant participants | Contrôles des champs requis et des neuf formats déjà présents et conservés. |
| Règles de tous les sports | Bibliothèque des 57 activités conservée, ainsi que les références et les variantes. |
| Accueil explicatif facultatif et allemand | Les quatre écrans Arena, l’accès direct connexion/inscription et la traduction allemande restent en place. Nouveaux libellés FR/EN/NL/DE. |
| Vidéo | Aucune fonction de film ajoutée, conformément à la préférence exprimée. |
| Connexion Google | **Blocage de configuration** : Google est toujours désactivé dans les paramètres publics d’Auth V2. Le code OAuth est présent. L’activation et l’autorisation du callback V2 côté Google restent nécessaires ; ne pas annoncer une connexion Google opérationnelle. |

## Vérification

- TypeScript et compilation Next.js.
- Tests de parcours existants : profil, impression, suivi, événements, import, annonces, appels, synchronisation, outils et langues.
- Tests SQL locaux en migrations ordonnées et activation consolidée : droits de diffusion, consentement, isolation des boîtes, lecture, idempotence, villes privées/publiques, rappels 15/30 minutes, fuseau et absence de doublons.
- Tests d’interactions : aperçu sans envoi, validation, réponse perdue sans double diffusion, déconnexion protégée, écoute et coupure, identité du fichier de roue approuvé, son de pièce distinct.
- Rendu Canvas des exports A4, A3, social et quatre A6 : présence de la photo, six sponsors en bas, décodage des QR (dont chacun des quatre A6).
- L’outil d’aperçu local géré ne lance pas ce projet Next.js à cause d’arguments de serveur incompatibles ; contrôle visuel sur la V2 publiée pour les pages publiques. Les parcours privés sont contrôlés par les tests avec données de test, sans connexion au compte de l’utilisateur ni diffusion réelle.
