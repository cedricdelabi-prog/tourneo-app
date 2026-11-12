"use client";
import {tr,trModele,useLangue} from "@/lib/langue";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { erreurInscriptions } from '@/lib/inscriptions';
import { nomParticipant } from '@/lib/rotation';
import type { Equipe, Match } from '@/types';
type Proposition = {
    tournoi_id: string;
    match_id: number;
    user_id: string;
    score1: number;
    score2: number;
    statut: string;
};
export default function ArbitresTournoi({ id, equipes, matchs, valides, onImporter }: {
    id: string;
    equipes: Equipe[];
    matchs: Match[];
    valides: number[];
    onImporter: (id: number, s1: string, s2: string) => void;
}) {
    useLangue();
    const [code, setCode] = useState(''), [arbitres, setArbitres] = useState<{
        user_id: string;
    }[]>([]), [propositions, setPropositions] = useState<Proposition[]>([]), [message, setMessage] = useState(''), [occupe, setOccupe] = useState(false);
    async function charger() { const [a, p] = await Promise.all([supabase.from('tourneo_arbitres').select('user_id').eq('tournoi_id', id), supabase.from('tourneo_scores_proposes').select('*').eq('tournoi_id', id).eq('statut', 'propose')]); if (a.error || p.error) {
        setMessage(erreurInscriptions((a.error || p.error)!.message));
        return;
    } setArbitres(a.data || []); setPropositions(p.data || []); setMessage(''); }
    useEffect(() => { void charger(); }, [id]);
    async function ajouter(e: React.FormEvent) { e.preventDefault(); setOccupe(true); const r = await supabase.rpc('tourneo_ajouter_arbitre', { p_tournoi: id, p_code: code.trim().toUpperCase() }); if (r.error)
        setMessage(erreurInscriptions(r.error.message));
    else {
        setCode('');
        await charger();
    } setOccupe(false); }
    async function traiter(p: Proposition, importe: boolean) { setOccupe(true); if (importe)
        onImporter(p.match_id, String(p.score1), String(p.score2)); const r = await supabase.from('tourneo_scores_proposes').update({ statut: importe ? 'importe' : 'ecarte' }).eq('tournoi_id', id).eq('match_id', p.match_id).eq('user_id', p.user_id); if (r.error)
        setMessage(erreurInscriptions(r.error.message));
    else
        await charger(); setOccupe(false); }
    async function retirer(user: string) { setOccupe(true); const r = await supabase.from('tourneo_arbitres').delete().eq('tournoi_id', id).eq('user_id', user); if (r.error)
        setMessage(erreurInscriptions(r.error.message));
    else
        await charger(); setOccupe(false); }
    return <section className="v2-planning"><h2>{tr("Arbitres et r\u00E9sultats propos\u00E9s")}</h2><p>{tr("Ajoutez un arbitre avec son code joueur. Il propose les scores depuis son compte ; vous gardez la validation des r\u00E9sultats et l\u2019avancement du tableau.")}</p><form onSubmit={ajouter}><label>{tr("Code joueur de l\u2019arbitre")}<input aria-label={tr("Code joueur arbitre")} value={code} onChange={e => setCode(e.target.value)} maxLength={50} required placeholder={tr("TRN-…")}/></label><button disabled={occupe}>{tr("Ajouter l\u2019arbitre")}</button></form>{tr(message) && <p role="status">{tr(message)}</p>}{arbitres.map((a, i) => <p key={a.user_id}>{tr("Arbitre ")}{i + 1} <button disabled={occupe} onClick={() => retirer(a.user_id)}>{tr("Retirer l\u2019acc\u00E8s")}</button></p>)}<button disabled={occupe} onClick={charger}>{tr("Actualiser les propositions")}</button>{propositions.map(p => { const m = matchs.find(m => m.id === p.match_id); if (!m)
        return null; return <p key={`${p.match_id}:${p.user_id}`}>{nomParticipant(m.equipe1Id, equipes)} {p.score1} – {p.score2} {nomParticipant(m.equipe2Id, equipes)} <button disabled={occupe || valides.includes(m.id)} onClick={() => traiter(p, true)}>{tr("Importer pour v\u00E9rifier")}</button><button disabled={occupe} onClick={() => traiter(p, false)}>{tr("\u00C9carter")}</button></p>; })}<p>{tr("Apr\u00E8s import, v\u00E9rifiez le score puis validez le match dans le calendrier.")}</p></section>;
}
