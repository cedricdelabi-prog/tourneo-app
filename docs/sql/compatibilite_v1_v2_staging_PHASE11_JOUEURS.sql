-- TOURNEO V2 : PHASE 11, ESPACE PERSONNEL DE PARTICIPATION.
-- UNIQUEMENT SUR COPIE V1 RESTAURÉE DANS UN STAGING ISOLÉ.
-- Requiert les phases 1 a 10 et la confirmation manuelle sur la CONNEXION staging :
-- select set_config('tourneo.v1_copy_verified','true',false);
-- Ne pas exécuter sur la production V1 ni sur la base V2 de test déjà initialisée.
-- La fonction ne renvoie que les matchs auxquels le joueur est lié.
begin;
do $$
begin
 if current_setting('tourneo.v1_copy_verified',true) is distinct from 'true'
 then raise exception 'STAGING STOP: copie V1 restauree non confirmee'; end if;
 if to_regclass('public.tournois') is null
 or to_regclass('public.profiles') is null
 or to_regclass('public.tourneo_appels') is null
 or to_regclass('public.tourneo_modeles_affiche') is null
 or to_regclass('public.tourneo_olympiades') is null
 or to_regprocedure('public.tourneo_public_compat_v2(uuid)') is null
 or to_regprocedure('public.tourneo_profils_publics(text,uuid[])') is null
 or to_regprocedure('public.tourneo_appel_match(uuid,integer,boolean)') is null
 then raise exception 'STAGING STOP: phases 1 a 10 non installees'; end if;
 if not exists(select 1 from information_schema.columns
  where table_schema='public' and table_name='tournois' and column_name='partage_id')
 or not exists(select 1 from information_schema.columns
  where table_schema='public' and table_name='tournois' and column_name='est_public')
 or (select count(*) from auth.users)=0
 or (select count(*) from public.tournois)=0
 or exists(select 1 from public.tournois where partage_id is null)
 or not exists(select 1 from pg_trigger where tgrelid='auth.users'::regclass
  and tgname='on_auth_user_created_tourneo' and not tgisinternal)
 then raise exception 'STAGING STOP: comptes, liens ou Auth V1 manquants'; end if;
 if to_regprocedure('public.tourneo_mes_participations()') is not null
 or to_regprocedure('tourneo_private.mes_participations()') is not null
 then raise exception 'STAGING STOP: phase 11 deja installee ou incomplete'; end if;
end $$;

-- Espace joueur : projection filtrée des rencontres, sans JSON privé complet.
-- Personal player view: own fixtures only, never complete private tournament data.
create function tourneo_private.mes_participations()returns jsonb language plpgsql stable security definer set search_path='' as $$
declare t public.tournois;m jsonb;ids text[];noms jsonb;resultat jsonb:='[]';matches jsonb;begin
 if auth.uid()is null then raise exception 'Connexion requise';end if;
 for t in select * from public.tournois where donnees->>'cree'='true' loop
  select coalesce(array_agg(e->>'id'),'{}')into ids from jsonb_array_elements(case when jsonb_typeof(t.donnees->'equipes')='array'then t.donnees->'equipes'else'[]'end)e where coalesce(e->>'profilId',e->>'id')=auth.uid()::text;
  if cardinality(ids)=0 then continue;end if;
  matches:='[]';
  for m in select x from jsonb_array_elements(case when jsonb_typeof(t.donnees->'matchs')='array'then t.donnees->'matchs'else'[]'end)x loop
   if m->>'equipe1Id'=any(ids)or m->>'equipe2Id'=any(ids)or string_to_array(replace(m->>'equipe1Id','duo:',''),'|')&&ids or string_to_array(replace(m->>'equipe2Id','duo:',''),'|')&&ids or exists(select 1 from jsonb_array_elements_text(case when jsonb_typeof(m->'joueurs1Ids')='array'then m->'joueurs1Ids'else'[]'end)x where x=any(ids))or exists(select 1 from jsonb_array_elements_text(case when jsonb_typeof(m->'joueurs2Ids')='array'then m->'joueurs2Ids'else'[]'end)x where x=any(ids))then
    select jsonb_object_agg(cote,nom)into noms from(select cote,coalesce(string_agg(e->>'nom',' / '),'À déterminer')as nom from unnest(array['1','2'])cote left join lateral jsonb_array_elements(t.donnees->'equipes')e on e->>'id'=any(string_to_array(replace(m->>('equipe'||cote||'Id'),'duo:',''),'|'))group by cote)q;
    matches:=matches||jsonb_build_array(jsonb_build_object('id',m->'id','journee',m->'journee','terrain',m->'terrain','participant1',noms->>'1','participant2',noms->>'2','score1',case when coalesce(t.donnees->'matchsValides','[]')@>jsonb_build_array(m->'id')then m->'score1'else null end,'score2',case when coalesce(t.donnees->'matchsValides','[]')@>jsonb_build_array(m->'id')then m->'score2'else null end,'valide',coalesce(t.donnees->'matchsValides','[]')@>jsonb_build_array(m->'id')));
   end if;
  end loop;
  if jsonb_array_length(matches)>0 then resultat:=resultat||jsonb_build_array(jsonb_build_object('id',t.id,'nom',t.nom,'sport',t.sport,'matchs',matches));end if;
 end loop;return resultat;end$$;
create function public.tourneo_mes_participations()returns jsonb language sql stable security invoker set search_path='' as $$select tourneo_private.mes_participations()$$;
revoke all on function public.tourneo_mes_participations(),tourneo_private.mes_participations()from public,anon;
grant execute on function public.tourneo_mes_participations(),tourneo_private.mes_participations()to authenticated;
commit;
