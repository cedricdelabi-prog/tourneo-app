-- TOURNEO V1 → V2 : inventaire agrégé EN LECTURE SEULE.
-- Exécuter uniquement sur la base V1 (gjtxlzhfqcecyfciyllc) avant la bascule.
-- Aucune identité, email, mot de passe, donnée JSON ou URL personnelle n'est retournée.
-- Vérification initiale observée le 19/11/2026 : 59 comptes, 59 profils, 60 identités Auth, 25 tournois au premier passage, 24 au deuxième passage du même jour.
-- Les compteurs sont des constats à actualiser, pas des seuils figés après de nouvelles inscriptions.
select
 (select count(*) from auth.users) as comptes,
 (select count(*) from auth.identities) as identites_auth,
 (select count(*) from public.profiles) as profils,
 (select count(*) from public.tournois) as tournois,
 (select count(*) from public.tournois where partage_id is not null) as identifiants_partage,
 (select count(*) from public.tournois where est_public is true) as tournois_publics,
 (select count(*) from storage.objects) as objets_storage,
 (select count(*) from public.tournois t left join auth.users u on u.id=t.user_id where u.id is null) as tournois_orphelins,
 (select count(*) from public.profiles p left join auth.users u on u.id=p.id where u.id is null) as profils_orphelins,
 (select count(*) from auth.users u where not exists(select 1 from public.profiles p where p.id=u.id)) as comptes_sans_profil,
 (select count(*) from public.tournois where partage_id is null) as liens_partage_manquants,
 (select count(*) from
   (select partage_id from public.tournois where partage_id is not null
    group by partage_id having count(*)>1) x) as liens_partage_dupliques,
 (select count(*) from public.tournois where jsonb_typeof(donnees) is distinct from 'object') as donnees_json_malformees,
 (select count(*) from public.tournois where donnees ? 'equipes' and jsonb_typeof(donnees->'equipes') is distinct from 'array') as equipes_json_malformees,
 (select count(*) from public.tournois where donnees ? 'matchs' and jsonb_typeof(donnees->'matchs') is distinct from 'array') as matchs_json_malformes,
 (select count(*) from public.tournois where nom is null or char_length(trim(nom)) not between 1 and 150) as noms_tournois_incompatibles,
 (select count(*) from public.profiles where display_name is null or char_length(trim(display_name)) not between 1 and 100) as noms_profils_incompatibles;
-- Tout compteur orphelin, malformé, incompatible, dupliqué ou manquant > 0 impose un STOP.
-- Le nombre d'identités Auth peut être supérieur au nombre de comptes (plusieurs fournisseurs).
-- Ce contrôle ne constitue NI une sauvegarde, NI une restauration, NI un accord de mise en production.
