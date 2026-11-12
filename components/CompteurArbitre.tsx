"use client";
import {tr,trModele,useLangue} from "@/lib/langue";
import { useEffect, useState } from 'react';
export default function CompteurArbitre({ noms = ['Équipe A', 'Équipe B'], surCopie, cle = 'tourneo-compteur:v1' }: {
    noms?: [
        string,
        string
    ];
    cle?: string;
    surCopie?: (a: number, b: number) => void;
}) {
    useLangue();
    const [historique, setHistorique] = useState<[
        number,
        number
    ][]>([[0, 0]]);
    const [pret, setPret] = useState(false), [message, setMessage] = useState('');
    useEffect(() => {
        let actif = true;
        void (async () => {
            await Promise.resolve();
            if (!actif)
                return;
            setPret(false);
            try {
                const h = JSON.parse(localStorage.getItem(cle) || 'null');
                setHistorique(Array.isArray(h) && h.length > 0 && h.length <= 100 && h.every(p => Array.isArray(p) && p.length === 2 && p.every(n => Number.isInteger(n) && n >= 0 && n <= 1000000)) ? h : [[0, 0]]);
            }
            catch {
                setHistorique([[0, 0]]);
            }
            setPret(true);
        })();
        return () => { actif = false; };
    }, [cle]);
    useEffect(() => {
        if (!pret)
            return;
        let actif = true;
        void (async () => {
            await Promise.resolve();
            if (!actif)
                return;
            try {
                localStorage.setItem(cle, JSON.stringify(historique));
            }
            catch {
                setMessage('Compteur conservé dans cet onglet uniquement.');
            }
        })();
        return () => { actif = false; };
    }, [cle, historique, pret]);
    const scores = historique[historique.length - 1];
    function ajouter(cote: number, points: number) {
        if (!pret)
            return;
        setHistorique(h => {
            const actuel = h[h.length - 1];
            const suivant: [
                number,
                number
            ] = [...actuel];
            suivant[cote] = Math.min(1000000, Math.max(0, suivant[cote] + points));
            return [...h.slice(-99), suivant];
        });
    }
    return <section className="tourneo-score-counter" aria-label={tr("Compteur de points")}><div className="tourneo-counter-sides">{noms.map((nom, i) => <div key={i}><strong>{nom}</strong><output aria-label={trModele("Points de {0}", nom)} aria-live="polite">{scores[i]}</output><div>{[1, 2, 3, -1].map(v => <button type="button" key={v} onClick={() => ajouter(i, v)} disabled={!pret || (v < 0 && scores[i] === 0)} aria-label={trModele("{0}{1} pour {2}", v > 0 ? '+' : '', v, nom)}>{v > 0 ? '+' : ''}{v}</button>)}</div></div>)}</div><div className="tourneo-tool-actions"><button type="button" disabled={!pret || historique.length < 2} onClick={() => setHistorique(h => h.slice(0, -1))}>{tr("Annuler le dernier point")}</button><button type="button" disabled={!pret} onClick={() => {
            if (window.confirm('Remettre ce compteur à zéro ?'))
                setHistorique([[0, 0]]);
        }}>{tr("Remettre \u00E0 z\u00E9ro")}</button>{surCopie && <button type="button" disabled={!pret} onClick={() => surCopie(scores[0], scores[1])}>{tr("Reporter dans la proposition")}</button>}</div>{tr(message) && <p role="status">{tr(message)}</p>}<p className="tourneo-tool-note">{tr("Compteur de cette s\u00E9ance. Un r\u00E9sultat officiel doit \u00EAtre propos\u00E9 puis valid\u00E9 par l\u2019organisateur.")}</p></section>;
}
