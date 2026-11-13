"use client";
import {tr,trModele,useLangue} from "@/lib/langue";
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
type Etat = 'sans_profil' | 'desactive' | 'disponible' | 'depose' | 'lu' | 'match_termine' | 'temporise';
type Appel = {
    participant_id: string;
    nom: string;
    statut: Etat;
    created_at?: string | null;
    canal_push?: boolean; canal_email?: boolean; envoi_push?: string; envoi_email?: string;
};
const LIBELLES: Record<Etat, string> = {
    sans_profil: 'À prévenir sur place · aucun profil lié',
    desactive: 'À prévenir sur place · informations sportives désactivées',
    disponible: 'Envoi possible dans son activité Tourneo',
    depose: 'Déposé dans Tourneo · non marqué comme lu',
    lu: 'Marqué comme lu dans Tourneo',
    match_termine: 'Match déjà terminé · aucun nouvel appel',
    temporise: 'Envoi temporairement limité · réessayez plus tard',
};
export default function AppelTournoi({ tournoiId, matchId }: {
    tournoiId: string;
    matchId: number;
}) {
    useLangue();
    const [participants, setParticipants] = useState<Appel[]>([]);
    const [erreur, setErreur] = useState(''), [message, setMessage] = useState('');
    const [occupe, setOccupe] = useState(false), [envoi, setEnvoi] = useState(false), [pret, setPret] = useState(false);
    const requete = useRef<symbol | null>(null), generation = useRef(0);
    const charger = useCallback(async (envoyer: boolean) => {
        if (requete.current)
            return;
        const version = generation.current;
        const identifiant = Symbol();
        requete.current = identifiant;
        setOccupe(true);
        setEnvoi(envoyer);
        try {
            const r = await supabase.rpc('tourneo_appel_match', { p_tournoi: tournoiId, p_match: matchId, p_envoyer: envoyer });
            if (version !== generation.current)
                return;
            if (r.error || !r.data || !Array.isArray(r.data.participants))
                throw new Error('État indisponible');
            setParticipants(r.data.participants);
            setPret(true);
            setErreur('');
            if (envoyer)
                setMessage('État des appels actualisé. Un dépôt dans Tourneo ne confirme pas une réception sur le téléphone.');
        }
        catch {
            if (version === generation.current)
                setErreur(envoyer ? 'Envoi non confirmé. Actualisez l’état avant de réessayer ; aucun doublon ne sera créé.' : 'État indisponible. Vérifiez la connexion puis actualisez. Aucun nouvel envoi confirmé.');
        }
        finally {
            if (requete.current === identifiant)
                requete.current = null;
            if (version === generation.current) {
                setOccupe(false);
                setEnvoi(false);
            }
        }
    }, [tournoiId, matchId]);
    useEffect(() => {
        generation.current++;
        void charger(false);
        const timer = setInterval(() => { if (document.visibilityState === 'visible')
            void charger(false); }, 8000);
        return () => { generation.current++; requete.current = null; clearInterval(timer); };
    }, [charger]);
    const disponible = participants.some(p => p.statut === 'disponible');
    return <section className="tourneo-digital-call"><h3>{tr("Appel dans Tourneo")}</h3>
    <p>{tr('Les appels apparaissent dans Activité. Les alertes externes dépendent des choix et de l’appareil du destinataire. Une transmission ne confirme pas la réception.')}</p>
    {!pret && !erreur && <p role="status">{tr("V\u00E9rification des destinataires\u2026")}</p>}
    <ul>{participants.map(p => <li key={p.participant_id}><strong>{p.nom}</strong><span className={`tourneo-call-state is-${p.statut}`}>{tr(LIBELLES[p.statut]) || tr('État non vérifié')}</span>{p.statut !== 'sans_profil' && <small>{tr(p.canal_push ? 'Appareil enregistré pour les alertes' : 'Aucune alerte téléphone enregistrée')}{p.envoi_push && <span> · {tr(({attente:'Transmission en attente',traitement:'Transmission en cours',transmis:'Transmis au service d’alerte',annule:'Transmission annulée',echec:'Échec de transmission'} as Record<string,string>)[p.envoi_push] || 'État non vérifié')}</span>}{p.canal_email && <span> · {tr('E-mail sportif activé')}</span>}</small>}</li>)}</ul>
    {tr(erreur) && <p role="alert">{tr(erreur)}</p>}{tr(message) && <p role="status">{tr(message)}</p>}
    <div><button type="button" disabled={occupe || !pret || !disponible || Boolean(erreur)} onClick={() => void charger(true)}>{envoi ? tr('Envoi…') : tr('Envoyer dans Tourneo')}</button><button type="button" disabled={occupe} onClick={() => void charger(false)}>{occupe && !envoi ? tr('Vérification…') : tr('Actualiser l’état')}</button></div>
    <small>{tr("Un seul appel par compte et par match. Les joueurs absents de Tourneo restent \u00E0 pr\u00E9venir sur place.")}</small>
  </section>;
}
