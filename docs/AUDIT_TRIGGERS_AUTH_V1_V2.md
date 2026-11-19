# Audit des déclencheurs d'authentification — V1 vers V2

## Constats vérifiés sur les deux projets Supabase (19 novembre 2026)

- **V1** : le trigger `auth.users.on_auth_user_created_tourneo` exécute `public.handle_new_tourneo_user()`. Il crée automatiquement un profil et un code joueur `TRN-XXXX-XXXX`, avec `ON CONFLICT (id) DO NOTHING`.
- **V2 de test** : le trigger `auth.users.compte_usage_initial` exécute `tourneo_private.compte_usage_initial()`. Il crée uniquement une entrée de structure dans `public.tourneo_compte_usage` quand une structure est fournie ; il **ne crée pas de profil**.
- **V2 de test** : trois triggers supplémentaires sur `public.tournois` gèrent la révision, la conservation des photos et la fermeture des pronostics.
- **Conclusion** : l'activation V2 sur la base V1 doit **conserver le trigger V1 de création de profil**, puis ajouter les fonctions/triggers V2 nécessaires sans le remplacer. Le schéma seul ne suffit pas.

## Garde-fous de migration

1. Ne pas supprimer `on_auth_user_created_tourneo`, ni `handle_new_tourneo_user()`.
2. Ne pas recréer les 59 comptes : préserver les identifiants `auth.users.id`, mots de passe et sessions dans la base V1 existante.
3. Vérifier que le trigger V2 `compte_usage_initial` peut coexister avec celui de V1 et que les tables de destination existent avant de l'activer.
4. Vérifier les politiques RLS de `profiles` et `tournois` : la V1 autorise des lectures publiques plus larges ; une migration sécurisée doit préserver les parcours nécessaires sans exposer de données personnelles.
5. Sur une copie restaurée, tester l'inscription d'un nouvel utilisateur, la création du profil, la connexion d'un ancien utilisateur, la création et l'édition d'un tournoi, puis l'affichage de son lien de partage.
6. Ne pas exécuter les 34 migrations V2 telles quelles sur V1 : elles supposent une base vierge et redéfinissent les tables et leurs droits.

## Requête de contrôle non destructive

```sql
select n.nspname as schema_name,c.relname as table_name,t.tgname as trigger_name,
       pg_get_triggerdef(t.oid) as definition
from pg_trigger t
join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace
where not t.tgisinternal
  and ((n.nspname='auth' and c.relname='users')
    or (n.nspname='public' and c.relname in ('profiles','tournois')))
order by 1,2,3;
```

**Statut :** audit effectué, coexistence à valider en environnement isolé. Aucune modification du schéma de production.
