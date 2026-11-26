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

Le script exécute désormais automatiquement **une vérification hors ligne après les exports** : les six fichiers et leurs empreintes SHA-256 sont vérifiés, et les lignes réellement présentes dans les blocs `COPY` des tables `auth.users`, `auth.identities`, `public.profiles` et `public.tournois` sont comptées sans afficher les données. Il refuse une archive vide, tronquée, falsifiée ou incohérente entre comptes et profils. En cas de modification simultanée de la production, refaire l'export si les nombres ne correspondent plus. Ces vérifications n'établissent PAS que l'archive est restaurable.

Pour recontrôler l'archive **hors ligne** plus tard, sur le même ordinateur, exécuter :

```powershell
.\scripts\verifier-archive-v1.ps1 -Dossier "$env:USERPROFILE\Tourneo-sauvegardes-PRIVEES\V1-AAAAmmjj-HHMMSS"
```

Remplacer `V1-AAAAmmjj-HHMMSS` par le dossier réellement généré. Il ne faut jamais transmettre ce dossier ou ses fichiers. Le script ne possède aucune connexion au réseau et n'effectue aucune restauration.

Après confirmation explicite, le script crée un dossier CLI **isolé du dépôt**, contrôle que la liaison pointe bien vers la V1 autorisée puis télécharge des exports séparés de rôles, schémas et données `public`, `auth` et `storage`, puis vérifie que les instructions d'export des quatre tables essentielles (`profiles`, `tournois`, `auth.users`, `auth.identities`) sont présentes et calcule une empreinte SHA-256 pour chaque fichier. Les exports sont enregistrés dans `%USERPROFILE%\Tourneo-sauvegardes-PRIVEES\V1-<date>`, **en dehors de GitHub**.

**Confidentialité :** un export de `auth` peut comprendre des données personnelles, sessions, jetons et empreintes de mot de passe. Ne jamais publier les fichiers, les joindre à une conversation ou les copier vers un stockage non chiffré. Si votre disque n'est pas chiffré, ne pas lancer l'export avant d'avoir un support adéquat. Les exports SQL ne sont pas chiffrés par le script.

**Limites :** cet export ne remplace pas une restauration isolée et vérifiée, ni l'inventaire des paramètres Supabase Auth, OAuth Google, secrets d'environnement, Storage réel et triggers spécifiques. Des objets Storage binaires ne sont pas sauvegardés par `db dump`; l'inventaire de production du 22 novembre 2026 recense **1 objet Storage dans `tourneo-media` (48 191 octets)**, qui doit être exporté séparément, conservé de manière privée puis restauré et vérifié. L'export SQL ne contient que les métadonnées.. La compatibilité des fonctions et de la politique RLS doit être testée avant de déployer le code V2. Ne pas considérer `controle-hash.json` comme une preuve de restauration.

La V2 de test compte déjà deux utilisateurs de test et un objet Storage ; **ne pas y restaurer la V1 par-dessus**. Aucun projet ou branche payante n'est nécessaire pour préparer les scripts, mais il faut disposer d'un environnement isolé et autorisé pour les essais de restauration.

Ne jamais lancer `supabase db reset --linked`, `supabase db push` ou les migrations V2 directement sur le projet de production à ce stade.

## Sauvegarde des fichiers médias (séparée de la base)

Le **22 novembre 2026**, la production contient au moins **1 fichier Storage** dans le bucket `tourneo-media` (48 191 octets). La commande `supabase db dump` ne télécharge pas les véritables fichiers : elle exporte uniquement leurs métadonnées.

Sur le même **PC Windows chiffré**, avec Supabase CLI installé et connecté, exécuter **après la sauvegarde SQL** :

```powershell
.\scripts\sauvegarder-media-v1-prive.ps1
```

Le script refuse un projet erroné, ne supprime rien et télécharge les fichiers du bucket `tourneo-media` dans `%USERPROFILE%\Tourneo-sauvegardes-PRIVEES\Storage-V1-<date>`. Il crée un manifeste SHA-256 local. Ne pas envoyer l'archive ni son contenu dans ChatGPT ou GitHub. Après l'export, comparer le nombre de fichiers au total courant du bucket dans Supabase. Si d'autres buckets sont ajoutés avant la migration, les sauvegarder également.

**Attention :** un export SQL et cette copie de médias ne prouvent pas que la restauration fonctionne. Une restauration hors production avec vérification des comptes, tournois, Auth et médias reste obligatoire avant le déploiement global V2.

## Contrôle automatique sans accès à la V1

La CI GitHub exécute le **vrai script PowerShell** en remplaçant uniquement la commande Supabase par une simulation. Elle vérifie : six fichiers SQL générés, manifeste d'empreintes, présence de vraies lignes COPY fictives, refus des fichiers altérés, des exports Auth vides ou incomplets, refus d'un mauvais projet lié et maintien du dossier de travail et de la liaison V2. Aucune vraie donnée n'est utilisée.

Cette simulation ne prouve pas que le logiciel Supabase CLI sera correctement configuré sur le PC, ni que l'export sera restaurable. L'étape de restauration isolée reste obligatoire avant la bascule.

## Alternative IPv4 testee sur Windows (26 novembre 2026)

Sur le PC de production de la sauvegarde, le nom direct `db.gjtxlzhfqcecyfciyllc.supabase.co` ne permettait pas de joindre PostgreSQL depuis Docker (IPv6). Les exports manuels ont reussi via le pooler IPv4 `aws-0-eu-west-1.pooler.supabase.com:5432`, utilisateur `postgres.gjtxlzhfqcecyfciyllc`. Le script historique `sauvegarder-v1-prive.ps1` continue d'utiliser `--linked` et peut donc echouer sur ce reseau. Ne pas reutiliser cette ancienne procedure pour cette configuration sans correction.

Une nouvelle procedure distincte est disponible dans `scripts/sauvegarder-v1-ipv4-prive.ps1` : elle utilise Docker avec `pg_dump` et `pg_dumpall` par le pooler IPv4, demande le mot de passe PostgreSQL de maniere masquee, le retire de l'environnement a la fin et inscrit 7 fichiers SQL et leurs empreintes SHA-256 dans un nouveau dossier local chiffre, jamais sur GitHub.

Cette procedure est **facultative** pour une sauvegarde future : l'utilisateur a deja constitue le 26/11/2026 une archive manuelle comportant 7 fichiers SQL et un PNG dans `Tourneo-sauvegardes-PRIVEES/V1-IPv4-20261126-133739`. Il ne faut pas ecraser cette archive. Le test local avec un PostgreSQL generique a echoue sur le role Supabase `supabase_admin` manquant ; **cela ne demontre pas une restauration reussie**. Les fichiers doivent rester prives.

La validation statique CI du nouveau script n'est ni un essai de restauration ni un export reel. Toute migration en production reste interdite tant qu'une copie conforme (Supabase Auth, stockage binaire, donnees et roles) n'a pas ete restauree et que la migration V2 complete n'a pas ete essayee sur cette copie.

## Audit hors ligne de l'archive IPv4 existante

Le script `scripts/auditer-archive-ipv4-v1.cjs` analyse **en lecture seule** une archive SQL et PNG deja constituee. Il n'accede a aucune base et n'envoie rien sur Internet : seuls les **comptages globaux** sont affiches. Ce programme est teste dans la CI avec des fichiers totalement fictifs.

Avec Node.js installe, il peut etre execute localement depuis le depot avec :

```powershell
node scripts/auditer-archive-ipv4-v1.cjs "$env:USERPROFILE\Tourneo-sauvegardes-PRIVEES\V1-IPv4-20261126-133739"
```

Le chemin correspond a l'archive privee preparee le 26 novembre 2026. Le script verifie l'existence des **sept** exports SQL, leurs tailles et SHA-256 calcules localement, les blocs `COPY` essentiels, les comptes/profils/identites/tournois et la presence d'une signature PNG valide quand des objets Storage sont recenses. Il refuse les lignes vides et les blocs `COPY` imbriques. Il ne modifie pas l'archive et ne publie ni lignes SQL, ni images, ni mots de passe.

**Limites importantes :** l'outil recalcule les SHA-256 mais ne peut pas certifier leur concordance avec une empreinte anterieure si aucun manifeste de reference n'a ete cree lors de l'export ; il ne controle pas l'integralite de chaque enregistrement SQL et n'execute aucune restauration. Il ne valide pas non plus l'authentification Google, les sessions, les donnees binaires au-dela de la signature PNG, ou les permissions/RLS.

Un resultat `STRUCTURE COHERENTE` est **une verification preliminaire**, pas un feu vert pour lancer la migration. **Ne jamais transmettre le dossier prive au depot ou a une conversation.**
