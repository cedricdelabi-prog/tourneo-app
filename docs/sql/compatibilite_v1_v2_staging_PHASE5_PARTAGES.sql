-- TOURNEO PHASE 5 : ANCIENS LIENS V1 + PARTAGE PUBLIC V2 SECURISE.
-- UNIQUEMENT SUR COPIE RESTAUREE V1 ET VALIDEE EN STAGING.
-- AUCUN CHANGEMENT DE LA V1 DE PRODUCTION ; ancienne API V1 maintenue pour tests.
-- Avant le déploiement public, les clients anciens doivent etre testes puis
-- l'ancienne fonction get_tourneo_public doit etre retiree apres bascule controlee.
-- Armer sur la connexion de copie restauree, jamais dans ce fichier :
-- select set_config('tourneo.v1_copy_verified','true',false);
begin;
do $$
begin
 if current_setting('tourneo.v1_copy_verified',true) is distinct from 'true'
 then raise exception 'STAGING STOP: confirmation explicite de la copie restauree requise'; end if;
 if to_regclass('public.tournois') is null
 or to_regclass('public.tourneo_preferences') is null
 or to_regclass('public.tourneo_notifications') is null
 or to_regclass('public.tourneo_inscriptions') is null
 or to_regnamespace('tourneo_private') is null
 or to_regprocedure('public.get_tourneo_public(uuid)') is null
 or not exists(select 1 from information_schema.columns where table_schema='public'
  and table_name='tournois' and column_name='est_public')
 or not exists(select 1 from information_schema.columns where table_schema='public'
  and table_name='tournois' and column_name='partage_id')
 then raise exception 'STAGING STOP: phases précédentes ou API historique manquantes'; end if;
 if (select count(*) from public.tournois)=0
 or exists(select 1 from public.tournois where partage_id is null)
 or exists(select 1 from (select partage_id from public.tournois
   group by partage_id having count(*)>1) d)
 then raise exception 'STAGING STOP: identifiants historiques de partage incomplets'; end if;
 if to_regprocedure('public.tourneo_public_v2(uuid)') is not null
 or to_regprocedure('public.tourneo_public_compat_v2(uuid)') is not null
 or to_regprocedure('tourneo_private.reference_publique(uuid,text)') is not null
 then raise exception 'STAGING STOP: phase 5 presente ou schema partiel'; end if;
end $$;

-- Projection publique anonymisee issue du SQL V2 original, filtre V1 est_public ajouté.
create or replace function tourneo_private.reference_publique(p_tournoi uuid,p_ref text)
returns text language sql immutable strict security invoker set search_path=pg_catalog as $$
 select case when left(p_ref,4)='duo:' then 'duo:'||(select string_agg('p-'||md5(p_tournoi::text||':'||x),'|' order by n) from unnest(string_to_array(substr(p_ref,5),'|')) with ordinality as refs(x,n))
 else 'p-'||md5(p_tournoi::text||':'||p_ref) end;
$$;
revoke all on function tourneo_private.reference_publique(uuid,text) from public,anon,authenticated;
-- Approuvé explicitement par l'utilisateur le 12 novembre 2026.
-- Le lien expose noms/pseudos, sport, matchs, scores et classement.
-- Aucune photo, profilId, donnée de contact ou jeton d'inscription.
create or replace function public.tourneo_public_v2(p_id uuid)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
select jsonb_build_object('id',t.id,'nom',t.nom,'sport',t.sport,'donnees',jsonb_build_object(
  'equipes',coalesce((select jsonb_agg(jsonb_build_object('id',tourneo_private.reference_publique(t.id,e->>'id'),'nom',e->'nom','emoji',e->'emoji','couleur',e->'couleur'))from jsonb_array_elements(coalesce(t.donnees->'equipes','[]'::jsonb))e),'[]'::jsonb),
  'matchs',coalesce((select jsonb_agg(jsonb_build_object('id',m->'id','journee',m->'journee','equipe1Id',tourneo_private.reference_publique(t.id,m->>'equipe1Id'),'equipe2Id',tourneo_private.reference_publique(t.id,m->>'equipe2Id'),'score1',m->'score1','score2',m->'score2','ordre',m->'ordre','branche',m->'branche','joueurs1Ids',(select coalesce(jsonb_agg(tourneo_private.reference_publique(t.id,x)),'[]'::jsonb) from jsonb_array_elements_text(coalesce(m->'joueurs1Ids','[]'::jsonb)) as refs(x)),'joueurs2Ids',(select coalesce(jsonb_agg(tourneo_private.reference_publique(t.id,x)),'[]'::jsonb) from jsonb_array_elements_text(coalesce(m->'joueurs2Ids','[]'::jsonb)) as refs(x)),'manches',coalesce((select jsonb_agg(jsonb_build_object('score1',s->'score1','score2',s->'score2')) from jsonb_array_elements(coalesce(m->'manches','[]'::jsonb)) s),'[]'::jsonb))) from jsonb_array_elements(coalesce(t.donnees->'matchs','[]'::jsonb)) m),'[]'::jsonb),'formatTournoi',t.donnees->'formatTournoi','optionsV2',(select coalesce(jsonb_object_agg(key,value),'{}'::jsonb)||jsonb_build_object('exemptions',(select coalesce(jsonb_agg(jsonb_build_object('ronde',ex->'ronde','id',tourneo_private.reference_publique(t.id,ex->>'id'))),'[]'::jsonb) from jsonb_array_elements(coalesce(t.donnees->'optionsV2'->'exemptions','[]'::jsonb)) ex)) from jsonb_each(coalesce(t.donnees->'optionsV2','{}'::jsonb)) where key=any(array['tirage','mode','score','setsGagnants','cibleManche','ecartManche','plafondManche','cibleDecisive','pointsVictoire','pointsNul','pointsDefaite','rondes','terrains','duree','repos','depart'])),
  'matchsValides',t.donnees->'matchsValides','termine',t.donnees->'termine'
))from public.tournois t where t.id=p_id and t.est_public is true;
$$;

grant execute on function public.tourneo_public_v2(uuid) to anon;

-- Compatibilité UUID et partage_id historique, filtre est_public réappliqué.
create or replace function public.tourneo_public_compat_v2(p_id uuid)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
 select public.tourneo_public_v2(t.id)
 from public.tournois t
 where (t.id=p_id or t.partage_id=p_id)
   and t.est_public is true
 limit 1;
$$;
revoke all on function public.tourneo_public_compat_v2(uuid) from public;
grant execute on function public.tourneo_public_compat_v2(uuid) to anon,authenticated;
-- Le RPC brut de la V1 reste inchangé pendant la répétition de migration.
commit;
