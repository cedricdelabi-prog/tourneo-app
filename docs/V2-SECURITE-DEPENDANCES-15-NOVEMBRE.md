# Mise à jour des dépendances V2 — 15 novembre 2026

## Changement

- Next.js et eslint-config-next : 16.2.11 → 16.4.6, versions exactes.
- Capacitor Android, Core et CLI : 8.5.0 → 8.6.2, versions exactes.
- Mise à jour des dépendances transitives compatibles, sans `--force` : notamment sharp 0.35.5, postcss 8.5.23, source-map-js 1.2.2 et nanoid 3.3.20.
- Version source Android V2 dirigée vers le lien public canonique `https://tourneo-v2-test.vercel.app`. Le manifeste accepte ce domaine et l’ancien alias. Aucun transfert de jetons de connexion entre domaines.

## Contrôles

`npm audit --omit=dev` : zéro alerte connue après correction, contre 14 entrées initiales (dont deux critiques). Ce résultat porte sur les paquets npm et ne certifie pas toute l’application.

`npm audit fix` signale encore sept alertes modérées dans la chaîne de développement TypeScript/ESLint/minimatch. Aucun remplacement forcé de version majeure n’a été imposé.

Compilation Next.js 16.4.6 et TypeScript : réussie.
Tests moteur, neuf formats/configuration, parcours, import, synchronisation, langues, affiches et pagination par phase, pronostics, outils/audio et notifications simulées : réussis.

Aucun changement du schéma, des comptes ni des droits administrateur. Branche V2 uniquement ; V1 inchangée.

## Limites et blocages indépendants

- L’APK déjà installé n’est pas remplacé par la mise à jour des fichiers source ; il devra être reconstruit et redistribué pour bénéficier des correctifs natifs. Aucun nouvel APK fourni par cette livraison.
- L’activation OAuth Google, la protection contre les mots de passe compromis et la vérification du parcours connecté nécessitent l’accès aux paramètres Auth. Ne pas annoncer Google fonctionnel avant activation et test réel.
- Le service Contact est toujours non configuré (HTTP 500 vérifié avec un corps vide, donc aucun message envoyé). Aucun contact public privé n’a été publié par défaut.
- Mentions légales éditeur et procédures RGPD restent à finaliser : statut particulier/gratuit confirmé, coordonnées publiques non confirmées.

Sources éditeurs consultées :
- https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw
- https://github.com/ionic-team/capacitor/security/advisories/GHSA-rvm3-566m-v7fv
