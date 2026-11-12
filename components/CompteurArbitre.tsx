"use client";
import { useEffect, useState } from 'react';
export default function CompteurArbitre({ noms = ['Équipe A', 'Équipe B'], surCopie, cle = 'tourneo-compteur:v1' }: {
    noms?: [
        string,
        string
    ];
    cle?: string;
    surCopie?: (a: number, b: number) => void;
}) {
    const [historique, setHistorique] = useState<[
        number,
        number
    ][]>([[0, 0]]);
    const [pret, setPret] = useState(false), [message, setMessage] = useState('');
    useEffect(() => { let actif = true; void (async () => { await Promise.resolve(); if (!actif)
        return; setPret(false); try {
        const h = JSON.parse(localStorage.getItem(cle) || 'null');
        setHistorique(Array.isArray(h) && h.length > 0 && h.length <= 100 && h.every(p => Array.isArray(p) && p.length === 2 && p.every(n => Number.isInteger(n) && n >= 0 && n <= 1000000)) ? h : [[0, 0]]);
    }
    catch {
        setHistorique([[0, 0]]);
    } setPret(true); })(); return () => { actif = false; }; }, [cle]);
    useEffect(() => { if (!pret)
        return; let actif = true; void (async () => { await Promise.resolve(); if (!actif)
        return; try {
        localStorage.setItem(cle, JSON.stringify(historique));
    }
    catch {
        setMessage('Compteur conservé dans cet onglet uniquement.');
    } })(); return () => { actif = false; }; }, [cle, historique, pret]);
    const scores = historique[historique.length - 1];
    function ajouter(cote: number, points: number) { if (!pret)
        return; setHistorique(h => { const actuel = h[h.length - 1]; const suivant: [
        number,
        number
    ] = [...actuel]; suivant[cote] = Math.min(1000000, Math.max(0, suivant[cote] + points)); return [...h.slice(-99), suivant]; }); }
    return <section className="tourneo-score-counter" aria-label="Compteur de points"><div className="tourneo-counter-sides">{noms.map((nom, i) => <div key={i}><strong>{nom}</strong><output aria-label={`Points de ${nom}`} aria-live="polite">{scores[i]}</output><div>{[1, 2, 3, -1].map(v => <button type="button" key={v} onClick={() => ajouter(i, v)} disabled={!pret || (v < 0 && scores[i] === 0)} aria-label={`${v > 0 ? '+' : ''}${v} pour ${nom}`}>{v > 0 ? '+' : ''}{v}</button>)}</div></div>)}</div><div className="tourneo-tool-actions"><button type="button" disabled={!pret || historique.length < 2} onClick={() => setHistorique(h => h.slice(0, -1))}>Annuler le dernier point</button><button type="button" disabled={!pret} onClick={() => { if (window.confirm('Remettre ce compteur à zéro ?'))
        setHistorique([[0, 0]]); }}>Remettre à zéro</button>{surCopie && <button type="button" disabled={!pret} onClick={() => surCopie(scores[0], scores[1])}>Reporter dans la proposition</button>}</div>{message && <p role="status">{message}</p>}<p className="tourneo-tool-note">Compteur de cette séance. Un résultat officiel doit être proposé puis validé par l’organisateur.</p></section>;
}
