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

-- Organizer's private album reuses the existing private bucket and retention worker.
create table public.tourneo_album_photos(id uuid primary key default gen_random_uuid(),tournoi_id uuid not null references public.tournois(id)on delete cascade,user_id uuid not null references auth.users(id)on delete cascade,path text not null unique,legende text not null default ''check(char_length(legende)<=200),created_at timestamptz not null default now(),check(path=user_id::text||'/tournois/'||tournoi_id::text||'/album-'||id::text||'.jpg'));
create index album_owner on public.tourneo_album_photos(user_id,tournoi_id);
alter table public.tourneo_album_photos enable row level security;
revoke all on public.tourneo_album_photos from public,anon,authenticated;
grant select,insert,delete on public.tourneo_album_photos to authenticated;
create policy album_lecture on public.tourneo_album_photos for select to authenticated using(user_id=(select auth.uid())and exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=(select auth.uid())and(t.photos_expirent_at is null or t.photos_expirent_at>now())));
create policy album_ajout on public.tourneo_album_photos for insert to authenticated with check(user_id=(select auth.uid())and exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=(select auth.uid())and(t.photos_expirent_at is null or t.photos_expirent_at>now())));
create policy album_retrait on public.tourneo_album_photos for delete to authenticated using(user_id=(select auth.uid()));
create function tourneo_private.quota_album()returns trigger language plpgsql security invoker set search_path='' as $$begin
 perform pg_advisory_xact_lock(hashtext(new.tournoi_id::text));
 if(select count(*)from public.tourneo_album_photos where tournoi_id=new.tournoi_id)>=200 then raise exception 'Deux cents photos maximum par tournoi';end if;
 if not exists(select 1 from storage.objects where bucket_id='tourneo-media'and name=new.path)then raise exception 'Photo non transférée';end if;return new;end$$;
create trigger quota_album before insert on public.tourneo_album_photos for each row execute function tourneo_private.quota_album();
