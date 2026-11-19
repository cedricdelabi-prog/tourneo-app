# Tourneo V1 — préparer une vraie sauvegarde **sans abonnement payant**

**Ce document prépare l'export, il ne prouve pas encore qu'une restauration a réussi.** La V1 continue à fonctionner ; il ne faut pas modifier sa base, ses identifiants ou ses URL de partage.

## Pourquoi

Les projets Supabase gratuits n'offrent pas le téléchargement des sauvegardes quotidiennes via le tableau de bord. Supabase recommande d'utiliser la commande CLI `db dump` et de garder une copie hors ligne (documentation : https://supabase.com/docs/guides/platform/backups ).

La migration Tourneo **conserve le même projet Supabase de production**, ses comptes et ses clés de login, au lieu de déplacer l'authentification vers la base de test V2. Il faut quand même une sauvegarde qui puisse être restaurée, puis une vraie répétition de restauration hors production.

## Export privé depuis un PC Windows

Le script prêt à l'emploi `scripts/sauvegarder-v1-prive.ps1` est **manuel et en lecture seule**. Il exige Supabase CLI, Docker Desktop et la connexion à votre compte Supabase sur votre propre ordinateur. Il ne contient ni mot de passe ni service role.

Exécuter PowerShell depuis le dossier Tourneo, sur un PC et un disque **chiffrés** :

```powershell
.\scripts\sauvegarder-v1-prive.ps1
```

Après vérification explicite de l'opérateur, le script lie uniquement le projet Tourneo V1, télécharge des exports séparés de rôles, schémas et données `public`, `auth` et `storage`, puis calcule une empreinte SHA-256 pour chaque fichier. Les exports sont enregistrés dans `%USERPROFILE%\Tourneo-sauvegardes-PRIVEES\V1-<date>`, **en dehors de GitHub**.

**Confidentialité :** un export de `auth` peut comprendre des données personnelles, sessions, jetons et empreintes de mot de passe. Ne jamais publier les fichiers, les joindre à une conversation ou les copier vers un stockage non chiffré. Si votre disque n'est pas chiffré, ne pas lancer l'export avant d'avoir un support adéquat. Les exports SQL ne sont pas chiffrés par le script.

**Limites :** cet export ne remplace pas une restauration isolée et vérifiée, ni l'inventaire des paramètres Supabase Auth, OAuth Google, secrets d'environnement, Storage réel et triggers spécifiques. Des objets Storage binaires ne sont pas sauvegardés par `db dump`; la V1 contient actuellement zéro objet Storage. La compatibilité des fonctions et de la politique RLS doit être testée avant de déployer le code V2. Ne pas considérer `controle-hash.json` comme une preuve de restauration.

La V2 de test compte déjà deux utilisateurs de test et un objet Storage ; **ne pas y restaurer la V1 par-dessus**. Aucun projet ou branche payante n'est nécessaire pour préparer les scripts, mais il faut disposer d'un environnement isolé et autorisé pour les essais de restauration.

Ne jamais lancer `supabase db reset --linked`, `supabase db push` ou les migrations V2 directement sur le projet de production à ce stade.
