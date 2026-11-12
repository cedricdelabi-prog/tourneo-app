-- V2 only. In-app calls do not imply push delivery or that a phone received anything.
create table public.tourneo_appels (
 id uuid primary key default gen_random_uuid(),
 tournoi_id uuid not null references public.tournois(id) on delete cascade,
 match_id integer not null check(match_id > 0),
 user_id uuid not null references auth.users(id) on delete cascade,
 organisateur_id uuid not null references auth.users(id) on delete cascade,
 message text not null check(char_length(message) <= 500),
 lu boolean not null default false,
 created_at timestamptz not null default now(),
 unique(tournoi_id,match_id,user_id)
);
create index tournoi_appels_user_date on public.tourneo_appels(user_id,created_at desc);
create index tournoi_appels_organisateur_date on public.tourneo_appels(organisateur_id,created_at desc);
alter table public.tourneo_appels enable row level security;
revoke all on public.tourneo_appels from public,anon,authenticated;
grant select on public.tourneo_appels to authenticated;
grant update(lu) on public.tourneo_appels to authenticated;
create policy appels_read on public.tourneo_appels for select to authenticated using(
 user_id=(select auth.uid()) or exists(select 1 from public.tournois t where t.id=tournoi_id and t.user_id=(select auth.uid()))
);
create policy appels_mark_read on public.tourneo_appels for update to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

-- Needs definer privileges to read private opt-outs and insert recipient-owned rows.
-- Always authenticates the organizer, verifies ownership and derives recipients from the match.
create function tourneo_private.appel_match(p_tournoi uuid,p_match integer,p_envoyer boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.tournois; m jsonb; e jsonb; j text; cote text; ids text[]:='{}';
 destinataire uuid; appel public.tourneo_appels; etat text; permis boolean; termine boolean;
 resultat jsonb:='[]'::jsonb; deja boolean; total integer;
begin
 if auth.uid() is null then raise exception 'Accès organisateur requis';end if;
 if p_envoyer then select * into t from public.tournois where id=p_tournoi for update;
 else select * into t from public.tournois where id=p_tournoi;end if;
 if t.id is null or t.user_id is distinct from auth.uid() then raise exception 'Accès organisateur requis';end if;
 select x into m from jsonb_array_elements(coalesce(t.donnees->'matchs','[]'::jsonb)) x where x->>'id'=p_match::text limit 1;
 if p_match is null or p_match<1 or m is null then raise exception 'Rencontre introuvable';end if;
 termine:=coalesce(t.donnees->'matchsValides','[]'::jsonb) @> jsonb_build_array(p_match)
   or (coalesce(m->>'score1','') ~ '^[0-9]+$' and coalesce(m->>'score2','') ~ '^[0-9]+$');
 foreach cote in array array['1','2'] loop
   if jsonb_typeof(m->('joueurs'||cote||'Ids'))='array' and jsonb_array_length(m->('joueurs'||cote||'Ids'))>0 then
     ids:=ids||array(select jsonb_array_elements_text(m->('joueurs'||cote||'Ids')));
   elsif left(m->>('equipe'||cote||'Id'),4)='duo:' then
     ids:=ids||string_to_array(substr(m->>('equipe'||cote||'Id'),5),'|');
   else ids:=array_append(ids,m->>('equipe'||cote||'Id'));end if;
 end loop;
 select count(*) into total from public.tourneo_appels where organisateur_id=auth.uid() and created_at>now()-interval '5 minutes';
 for j in select distinct x from unnest(ids) x where x is not null loop
   select x into e from jsonb_array_elements(coalesce(t.donnees->'equipes','[]'::jsonb)) x where x->>'id'=j limit 1;
   select p.id into destinataire from public.profiles p where p.id::text=coalesce(e->>'profilId',e->>'id');
   permis:=coalesce((select notifications_sportives from public.tourneo_preferences where user_id=destinataire),true);
   select * into appel from public.tourneo_appels where tournoi_id=p_tournoi and match_id=p_match and user_id=destinataire;
   if destinataire is null then etat:='sans_profil';
   elsif appel.id is not null then etat:=case when appel.lu then 'lu' else 'depose' end;
   elsif not permis then etat:='desactive';
   elsif termine then etat:='match_termine';
   elsif total>=300 then etat:='temporise';
   else
     etat:='disponible';
     if p_envoyer then
       insert into public.tourneo_appels(tournoi_id,match_id,user_id,organisateur_id,message)
       values(p_tournoi,p_match,destinataire,t.user_id,'L’organisateur vous appelle pour le match '||p_match::text||' du tournoi « '||left(t.nom,120)||' ». Consultez la rencontre pour votre terrain et prévenez l’organisateur de votre présence.')
       on conflict(tournoi_id,match_id,user_id) do nothing;
       select * into appel from public.tourneo_appels where tournoi_id=p_tournoi and match_id=p_match and user_id=destinataire;
       etat:=case when appel.lu then 'lu' else 'depose' end;
       total:=total+1;
     end if;
   end if;
   resultat:=resultat||jsonb_build_array(jsonb_build_object('participant_id',j,'nom',coalesce(e->>'nom','Participant'),'statut',etat,'created_at',appel.created_at));
 end loop;
 return jsonb_build_object('match_id',p_match,'participants',resultat);
end $$;
revoke all on function tourneo_private.appel_match(uuid,integer,boolean) from public,anon;
grant execute on function tourneo_private.appel_match(uuid,integer,boolean) to authenticated;
create function public.tourneo_appel_match(p_tournoi uuid,p_match integer,p_envoyer boolean default false)
returns jsonb language sql security invoker set search_path='' as $$
 select tourneo_private.appel_match(p_tournoi,p_match,p_envoyer);
$$;
revoke all on function public.tourneo_appel_match(uuid,integer,boolean) from public,anon;
grant execute on function public.tourneo_appel_match(uuid,integer,boolean) to authenticated;
