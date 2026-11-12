"use client";
import { useMemo, useState } from 'react';
import type { Equipe, Match } from '@/types';
import type { OptionsV2 } from '@/lib/options-v2';
import { passagesParticipants } from '@/lib/suivi-matchs';
import { heureCreneau } from '@/lib/planning';
const ETATS = { attente: 'En attente', prochain: 'Prochain passage prévu', validation: 'Résultat à valider', sans_passage: 'Sans rencontre à venir' };
export default function AttenteParticipants({ equipes, matchs, options, valides }: { equipes: Equipe[]; matchs: Match[]; options: OptionsV2; valides: readonly number[] }) {
  const [filtre,setFiltre] = useState('attente'), [recherche,setRecherche] = useState('');
  const lignes = useMemo(() => {
    const passages = passagesParticipants(matchs,options,valides);
    return equipes.map(e => { const suivant = passages.get(e.id)?.[0]; return { equipe:e, suivant, etat:suivant?.statut || 'sans_passage' as const }; })
      .sort((a,b) => (a.suivant?.creneau.debut ?? Infinity)-(b.suivant?.creneau.debut ?? Infinity) || a.equipe.nom.localeCompare(b.equipe.nom));
  }, [equipes,matchs,options,valides]);
  const attente = lignes.filter(l => l.etat === 'attente').length;
  const visibles = lignes.filter(l => (filtre === 'tous' || filtre === l.etat) && l.equipe.nom.toLocaleLowerCase('fr').includes(recherche.trim().toLocaleLowerCase('fr')));
  return <details className="tourneo-waiting-panel"><summary>Suivi des participants <span>{attente} en attente</span></summary>
    <p>Vue calculée à partir du planning et des résultats validés. Elle ne confirme pas qu’un match a commencé sur le terrain.</p>
    <div className="tourneo-waiting-filters"><label>Situation<select value={filtre} onChange={e => setFiltre(e.target.value)}><option value="tous">Tous ({lignes.length})</option>{Object.entries(ETATS).map(([cle,texte]) => <option key={cle} value={cle}>{texte} ({lignes.filter(l => l.etat === cle).length})</option>)}</select></label><label>Participant<input type="search" value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher un nom"/></label></div>
    <div className="tourneo-waiting-list">{visibles.map(l => <article key={l.equipe.id}><div><strong>{l.equipe.nom}</strong><span>{ETATS[l.etat]}</span></div>{l.suivant ? <div><a href={`#organisateur-match-${l.suivant.match.id}`}>Match {l.suivant.match.id} · terrain {l.suivant.creneau.terrain}</a><small>{heureCreneau(l.suivant.creneau.debut,options.depart)} (estimé){l.suivant.avant ? ` · ${l.suivant.avant} rencontre(s) à terminer avant ce passage` : ''}</small></div> : <small>Aucun passage prévu dans les rencontres actuellement générées.</small>}</article>)}</div>
    {!visibles.length && <p>Aucun participant pour cette sélection.</p>}
  </details>;
}
