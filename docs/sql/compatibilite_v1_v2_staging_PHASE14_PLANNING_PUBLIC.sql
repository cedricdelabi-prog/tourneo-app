-- TOURNEO V2 PHASE 14 : PLANNING PUBLIC / TV ET ANCIENS LIENS.
-- UNIQUEMENT COPIE V1 RESTAUREE STAGING, APRES PHASES 1 A 13.
-- La V1 PRODUCTION et la base V2 de test ne doivent PAS recevoir ce script.
-- Armer explicitement la connexion staging restaurée, hors du fichier :
-- select set_config('tourneo.v1_copy_verified','true',false);
-- La nouvelle projection préserve les matchs, leurs terrains et horaires
-- sans exposer les contacts ni les paramètres internes de l'organisateur.
-- Tous les RPC anonymes doivent vérifier est_public = TRUE.
begin;
do $$
begin
 if current_setting('tourneo.v1_copy_verified',true) is distinct from 'true'
 then raise exception 'STAGING STOP: copie restaurée V1 non confirmée'; end if;
 if to_regclass('public.tournois') is null
 or to_regclass('public.tourneo_album_config') is null
 or to_regclass('public.tourneo_album_partages') is null
 or to_regclass('public.tourneo_olympiades') is null
 or to_regprocedure('public.tourneo_public_v2(uuid)') is null
 or to_regprocedure('public.tourneo_public_compat_v2(uuid)') is null
 or to_regprocedure('public.tourneo_album_public(uuid)') is null
 or to_regprocedure('tourneo_private.reference_publique(uuid,text)') is null
 or to_regnamespace('tourneo_private') is null
 then raise exception 'STAGING STOP: phases 1 à 13 non installées'; end if;
 if not exists(select 1 from information_schema.columns
   where table_schema='public' and table_name='tournois' and column_name='partage_id')
 or not exists(select 1 from information_schema.columns
   where table_schema='public' and table_name='tournois' and column_name='est_public')
 or (select count(*) from auth.users)=0
 or (select count(*) from public.tournois)=0
 or exists(select 1 from public.tournois where partage_id is null)
 or exists(select 1 from public.tournois group by partage_id having count(*)>1)
 or not exists(select 1 from pg_trigger where tgrelid='auth.users'::regclass
   and tgname='on_auth_user_created_tourneo' and not tgisinternal)
 then raise exception 'STAGING STOP: comptes, profils ou anciens liens V1 invalides'; end if;
 if to_regprocedure('tourneo_private.projection_planning_v2_marqueur()') is not null
 then raise exception 'STAGING STOP: phase 14 déjà installée'; end if;
end $$;

-- Marqueur privé pour empêcher toute réinstallation accidentelle.
create function tourneo_private.projection_planning_v2_marqueur()
returns boolean language sql stable set search_path='' as $$select true$$;
revoke all on function tourneo_private.projection_planning_v2_marqueur() from public,anon,authenticated;

-- Projection issue de la V2, corrigée pour refuser les tournois privés.
-- V2 : projection explicite des horaires adaptés, sans données personnelles nouvelles.
create or replace function public.tourneo_public_v2(p_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_object('id',t.id,'nom',t.nom,'sport',t.sport,'donnees',jsonb_build_object(
  'equipes',coalesce((select jsonb_agg(jsonb_build_object('id',tourneo_private.reference_publique(t.id,e->>'id'),'nom',e->'nom','emoji',e->'emoji','couleur',e->'couleur'))from jsonb_array_elements(coalesce(t.donnees->'equipes','[]'::jsonb))e),'[]'::jsonb),
  'matchs',coalesce((select jsonb_agg(jsonb_build_object('id',m->'id','journee',m->'journee','equipe1Id',tourneo_private.reference_publique(t.id,m->>'equipe1Id'),'equipe2Id',tourneo_private.reference_publique(t.id,m->>'equipe2Id'),'score1',m->'score1','score2',m->'score2','ordre',m->'ordre','terrain',m->'terrain','branche',m->'branche','joueurs1Ids',(select coalesce(jsonb_agg(tourneo_private.reference_publique(t.id,x)),'[]'::jsonb) from jsonb_array_elements_text(coalesce(m->'joueurs1Ids','[]'::jsonb)) as refs(x)),'joueurs2Ids',(select coalesce(jsonb_agg(tourneo_private.reference_publique(t.id,x)),'[]'::jsonb) from jsonb_array_elements_text(coalesce(m->'joueurs2Ids','[]'::jsonb)) as refs(x)),'manches',coalesce((select jsonb_agg(jsonb_build_object('score1',s->'score1','score2',s->'score2')) from jsonb_array_elements(coalesce(m->'manches','[]'::jsonb)) s),'[]'::jsonb))) from jsonb_array_elements(coalesce(t.donnees->'matchs','[]'::jsonb)) m),'[]'::jsonb),'formatTournoi',t.donnees->'formatTournoi','optionsV2',(select coalesce(jsonb_object_agg(key,value),'{}'::jsonb)||jsonb_build_object('adaptationPlanning',case when jsonb_typeof(t.donnees->'optionsV2'->'adaptationPlanning')='object' then jsonb_build_object(
 'debutMinimum',case when jsonb_typeof(t.donnees#>'{optionsV2,adaptationPlanning,debutMinimum}')='number' then t.donnees#>'{optionsV2,adaptationPlanning,debutMinimum}' else '0'::jsonb end,
 'terrainsFermes',(select coalesce(jsonb_agg(n),'[]'::jsonb)from jsonb_array_elements(case when jsonb_typeof(t.donnees#>'{optionsV2,adaptationPlanning,terrainsFermes}')='array' then t.donnees#>'{optionsV2,adaptationPlanning,terrainsFermes}' else '[]'::jsonb end)n where jsonb_typeof(n)='number'),
 'fixes',(select coalesce(jsonb_agg(jsonb_build_object('matchId',f->'matchId','terrain',f->'terrain','debut',f->'debut','fin',f->'fin')),'[]'::jsonb)from jsonb_array_elements(case when jsonb_typeof(t.donnees#>'{optionsV2,adaptationPlanning,fixes}')='array' then t.donnees#>'{optionsV2,adaptationPlanning,fixes}' else '[]'::jsonb end)f where jsonb_typeof(f->'matchId')='number' and jsonb_typeof(f->'terrain')='number' and jsonb_typeof(f->'debut')='number' and jsonb_typeof(f->'fin')='number')
 ) else null end,'exemptions',(select coalesce(jsonb_agg(jsonb_build_object('ronde',ex->'ronde','id',tourneo_private.reference_publique(t.id,ex->>'id'))),'[]'::jsonb) from jsonb_array_elements(coalesce(t.donnees->'optionsV2'->'exemptions','[]'::jsonb)) ex)) from jsonb_each(coalesce(t.donnees->'optionsV2','{}'::jsonb)) where key=any(array['tirage','mode','score','setsGagnants','cibleManche','ecartManche','plafondManche','cibleDecisive','pointsVictoire','pointsNul','pointsDefaite','rondes','terrains','duree','repos','depart'])),
  'matchsValides',t.donnees->'matchsValides','termine',t.donnees->'termine'
))from public.tournois t where t.id=p_id and t.est_public is true;
$$;

grant execute on function public.tourneo_public_v2(uuid) to anon;

-- Vérifier en transaction : un rôle anonyme ne peut pas lire les données
-- brutes des tournois, seules les projections explicitement publiques.
revoke all on function public.tourneo_public_v2(uuid) from public;
grant execute on function public.tourneo_public_v2(uuid) to anon,authenticated;
do $$
begin
 if not has_function_privilege('anon','public.tourneo_public_v2(uuid)','EXECUTE')
 or not has_function_privilege('anon','public.tourneo_public_compat_v2(uuid)','EXECUTE')
 or has_schema_privilege('anon','tourneo_private','USAGE')
 or not exists(select 1 from pg_proc where oid='public.tourneo_public_v2(uuid)'::regprocedure
    and prosecdef and proconfig @> ARRAY['search_path='])
 then raise exception 'STAGING STOP: droits de partage public non sûrs'; end if;
end $$;
commit;
