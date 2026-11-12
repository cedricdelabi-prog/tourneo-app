"use client";
import {tr,trModele,useLangue} from "@/lib/langue";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import TourneoBrand from '@/components/TourneoBrand';
import TourneoRetour from '@/components/TourneoRetour';
import ClassementOlympiade from '@/components/ClassementOlympiade';
import { lireOlympiade, type Olympiade } from '@/lib/olympiades';
import { supabase } from '@/lib/supabase';
export default function PartageOlympiade() {
    useLangue();
    const { id } = useParams<{
        id: string;
    }>();
    const [d, setD] = useState<Olympiade | null>(null), [message, setMessage] = useState('Chargement des résultats…');
    useEffect(() => {
        let actif = true, enCours = false;
        async function charger() {
            if (enCours || document.hidden)
                return;
            enCours = true;
            try {
                const r = await supabase.rpc('tourneo_olympiade_publique', { p_id: id });
                if (!actif)
                    return;
                if (r.error)
                    throw r.error;
                if (!r.data) {
                    setD(null);
                    setMessage('Ce partage est fermé ou n’existe pas.');
                    return;
                }
                setD(lireOlympiade(JSON.stringify(r.data)));
                setMessage('Résultats validés · actualisation automatique');
            }
            catch {
                if (actif)
                    setMessage('Actualisation indisponible. Les derniers résultats affichés peuvent être anciens.');
            }
            finally {
                enCours = false;
            }
        }
        void charger();
        const timer = setInterval(() => void charger(), 15000);
        document.addEventListener('visibilitychange', charger);
        return () => { actif = false; clearInterval(timer); document.removeEventListener('visibilitychange', charger); };
    }, [id]);
    return <main className="v2-page"><div className="v2-shell"><header className="tourneo-public-olympic-header"><TourneoBrand compact/><TourneoRetour href="/">{tr("Tourneo")}</TourneoRetour></header><section className="v2-card"><span className="v2-eyebrow">{tr("Olympiades \u00B7 classement public")}</span><h1>{d?.nom || tr('Olympiades')}</h1><p role="status">{tr(message)}</p><button type="button" onClick={() => window.print()}>{tr("Imprimer")}</button></section>{d && <ClassementOlympiade donnees={d}/>}</div></main>;
}
