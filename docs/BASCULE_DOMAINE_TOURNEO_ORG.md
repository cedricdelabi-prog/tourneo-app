# Tourneo — bascule vers www.tourneo.org

État vérifié le 22 novembre 2026. Cette fiche est un **plan de bascule**, pas une autorisation de modifier V1, les bases de données ou de publier de nouveaux liens.

## Situation confirmée

- Domaine `tourneo.org` enregistré dans l'équipe Vercel `tourneo`.
- `www.tourneo.org` associé au projet de production `tourneo-app`.
- `tourneo.org` : redirection permanente 308 vers `www.tourneo.org`.
- DNS des deux noms : `misconfigured: false` dans Vercel.
- Certificats HTTPS créés, renouvellement automatique activé.
- Dernière V2 sur `tourneo-v2-dev` : tests automatisés GitHub validés.
- **Contrôle public validé le 22/11/2026** : GitHub Actions a obtenu HTTP 200 sur `https://www.tourneo.org/`, `https://www.tourneo.org/login` et `https://tourneo-app.vercel.app/`, ainsi qu'une redirection 308 du domaine racine. Le contrôle a aussi vérifié que `/api/partage` retourne bien 404 pour un identifiant inexistant.
- L'adresse historique `https://tourneo-app.vercel.app` reste associée au site : la préserver pour les liens et QR codes déjà diffusés.
- **25/25 liens de tournois publics vérifiés en HTTPS le 22/11/2026** via `/api/partage` sur `www.tourneo.org` et `tourneo-app.vercel.app` : réponses 200. Deux pages HTML de tournois ont aussi répondu 200 sur chacun des domaines.

## Prérequis Supabase Auth (projet production UNIQUEMENT)

Projet : `gjtxlzhfqcecyfciyllc` (Tourneo).
Ne pas modifier le projet de test `kmjfmjhdnokkaiolxiin`.

Ouvrir :
https://supabase.com/dashboard/project/gjtxlzhfqcecyfciyllc/auth/url-configuration

Dans **Authentication > URL Configuration > Redirect URLs** :

1. Conserver toutes les entrées de l'ancienne adresse.
2. Ajouter `https://www.tourneo.org` et `https://www.tourneo.org/**`.
3. Ne pas supprimer les retours de connexion existants pendant la transition.
4. Conserver provisoirement le Site URL historique jusqu'au test complet des e-mails et connexions sur le nouveau domaine.
5. Pour la connexion Google via Supabase, vérifier un aller-retour complet sur la nouvelle adresse avec un compte de test. Les pages Tourneo utilisent `window.location.origin` pour le paramètre `redirectTo`.
6. Contrôler aussi la création de compte, la confirmation e-mail, le mot de passe oublié et le retour vers les pages de pronostics.

Le 22/11/2026, l'utilisateur a indiqué avoir ajouté les URL de retour dans Supabase, puis a confirmé que **la connexion Google et l'accès à ses tournois fonctionnent sur `www.tourneo.org`**. Cela valide son parcours, mais pas les e-mails de récupération, les inscriptions ni la conservation de toutes les sessions des 59 comptes. Les paramètres Auth ne sont pas lisibles directement avec les connecteurs disponibles.

Documentation officielle :
https://supabase.com/docs/guides/auth/redirect-urls

## Tests utilisateurs avant activation

- Ouvrir `https://www.tourneo.org` sans erreur DNS, de certificat ou d'accès.
- Ouvrir `https://tourneo.org` et constater la redirection vers `https://www.tourneo.org`.
- Vérifier les écrans d'accueil, de connexion, d'inscription et de récupération de mot de passe.
- Se connecter avec Google puis avec un compte existant ; vérifier ses tournois.
- Vérifier qu'un tournoi public, les inscriptions et les pronostics restent accessibles sur mobile, PC et iPhone.
- Vérifier les QR codes des affiches (annonce, inscriptions, pronostics, résultats) et la conservation de ceux créés avec l'ancien domaine.
- Revalider le parcours Android ; ne pas changer l'URL de `capacitor.config.ts` sans test/passage en production Android spécifique.
- Ne pas changer le logo officiel ni l'identité graphique Tourneo.

## Activation contrôlée des URL produites par Tourneo V2

`lib/url-publique.ts` centralise l'origine des URL et `lib/affiche-pronostics.ts` le nom de domaine imprimé.

La variable **publique** Vercel `NEXT_PUBLIC_TOURNEO_PUBLIC_ORIGIN` est désormais enregistrée pour **Production uniquement** dans Vercel et vaut :

```
https://www.tourneo.org
```

La variable ne modifie pas le déploiement existant : elle sera prise en compte uniquement lors d'un **nouveau déploiement V2 vérifié en production**, après sauvegarde, restauration isolée et accord explicite. La branche de test conserve `tourneo-v2-test.vercel.app`.

Éviter de promouvoir une prévisualisation compilée avec les variables de test. Ne pas modifier `main` ni la V1.

## Retour arrière

- En cas d'erreur de connexion / d'URL dans les nouveaux QR codes, retirer ou corriger `NEXT_PUBLIC_TOURNEO_PUBLIC_ORIGIN` pour Production et redéployer la dernière version saine.
- Conserver `tourneo-app.vercel.app` actif pendant et après la transition.
- N'effacer aucun compte, tournoi, donnée Supabase, ni ancien lien ; ne pas supprimer les redirect URLs historiques.
- Vérifier que les nouvelles affiches et QR codes pointent bien vers le domaine affiché dans l'application.

## Communication (après validation)

Mettre à jour les communications futures et les supports modifiables : page Facebook Tourneo en mode Work, présentation, affiche club, QR code, emailing futurs, signatures et description de l'application. Conserver la charte et le logo officiels. Toujours mentionner **Android disponible** et **accès web sur PC et appareils Apple**. Aucun nouveau message envoyé automatiquement aux utilisateurs dans le cadre de cette fiche.

## Compteur communautaire public (23 novembre 2026)

- Demande utilisateur : afficher une preuve sociale crédible du nombre de comptes inscrits sur Tourneo.
- Production Supabase `gjtxlzhfqcecyfciyllc` : migration autonome et additive `tourneo_v2_compteur_communautaire_public_isole` appliquée sans modifier les tables Auth, profils ou tournois.
- L'accès anonyme à `public.tourneo_communaute_publique()` a été testé dans la base de test puis en production ; réponse réelle le 23/11 : `{"minimum":50,"maximum":59,"mesure":"comptes_confirmes"}` pour **58 comptes confirmés**. L'interface n'affiche pas un faux chiffre précis, seulement la borne inférieure « 50+ ».
- Pour éviter de promouvoir les autres changements V2 en attente, déploiement de **six fichiers seulement** basé sur la production précédemment active `2e93babd584e3ad624a7e9cb5c127e754a8fb264`.
- Branche de maintenance isolée `tourneo-v2-compteur-hotfix`, SHA `f567544e19e5d440336caf95ee5e322693e18138`.
- Build de test indépendant `tourneo-v2-test` : READY, page HTTP 200.
- Build de production `dpl_CaGRsLYKRfvMe4L1gVPUk2D7LFrQ` : READY, promu sur `www.tourneo.org`, `tourneo.org` et l'ancienne URL Vercel.
- Contrôles après promotion : accueil HTTP 200, connexion HTTP 200, ancienne URL HTTP 200, identifiant de partage inexistant refusé en HTTP 404. Les fichiers JavaScript servis par `www.tourneo.org` contiennent `tourneo_communaute_publique` et le texte d'accueil « Déjà {0}+ inscrits sur Tourneo » ; l'affichage navigateur après hydratation n'a pas été testé avec un vrai navigateur.
- `main` et les fichiers V1 n'ont pas été modifiés. Les preuves de sauvegarde/restauration et les autres prérequis de publication globale V2 restent à faire : **ce hotfix ne valide pas la migration globale**.
