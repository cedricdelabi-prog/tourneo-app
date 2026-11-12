"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import TourneoNav from '@/components/TourneoNav';
type Notification = { id: string; tournoi_id: string | null; type: string; message: string; lu: boolean; created_at: string; match_id?: number; source: 'notification' | 'appel' };
type Resultat = { tournament_id: string; tournament_name: string };
export default function Activite() {
  const [notifications, setNotifications] = useState<Notification[]>([]), [resultats, setResultats] = useState<Resultat[]>([]);
  const [message, setMessage] = useState(''), [occupe, setOccupe] = useState(false), [lecture, setLecture] = useState(false), [pret, setPret] = useState(false);
  const requete = useRef(false), utilisateur = useRef('');
  const charger = useCallback(async () => {
    if (requete.current) return;
    requete.current = true; setLecture(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { window.location.href = '/login'; return; }
      utilisateur.current = data.user.id;
      const [n, r, c] = await Promise.all([
        supabase.from('tourneo_notifications').select('id,tournoi_id,type,message,lu,created_at').eq('user_id', data.user.id).order('created_at', { ascending: false }).limit(100),
        supabase.from('player_results').select('tournament_id,tournament_name').eq('profile_id', data.user.id).order('created_at', { ascending: false }).limit(100),
        supabase.from('tourneo_appels').select('id,tournoi_id,match_id,message,lu,created_at').eq('user_id', data.user.id).order('created_at', { ascending: false }).limit(100),
      ]);
      if (n.error || r.error || c.error) throw n.error || r.error || c.error;
      const activite: Notification[] = [
        ...(n.data || []).map(v => ({ ...v, source: 'notification' as const })),
        ...(c.data || []).map(v => ({ ...v, type: 'appel', source: 'appel' as const })),
      ];
      setNotifications(activite.sort((a,b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0,100));
      setResultats(r.data || []); setMessage(''); setPret(true);
    } catch { setMessage('Actualisation impossible. Vérifiez votre connexion puis réessayez.'); }
    finally { requete.current = false; setLecture(false); }
  }, []);
  useEffect(() => {
    void charger();
    const visible = () => { if (document.visibilityState === 'visible') void charger(); };
    const timer = setInterval(visible,10000);
    document.addEventListener('visibilitychange', visible); window.addEventListener('online', visible);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', visible); window.removeEventListener('online', visible); };
  }, [charger]);
  async function marquer(notification: Notification) {
    if (requete.current || !utilisateur.current) return;
    requete.current = true; setOccupe(true);
    try {
      const r = await supabase.from(notification.source === 'appel' ? 'tourneo_appels' : 'tourneo_notifications')
        .update({ lu: true }).eq('id',notification.id).eq('user_id',utilisateur.current).select('id').maybeSingle();
      if (r.error || !r.data) throw r.error || new Error('Notification indisponible');
      setNotifications(a => a.map(n => n.id === notification.id && n.source === notification.source ? { ...n, lu: true } : n));
      setMessage('Notification marquée comme lue.');
    } catch { setMessage('La lecture n’a pas pu être enregistrée. Réessayez.'); }
    finally { requete.current = false; setOccupe(false); }
  }
  return <main className="v2-page"><div className="v2-shell"><TourneoNav/>
    <section className="v2-card"><h1>Mon activité</h1><p>Appels de l’organisateur, inscriptions, arbitrages et résultats à valider. Les 100 messages les plus récents sont affichés ; l’actualisation est automatique pendant que cette page est ouverte.</p><button type="button" disabled={lecture || occupe} onClick={() => void charger()}>{lecture ? 'Actualisation…' : 'Actualiser'}</button>
      {message && <p role="status">{message}</p>}{!pret && lecture && <p role="status">Chargement de votre activité…</p>}{pret && !notifications.length && <p>Aucune notification pour le moment.</p>}
      {notifications.map(n => <article className="v2-entry" key={`${n.source}:${n.id}`}><p>{!n.lu && <strong>Nouveau · </strong>}{n.source === 'appel' && <strong>Appel organisateur · </strong>}{n.message}</p><small>{new Date(n.created_at).toLocaleString('fr-FR')}{n.lu ? ' · Marqué comme lu' : ''}</small><div className="v2-row">
        {n.tournoi_id && <a href={n.source === 'appel' ? `/partage/${n.tournoi_id}#match-${n.match_id}` : n.type === 'arbitrage' ? '/arbitrage' : n.type === 'statut_inscription' ? `/inscriptions/${n.tournoi_id}` : `/tournoi/${n.tournoi_id}`}>Consulter{n.source === 'appel' ? ' le match' : ''}</a>}
        {!n.lu && <button type="button" disabled={occupe || lecture} onClick={() => void marquer(n)}>Marquer comme lu</button>}
      </div></article>)}
    </section>
    <section className="v2-card"><h2>Mon avis après un tournoi</h2><p>Votre évaluation est visible par l’organisateur et par vous. Une seule évaluation par personne et par tournoi.</p>{resultats.map(r => <p key={r.tournament_id}><a href={`/avis/${r.tournament_id}`}>{r.tournament_name} · Donner mon avis</a></p>)}{!resultats.length && <p>Vos tournois terminés avec un profil Tourneo apparaîtront ici.</p>}</section>
  </div></main>;
}
