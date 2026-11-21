-- Notifications dans Tourneo. Aucun envoi externe.
begin;
set local lock_timeout = '3s';

create function tourneo_private.notifier()
returns trigger language plpgsql security definer set search_path='' as $$
declare destinataire uuid; genre text; contenu text;
begin
 if TG_TABLE_NAME='tourneo_arbitres' then
 destinataire:=new.user_id; genre:='arbitrage'; contenu:='Un organisateur vous a attribué un tournoi à arbitrer.';
 elsif TG_TABLE_NAME='tourneo_scores_proposes' then
 select user_id into destinataire from public.tournois where id=new.tournoi_id;
 genre:='score'; contenu:='Un arbitre a proposé un résultat à valider.';
 elsif TG_TABLE_NAME='tourneo_inscriptions' and TG_OP='INSERT' then
 select user_id into destinataire from public.tournois where id=new.tournoi_id;
 genre:='inscription'; contenu:='Une nouvelle demande d’inscription est arrivée.';
 elsif TG_TABLE_NAME='tourneo_inscriptions' and TG_OP='UPDATE' then
 if new.statut is not distinct from old.statut then return new;end if;
 destinataire:=new.user_id; genre:='statut_inscription'; contenu:='Le statut de votre inscription a changé : '||new.statut||'.';
 end if;
 if destinataire is not null and coalesce((select notifications_sportives from public.tourneo_preferences where user_id=destinataire),true) then
 insert into public.tourneo_notifications(user_id,tournoi_id,type,message) values(destinataire,new.tournoi_id,genre,contenu);
 end if;
 return new;
end $$;
revoke all on function tourneo_private.notifier() from public,anon,authenticated;
create trigger notification_inscription after insert or update of statut on public.tourneo_inscriptions for each row execute function tourneo_private.notifier();
create trigger notification_arbitrage after insert on public.tourneo_arbitres for each row execute function tourneo_private.notifier();
create trigger notification_score after insert or update on public.tourneo_scores_proposes for each row when (new.statut='propose') execute function tourneo_private.notifier();

commit;
