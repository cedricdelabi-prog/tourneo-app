-- TOURNEO : CONTROLE D'UNE SAUVEGARDE RESTAUREE, EN LECTURE SEULE.
-- Ne retourne que des nombres et diagnostics, jamais d'identifiants personnels.
-- Executer sur la V1 ET sur une copie RESTAUREE distincte pour comparer.
with c as(select count(*)::bigint n from auth.users),
i as(select count(*)::bigint n from auth.identities),
p as(select count(*)::bigint n from public.profiles),
t as(select count(*)::bigint n from public.tournois),
s as(select count(*)::bigint n from storage.objects),
anomalies as (
 select
 (select count(*) from auth.users u where not exists(select 1 from public.profiles pr where pr.id=u.id))::bigint as comptes_sans_profil,
 (select count(*) from public.profiles pr where not exists(select 1 from auth.users u where u.id=pr.id))::bigint as profils_orphelins,
 (select count(*) from public.tournois x where not exists(select 1 from auth.users u where u.id=x.user_id))::bigint as tournois_orphelins,
 (select count(*) from public.tournois where partage_id is null)::bigint as partage_manquant,
 (select count(*) from (select partage_id from public.tournois where partage_id is not null group by partage_id having count(*)>1)x)::bigint as partage_duplique,
 (select count(*) from public.tournois where donnees is null or jsonb_typeof(donnees)<>'object'
 or (donnees?'equipes' and jsonb_typeof(donnees->'equipes')<>'array')
 or (donnees?'matchs' and jsonb_typeof(donnees->'matchs')<>'array'))::bigint as json_incompatible
)
select c.n as comptes,i.n as identites_auth,p.n as profils,t.n as tournois,s.n as objets_storage,
anomalies.*,
(select count(*) from pg_trigger where tgrelid='auth.users'::regclass and not tgisinternal and tgenabled<>'D')::int as triggers_auth_actifs,
to_regprocedure('public.get_tourneo_public(uuid)') is not null as ancienne_rpc_presente,
case when c.n>0 and i.n>=c.n and p.n=c.n and t.n>0
and anomalies.comptes_sans_profil=0 and anomalies.profils_orphelins=0
and anomalies.tournois_orphelins=0 and anomalies.partage_manquant=0
and anomalies.partage_duplique=0 and anomalies.json_incompatible=0
and exists(select 1 from pg_trigger where tgrelid='auth.users'::regclass and not tgisinternal and tgenabled<>'D')
and to_regprocedure('public.get_tourneo_public(uuid)') is not null
then 'COHERENT_A_COMPARER_A_L_ARCHIVE' else 'STOP_INTEGRITE' end as diagnostic
from c,i,p,t,s,anomalies;
-- COHERENT ne prouve PAS qu'une archive est restaurable ou que les connexions
-- Auth fonctionnent. Comparer TOUS les compteurs à une archive privée datée.
