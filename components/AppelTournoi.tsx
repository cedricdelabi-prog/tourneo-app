"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
type Etat = 'sans_profil' | 'desactive' | 'disponible' | 'depose' | 'lu' | 'match_termine' | 'temporise';
type Appel = { participant_id: string; nom: string; statut: Etat; created_at?: string | null };
const LIBELLES: Record<Etat, string> = {
  sans_profil: 'À prévenir sur place · aucun profil lié',
  desactive: 'À prévenir sur place · informations sportives désactivées',
  disponible: 'Envoi possible dans son activité Tourneo',
  depose: 'Déposé dans Tourneo · non marqué comme lu',
  lu: 'Marqué comme lu dans Tourneo',
  match_termine: 'Match déjà terminé · aucun nouvel appel',
  temporise: 'Envoi temporairement limité · réessayez plus tard',
};
export default function AppelTournoi({ tournoiId, matchId }: { tournoiId: string; matchId: number }) {
  const [participants, setParticipants] = useState<Appel[]>([]);
  const [erreur, setErreur] = useState(''), [message, setMessage] = useState('');
  const [occupe, setOccupe] = useState(false), [envoi, setEnvoi] = useState(false), [pret, setPret] = useState(false);
  const requete = useRef<symbol | null>(null), generation = useRef(0);
  const charger = useCallback(async (envoyer: boolean) => {
    if (requete.current) return;
    const version = generation.current;
    const identifiant = Symbol();
    requete.current = identifiant; setOccupe(true); setEnvoi(envoyer);
    try {
      const r = await supabase.rpc('tourneo_appel_match', { p_tournoi: tournoiId, p_match: matchId, p_envoyer: envoyer });
      if (version !== generation.current) return;
      if (r.error || !r.data || !Array.isArray(r.data.participants)) throw new Error('État indisponible');
      setParticipants(r.data.participants); setPret(true); setErreur('');
      if (envoyer) setMessage('État des appels actualisé. Un dépôt dans Tourneo ne confirme pas une réception sur le téléphone.');
    } catch {
      if (version === generation.current) setErreur(envoyer ? 'Envoi non confirmé. Actualisez l’état avant de réessayer ; aucun doublon ne sera créé.' : 'État indisponible. Vérifiez la connexion puis actualisez. Aucun nouvel envoi confirmé.');
    } finally {
      if (requete.current === identifiant) requete.current = null;
      if (version === generation.current) { setOccupe(false); setEnvoi(false); }
    }
  }, [tournoiId, matchId]);
  useEffect(() => {
    generation.current++;
    void charger(false);
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void charger(false); }, 8000);
    return () => { generation.current++; requete.current = null; clearInterval(timer); };
  }, [charger]);
  const disponible = participants.some(p => p.statut === 'disponible');
  return <section className="tourneo-digital-call"><h3>Appel dans Tourneo</h3>
    <p>Ces messages apparaissent dans « Activité » du compte destinataire. Ils ne déclenchent pas de SMS, d’e-mail ou de notification téléphone quand l’application est fermée.</p>
    {!pret && !erreur && <p role="status">Vérification des destinataires…</p>}
    <ul>{participants.map(p => <li key={p.participant_id}><strong>{p.nom}</strong><span className={`tourneo-call-state is-${p.statut}`}>{LIBELLES[p.statut] || 'État non vérifié'}</span></li>)}</ul>
    {erreur && <p role="alert">{erreur}</p>}{message && <p role="status">{message}</p>}
    <div><button type="button" disabled={occupe || !pret || !disponible || Boolean(erreur)} onClick={() => void charger(true)}>{envoi ? 'Envoi…' : 'Envoyer dans Tourneo'}</button><button type="button" disabled={occupe} onClick={() => void charger(false)}>{occupe && !envoi ? 'Vérification…' : 'Actualiser l’état'}</button></div>
    <small>Un seul appel par compte et par match. Les joueurs absents de Tourneo restent à prévenir sur place.</small>
  </section>;
}
