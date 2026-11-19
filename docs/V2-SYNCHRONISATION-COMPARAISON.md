# Tourneo V2 — comparaison des copies concurrentes (19 novembre 2026)

Branche : `tourneo-v2-dev`. Aucun changement de `main`, de la base V1 ou des comptes.

Lorsqu'une modification part d'un appareil avec une révision déjà dépassée, la sauvegarde distante est refusée par comparaison atomique. L'organisateur voit désormais :
- Le nombre de participants, de matchs et de résultats validés sur chacun des deux appareils.
- Les matchs divergents (score, validation, manche, ordre/terrain/journée ou présence), avec un aperçu des huit premiers.
- Le nombre de participants modifiés et les écarts de nom, sport, format et réglages.
- Des choix explicites : télécharger une copie locale, recharger la version en ligne avec export préalable, ou publier la version locale avec nouvelle vérification de révision cloud.

Le comparateur est **en lecture seule** : il ne fusionne aucune donnée et n'envoie aucun résultat au réseau. Il empêche une publication de la copie locale si les données distantes sont illisibles ou les identifiants incohérents. Il ne promet pas une comparaison exhaustive des champs auxiliaires. Les options de résolution restent manuelles ; une nouvelle modification distante avant publication est refusée par la révision atomique.

Tests automatisés : égalité, scores, validations, manches, changements d'équipes, terrain, absence de match, noms/réglages, entrée corrompue ou dupliquée, nombre d'écarts tronqué, absence de mutation des objets. Les nouveaux textes sont couverts en français, anglais, néerlandais et allemand. Tester encore le parcours complet avec **deux vrais appareils**, Auth Supabase V2 et une coupure réseau réelle avant publication générale.

La sauvegarde JSON inclut désormais l'état brouillon/lancé, les paramètres de poules, le seuil de qualification et la référence privée du podium. Les anciennes sauvegardes sans ces champs restent acceptées. L'expiration des photos continue à être imposée par le serveur, jamais par le fichier importé.
