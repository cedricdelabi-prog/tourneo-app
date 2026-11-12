# Compléments demandés le 12 novembre 2026

Ces demandes sont suivies à part des 85 points reconstitués. Un ajout n’augmente pas artificiellement le compteur historique.

| Demande | État du code | Accès / preuve | Vérification restante |
|---|---|---|---|
| Boîte à outils arbitre | Intégrée | `/outils`, `tests/outils-ui.cjs` | Essai terrain et téléphone |
| Chrono et compte à rebours | Intégrés | `lib/outils-arbitre.ts` | Mise en veille réelle sur iPhone/Android ; pas de son garanti en arrière-plan |
| Compteur pendant la partie | Intégré | `components/CompteurArbitre.tsx`, `/arbitrage` | Utilisation d’un match réel ; proposition distincte de la validation |
| Roulette et formation des équipes | Intégrées | `/outils`, `tests/outils.cjs` | Essai organisateur ; répartition aléatoire sans équilibrage sportif |
| Olympiades avec plusieurs activités | Intégrées | `/olympiades`, `lib/olympiades.ts`, `supabase/tests/olympiades_v2.sql` | Parcours réel entre appareils et partage public |
| Interface simplifiée | Premier passage intégré | `components/TourneoNav.tsx`, en-tête tournoi | Retour utilisateur avant simplification complémentaire |
| Guides aux endroits utiles | Intégrés | `/guides/outils-et-olympiades` | Ajuster selon les questions des testeurs |

## Principes retenus

- Des actions courantes visibles ; les réglages et opérations occasionnelles dans des panneaux repliables.
- Aucun résultat officiel envoyé par le simple compteur. L’arbitre reporte, propose, puis l’organisateur valide.
- 21 personnes et trois équipes donnent sept personnes par équipe ; les groupes non divisibles ont au plus une personne d’écart.
- Dans les Olympiades, chaque épreuve a le même poids. Le classement transforme les places en points ; les valeurs brutes de disciplines différentes ne sont pas additionnées. Les épreuves incomplètes ou rouvertes ne comptent pas au total.
- Les égalités restent des égalités. Aucune priorité arbitraire par ordre alphabétique n’est présentée comme un départage sportif.
- Sauvegarde locale puis enregistrement volontaire dans le compte. Export JSON disponible ; partage fermé par défaut.

## Pistes proposées, pas développées

- **Mexicano** : recomposer les rencontres selon les performances au fil des tours.
- **Montée-descente / King of the Court** : changer de terrain selon les résultats.
- **Défi collectif** : les équipes contribuent à un objectif commun, sans élimination.
- **Assistant “Je dispose de…”** : proposer une formule en fonction des participants, du temps et du matériel disponibles.
- **Fiches d’épreuves prêtes à adapter** : quiz, précision, relais et défis coopératifs avec consignes simples.

Les trois formats Americano, Mexicano et King of the Court sont décrits, par exemple, dans la [documentation de Playtomic](https://helpmanager.playtomic.com/hc/fr/articles/44129657203985-Nouveaux-outils-de-tournoi-King-of-the-Court-Americano-et-Mexicano). Les règles de Tourneo doivent être définies explicitement avant toute future implémentation. Le mode actuel Partenaires tournants couvre déjà le mélange des joueurs, sans être annoncé comme un règlement Americano universel.
