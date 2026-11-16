"use client";
import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { preparerEdition, type ModeleEdition } from '@/lib/prochaine-edition';
import { tr, useLangue } from '@/lib/langue';

export default function ProchaineEdition({ nom, source }: { nom: string; source: ModeleEdition }) {
  useLangue();
  const [nomCopie, setNomCopie] = useState('');
  const [participants, setParticipants] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState('');
  const verrou = useRef(false);
  // Keep the id after a failed request: retrying cannot create another draft.
  const id = useRef('');
  async function creer() {
    if (verrou.current) return;
    verrou.current = true;
    setOccupe(true);
    setErreur('');
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw new Error('session');
      id.current ||= crypto.randomUUID();
      const donnees = preparerEdition(source, participants, () => crypto.randomUUID());
      const r = await supabase.from('tournois').insert({
        id: id.current, nom: (nomCopie.trim() || nom).slice(0, 150),
        sport: source.sport, user_id: data.user.id, donnees,
      });
      if (r.error) {
        // An interrupted response may hide a successful insert. Read only our id.
        const existant = await supabase.from('tournois').select('id').eq('id', id.current).eq('user_id', data.user.id).maybeSingle();
        if (existant.error || !existant.data) throw r.error;
      }
      window.location.assign(`/tournoi/${id.current}`);
    } catch {
      setErreur('Création non confirmée. Vérifiez votre connexion puis réessayez.');
      verrou.current = false;
      setOccupe(false);
    }
  }
  return <details className="tourneo-next-edition">
    <summary>{tr('Créer la prochaine édition')}</summary>
    <p>{tr('Reprenez le sport, la formule, les terrains et les règles. La nouvelle date sera à choisir.')}</p>
    <label>{tr('Nom de la prochaine édition')}<input maxLength={150} value={nomCopie} placeholder={nom} disabled={occupe} onChange={e => setNomCopie(e.target.value)} /></label>
    <label className="v2-check"><input type="checkbox" checked={participants} disabled={occupe} onChange={e => setParticipants(e.target.checked)} />{tr('Reprendre aussi les participants')}</label>
    <p>{tr('Un nouveau brouillon privé sera créé. Les scores, photos, inscriptions et liens partagés restent dans le tournoi précédent.')}</p>
    {erreur && <p role="alert">{tr(erreur)}</p>}
    <button type="button" disabled={occupe} onClick={() => void creer()}>{tr(occupe ? 'Création du brouillon…' : 'Préparer cette édition')}</button>
    <style>{`.tourneo-next-edition{flex-basis:100%;min-width:0;padding:12px;border:1px solid #475569;border-radius:12px}.tourneo-next-edition summary{cursor:pointer;font-weight:700}.tourneo-next-edition p{max-width:65ch;font-size:14px}.tourneo-next-edition label{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.tourneo-next-edition input:not([type=checkbox]){width:100%;max-width:420px;min-width:0;padding:10px;border:1px solid #64748b;border-radius:8px;background:#0f172a;color:#fff}`}</style>
  </details>;
}
