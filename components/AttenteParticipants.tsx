"use client";
import {tr,trModele,useLangue} from "@/lib/langue";
import { useMemo, useState } from 'react';
import type { Equipe, Match } from '@/types';
import type { OptionsV2 } from '@/lib/options-v2';
import { passagesParticipants } from '@/lib/suivi-matchs';
import { heureCreneau } from '@/lib/planning';
const ETATS = { attente: 'En attente', prochain: 'Prochain passage prévu', validation: 'Résultat à valider', sans_passage: 'Sans rencontre à venir' };
export default function AttenteParticipants({ equipes, matchs, options, valides }: {
    equipes: Equipe[];
    matchs: Match[];
    options: OptionsV2;
    valides: readonly number[];
}) {
    useLangue();
    const [filtre, setFiltre] = useState('attente'), [recherche, setRecherche] = useState('');
    const lignes = useMemo(() => {
        const passages = passagesParticipants(matchs, options, valides);
        return equipes.map(e => { const suivant = passages.get(e.id)?.[0]; return { equipe: e, suivant, etat: suivant?.statut || 'sans_passage' as const }; })
            .sort((a, b) => (a.suivant?.creneau.debut ?? Infinity) - (b.suivant?.creneau.debut ?? Infinity) || a.equipe.nom.localeCompare(b.equipe.nom));
    }, [equipes, matchs, options, valides]);
    const attente = lignes.filter(l => l.etat === 'attente').length;
    const visibles = lignes.filter(l => (filtre === 'tous' || filtre === l.etat) && l.equipe.nom.toLocaleLowerCase('fr').includes(recherche.trim().toLocaleLowerCase('fr')));
    return <details className="tourneo-waiting-panel"><summary>{tr("Suivi des participants ")}<span>{attente}{tr(" en attente")}</span></summary>
    <p>{tr("Vue calcul\u00E9e \u00E0 partir du planning et des r\u00E9sultats valid\u00E9s. Elle ne confirme pas qu\u2019un match a commenc\u00E9 sur le terrain.")}</p>
    <div className="tourneo-waiting-filters"><label>{tr("Situation")}<select value={filtre} onChange={e => setFiltre(e.target.value)}><option value="tous">{tr("Tous (")}{lignes.length})</option>{Object.entries(ETATS).map(([cle, texte]) => <option key={cle} value={cle}>{tr(texte)} ({lignes.filter(l => l.etat === cle).length})</option>)}</select></label><label>{tr("Participant")}<input type="search" value={recherche} onChange={e => setRecherche(e.target.value)} placeholder={tr("Rechercher un nom")}/></label></div>
    <div className="tourneo-waiting-list">{visibles.map(l => <article key={l.equipe.id}><div><strong>{l.equipe.nom}</strong><span>{tr(ETATS[l.etat])}</span></div>{l.suivant ? <div><a href={`#organisateur-match-${l.suivant.match.id}`}>{tr("Match ")}{l.suivant.match.id}{tr(" \u00B7 terrain ")}{l.suivant.creneau.terrain}</a><small>{heureCreneau(l.suivant.creneau.debut, options.depart)}{tr(" (estim\u00E9)")}{l.suivant.avant ? trModele(" \u00B7 {0} rencontre(s) \u00E0 terminer avant ce passage", l.suivant.avant) : ''}</small></div> : <small>{tr("Aucun passage pr\u00E9vu dans les rencontres actuellement g\u00E9n\u00E9r\u00E9es.")}</small>}</article>)}</div>
    {!visibles.length && <p>{tr("Aucun participant pour cette s\u00E9lection.")}</p>}
  </details>;
}
