"use client";
import {tr,trModele,useLangue} from "@/lib/langue";
import type { Match } from '@/types';
import { resultatSerie } from '@/lib/formats-avances';
export default function SaisieManches({ match, gagnantes, disabled, onChange }: {
    match: Match;
    gagnantes: number;
    disabled: boolean;
    onChange: (manches: NonNullable<Match['manches']>) => void;
}) {
    useLangue();
    const manches = Array.from({ length: gagnantes * 2 - 1 }, (_, i) => match.manches?.[i] ?? { score1: '', score2: '' });
    const resultat = resultatSerie(manches, gagnantes);
    return <div className="v2-manches"><p>{tr("Objectif : ")}{gagnantes}{tr(" manche(s) gagnante(s) \u00B7 ")}{resultat.victoires1} – {resultat.victoires2}</p>
    {manches.map((m, i) => { const avant = resultatSerie(manches.slice(0, i), gagnantes); return <div key={i}><span>{tr("Manche ")}{i + 1}</span>{(['score1', 'score2'] as const).map((champ, j) => <input key={champ} aria-label={trModele("Manche {0}, participant {1}", i + 1, j + 1)} type="number" min={0} value={m[champ]} disabled={disabled || avant.vainqueur !== null} onChange={e => onChange(manches.map((v, k) => k === i ? { ...v, [champ]: e.target.value } : v))}/>)}{m.score1 !== '' && m.score1 === m.score2 && <small>{tr("Un vainqueur est n\u00E9cessaire.")}</small>}</div>; })}
  </div>;
}
