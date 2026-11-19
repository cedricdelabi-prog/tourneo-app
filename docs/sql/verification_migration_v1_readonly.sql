-- READ ONLY: verify that the existing V1 data meets the additive V2 schema requirements.
-- Never copies user credentials or exposes personal fields.
select
 (select count(*) from auth.users) as comptes,
 (select count(*) from public.profiles) as profils,
 (select count(*) from public.tournois) as tournois,
 (select count(*) from public.tournois where partage_id is not null) as identifiants_partage,
 (select count(*) from public.tournois where est_public is true) as publics,
 (select count(*) from public.tournois t where not exists (select 1 from auth.users u where u.id=t.user_id)) as tournois_sans_compte,
 (select count(*) from public.profiles p where not exists (select 1 from auth.users u where u.id=p.id)) as profils_sans_compte,
 (select count(*) from public.tournois where char_length(trim(nom)) not between 1 and 150 or jsonb_typeof(donnees)<>'object') as tournois_incompatibles,
 (select count(*) from public.profiles where char_length(trim(display_name)) not between 1 and 100) as profils_incompatibles,
 (select count(*) from (select partage_id from public.tournois where partage_id is not null group by partage_id having count(*)>1) doublons) as doublons_partage;
