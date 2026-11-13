"use client";
import {tr,trModele,useLangue,localeFormat} from "@/lib/langue";
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import TourneoNav from '@/components/TourneoNav';
type Notification = {
    id: string;
    tournoi_id: string | null;
    type: string;
    message: string;
    lu: boolean;
    created_at: string;
    match_id?: number;
    source: 'notification' | 'appel';
};
type Resultat = {
    tournament_id: string;
    tournament_name: string;
};
export default function Activite() {
    useLangue();
    const [notifications, setNotifications] = useState<Notification[]>([]), [resultats, setResultats] = useState<Resultat[]>([]);
    const [message, setMessage] = useState(''), [occupe, setOccupe] = useState(false), [lecture, setLecture] = useState(false), [pret, setPret] = useState(false);
    const requete = useRef(false), utilisateur = useRef('');
    const charger = useCallback(async () => {
        if (requete.current)
            return;
        requete.current = true;
        setLecture(true);
        try {
            const { data } = await supabase.auth.getUser();
            if (!data.user) {
                window.location.href = '/login';
                return;
            }
            utilisateur.current = data.user.id;
            const [n, r, c] = await Promise.all([
                supabase.from('tourneo_notifications').select('id,tournoi_id,type,message,lu,created_at').eq('user_id', data.user.id).order('created_at', { ascending: false }).limit(100),
                supabase.from('player_results').select('tournament_id,tournament_name').eq('profile_id', data.user.id).order('created_at', { ascending: false }).limit(100),
                supabase.from('tourneo_appels').select('id,tournoi_id,match_id,message,lu,created_at').eq('user_id', data.user.id).order('created_at', { ascending: false }).limit(100),
            ]);
            if (n.error || r.error || c.error)
                throw n.error || r.error || c.error;
            const activite: Notification[] = [
                ...(n.data || []).map(v => ({ ...v, source: 'notification' as const })),
                ...(c.data || []).map(v => ({ ...v, type: 'appel', source: 'appel' as const })),
            ];
            setNotifications(activite.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 100));
            setResultats(r.data || []);
            setMessage('');
            setPret(true);
        }
        catch {
            setMessage('Actualisation impossible. Vérifiez votre connexion puis réessayez.');
        }
        finally {
            requete.current = false;
            setLecture(false);
        }
    }, []);
    useEffect(() => {
        void charger();
        const visible = () => { if (document.visibilityState === 'visible')
            void charger(); };
        const timer = setInterval(visible, 10000);
        document.addEventListener('visibilitychange', visible);
        window.addEventListener('online', visible);
        return () => { clearInterval(timer); document.removeEventListener('visibilitychange', visible); window.removeEventListener('online', visible); };
    }, [charger]);
    async function marquer(notification: Notification) {
        if (requete.current || !utilisateur.current)
            return;
        requete.current = true;
        setOccupe(true);
        try {
            const r = await supabase.from(notification.source === 'appel' ? 'tourneo_appels' : 'tourneo_notifications')
                .update({ lu: true }).eq('id', notification.id).eq('user_id', utilisateur.current).select('id').maybeSingle();
            if (r.error || !r.data)
                throw r.error || new Error('Notification indisponible');
            setNotifications(a => a.map(n => n.id === notification.id && n.source === notification.source ? { ...n, lu: true } : n));
            setMessage('Notification marquée comme lue.');
        }
        catch {
            setMessage('La lecture n’a pas pu être enregistrée. Réessayez.');
        }
        finally {
            requete.current = false;
            setOccupe(false);
        }
    }
    return <main className="v2-page"><div className="v2-shell"><TourneoNav />
    <section className="v2-card"><h1>{tr("Mon activit\u00E9")}</h1><p>{tr("Appels de l\u2019organisateur, inscriptions, arbitrages et r\u00E9sultats \u00E0 valider. Les 100 messages les plus r\u00E9cents sont affich\u00E9s ; l\u2019actualisation est automatique pendant que cette page est ouverte.")}</p><button type="button" disabled={lecture || occupe} onClick={() => void charger()}>{lecture ? tr('Actualisation…') : tr('Actualiser')}</button>
      {tr(message) && <p role="status">{tr(message)}</p>}{!pret && lecture && <p role="status">{tr("Chargement de votre activit\u00E9\u2026")}</p>}{pret && !notifications.length && <p>{tr("Aucune notification pour le moment.")}</p>}
      {notifications.map(n => <article className="v2-entry" key={`${n.source}:${n.id}`}><p>{!n.lu && <strong>{tr("Nouveau \u00B7 ")}</strong>}{n.source === 'appel' && <strong>{tr("Appel organisateur \u00B7 ")}</strong>}{tr(n.message)}</p><small>{new Date(n.created_at).toLocaleString(localeFormat())}{n.lu ? tr(' · Marqué comme lu') : ''}</small><div className="v2-row">
        {n.tournoi_id && <a href={n.source === 'appel' ? `/partage/${n.tournoi_id}#match-${n.match_id}` : n.type === 'bilan' ? `/partage/${n.tournoi_id}` : n.type === 'arbitrage' ? '/arbitrage' : n.type === 'statut_inscription' ? `/inscriptions/${n.tournoi_id}` : `/tournoi/${n.tournoi_id}`}>{tr("Consulter")}{n.source === 'appel' ? tr(' le match') : ''}</a>}
        {!n.lu && <button type="button" disabled={occupe || lecture} onClick={() => void marquer(n)}>{tr("Marquer comme lu")}</button>}
      </div></article>)}
    </section>
    <section className="v2-card"><h2>{tr("Mon avis apr\u00E8s un tournoi")}</h2><p>{tr("Votre \u00E9valuation est visible par l\u2019organisateur et par vous. Une seule \u00E9valuation par personne et par tournoi.")}</p>{resultats.map(r => <p key={r.tournament_id}><a href={`/avis/${r.tournament_id}`}>{r.tournament_name}{tr(" \u00B7 Donner mon avis")}</a></p>)}{!resultats.length && <p>{tr("Vos tournois termin\u00E9s avec un profil Tourneo appara\u00EEtront ici.")}</p>}</section>
  </div></main>;
}
