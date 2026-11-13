"use client";
import {tr,trModele,useLangue} from "@/lib/langue";
import { useEffect, useRef, useState } from 'react';
import TourneoNav from '@/components/TourneoNav';
import CompteurTennis from '@/components/CompteurTennis';
import ReglesSport from '@/components/ReglesSport';
import CompteurArbitre from '@/components/CompteurArbitre';
import { afficherDuree, nomsPourTirage, tempsChrono, tirerEquipes, texteEquipes, type Chrono, type EquipeTiree } from '@/lib/outils-arbitre';
const CLE = 'tourneo-outils-v1';
export default function Outils() {
    useLangue();
    const [tennisSets,setTennisSets]=useState(2);
    const [outil, setOutil] = useState('chrono'), [pret, setPret] = useState(false), [message, setMessage] = useState('');
    const [chrono, setChrono] = useState<Chrono>({ ecoule: 0, depuis: null, limite: 0 }), [maintenant, setMaintenant] = useState(0), [minutes, setMinutes] = useState('10');
    const [noms, setNoms] = useState(''), [nombre, setNombre] = useState(3), [equipes, setEquipes] = useState<EquipeTiree[]>([]), [tourne, setTourne] = useState(false), [nomAnime, setNomAnime] = useState('');
    const [cotes, setCotes] = useState<[
        string,
        string
    ]>(['Équipe A', 'Équipe B']);
    const verrou = useRef(false), temporisation = useRef<ReturnType<typeof setTimeout> | null>(null), animation = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => {
        let actif = true;
        void (async () => {
            await Promise.resolve();
            if (!actif)
                return;
            try {
                const d = JSON.parse(localStorage.getItem(CLE) || 'null');
                if (d) {
                    if (Number.isFinite(d.chrono?.ecoule) && d.chrono.ecoule >= 0 && Number.isFinite(d.chrono?.limite) && d.chrono.limite >= 0 && (d.chrono.depuis === null || Number.isFinite(d.chrono.depuis)))
                        setChrono(d.chrono);
                    if (Array.isArray(d.cotes) && d.cotes.length === 2 && d.cotes.every((n: unknown) => typeof n === 'string' && n.length <= 100))
                        setCotes(d.cotes);
                    if (typeof d.noms === 'string')
                        setNoms(d.noms.slice(0, 30000));
                    if (Number.isInteger(d.nombre) && d.nombre >= 2 && d.nombre <= 32)
                        setNombre(d.nombre);
                    if (Array.isArray(d.equipes) && d.equipes.length <= 32 && d.equipes.every((e: EquipeTiree) => typeof e.nom === 'string' && Array.isArray(e.joueurs) && e.joueurs.every(j => typeof j === 'string')))
                        setEquipes(d.equipes);
                }
            }
            catch {
                setMessage('La copie précédente ne peut pas être relue.');
            }
            setMaintenant(Date.now());
            setPret(true);
        })();
        return () => {
            actif = false;
            if (temporisation.current)
                clearTimeout(temporisation.current);
            if (animation.current)
                clearInterval(animation.current);
        };
    }, []);
    useEffect(() => {
        if (!pret)
            return;
        let actif = true;
        void (async () => {
            await Promise.resolve();
            if (!actif)
                return;
            try {
                localStorage.setItem(CLE, JSON.stringify({ chrono, noms, nombre, equipes, cotes }));
            }
            catch {
                setMessage('Enregistrement sur cet appareil indisponible : copiez vos équipes avant de quitter.');
            }
        })();
        return () => { actif = false; };
    }, [pret, chrono, noms, nombre, equipes, cotes]);
    useEffect(() => {
        if (chrono.depuis === null)
            return;
        const actualiser = () => {
            const t = Date.now();
            setMaintenant(t);
            if (chrono.limite && tempsChrono(chrono, t) >= chrono.limite) {
                setChrono({ ecoule: chrono.limite, depuis: null, limite: chrono.limite });
                setMessage('Temps écoulé.');
            }
        };
        actualiser();
        const id = setInterval(actualiser, 200);
        document.addEventListener('visibilitychange', actualiser);
        return () => { clearInterval(id); document.removeEventListener('visibilitychange', actualiser); };
    }, [chrono]);
    const ecoule = tempsChrono(chrono, maintenant), affiche = chrono.limite ? Math.max(0, chrono.limite - ecoule) : ecoule;
    function tirer() {
        if (verrou.current)
            return;
        try {
            const liste = nomsPourTirage(noms), resultat = tirerEquipes(liste, nombre);
            verrou.current = true;
            setTourne(true);
            setMessage('');
            setEquipes([]);
            let i = 0;
            animation.current = setInterval(() => setNomAnime(liste[i++ % liste.length]), 85);
            temporisation.current = setTimeout(() => {
                if (animation.current)
                    clearInterval(animation.current);
                setEquipes(resultat);
                setNomAnime('Équipes prêtes');
                setTourne(false);
                verrou.current = false;
            }, 1800);
        }
        catch (e) {
            setMessage(e instanceof Error ? e.message : 'Tirage impossible.');
        }
    }
    function ouvrir(destination: string) {
        try {
            localStorage.setItem('tourneo-tirage-equipes:v1', JSON.stringify({ version: 1, date: Date.now(), equipes }));
            window.location.href = destination;
        }
        catch {
            setMessage('Transfert impossible : copiez la liste des équipes.');
        }
    }
    return <main className="v2-page"><div className="v2-shell"><TourneoNav showBack contextLabel={tr("Boîte à outils")}/><section className="v2-card"><span className="v2-eyebrow">{tr("Sur le terrain")}</span><h1>{tr("Bo\u00EEte \u00E0 outils")}</h1><p>{tr("Des outils rapides pour arbitrer ou pr\u00E9parer vos \u00E9quipes. Utilisables sans compte.")}</p><div className="tourneo-tool-tabs" role="group" aria-label={tr("Choisir un outil")}>{[['chrono', 'Chrono'], ['points', 'Points'], ['tirage', 'Tirage des équipes'], ['tennis', 'Tennis']].map(([id, label]) => <button type="button" key={id} aria-pressed={outil === id} onClick={() => setOutil(id)}>{tr(label)}</button>)}</div>{tr(message) && <p role="status">{tr(message)}</p>}</section>
    <section className="v2-card" hidden={outil !== 'chrono'}><h2>{tr("Chronom\u00E8tre")}</h2><div className="tourneo-clock" role="timer" aria-label={chrono.limite ? tr('Temps restant') : tr('Temps écoulé')}>{afficherDuree(affiche)}</div><div className="tourneo-tool-actions"><button type="button" disabled={!pret || (chrono.limite > 0 && ecoule >= chrono.limite)} onClick={() => { const t = Date.now(); setMaintenant(t); setChrono(c => c.depuis === null ? { ...c, depuis: t } : { ...c, ecoule: tempsChrono(c, t), depuis: null }); }}>{chrono.depuis === null ? tr('Démarrer / reprendre') : tr('Pause')}</button><button type="button" disabled={!pret} onClick={() => {
            if (window.confirm('Réinitialiser le chronomètre ?')) {
                setChrono(c => ({ ...c, ecoule: 0, depuis: null }));
                setMessage('');
            }
        }}>{tr("R\u00E9initialiser")}</button></div><details className="tourneo-tool-settings"><summary>{tr("Choisir une dur\u00E9e de match")}</summary><label>{tr("Dur\u00E9e en minutes")}<input type="number" min={1} max={1440} value={minutes} disabled={chrono.depuis !== null} onChange={e => setMinutes(e.target.value)}/></label><button type="button" disabled={chrono.depuis !== null} onClick={() => {
            const n = Number(minutes);
            if (!Number.isFinite(n) || n < 1 || n > 1440) {
                setMessage('Choisissez entre 1 et 1 440 minutes.');
                return;
            }
            setChrono({ ecoule: 0, depuis: null, limite: n * 60000 });
            setMessage('');
        }}>{tr("Utiliser le compte \u00E0 rebours")}</button><button type="button" disabled={chrono.depuis !== null} onClick={() => setChrono({ ecoule: 0, depuis: null, limite: 0 })}>{tr("Chronom\u00E8tre libre")}</button></details><p className="tourneo-tool-note">{tr("Le temps reprend \u00E0 l\u2019ouverture apr\u00E8s une mise en veille. Gardez l\u2019\u00E9cran visible pour suivre la fin du compte \u00E0 rebours.")}</p></section>
    <section className="v2-card" hidden={outil !== 'tennis'}><h2>{tr('Compteur tennis')}</h2><label>{tr('Sets gagnants')}<select value={tennisSets} onChange={e=>setTennisSets(Number(e.target.value))}>{[1,2,3].map(n=><option key={n} value={n}>{n}</option>)}</select></label><CompteurTennis key={tennisSets} cle={`tourneo-tennis:libre:${tennisSets}`} setsGagnants={tennisSets} noms={cotes}/><ReglesSport sport="tennis"/></section>
    <section className="v2-card" hidden={outil !== 'points'}><h2>{tr("Compter les points")}</h2><div className="tourneo-tool-fields">{cotes.map((nom, i) => <label key={i}>{tr("C\u00F4t\u00E9 ")}{i + 1}<input value={nom} maxLength={100} onChange={e => setCotes(a => i === 0 ? [e.target.value, a[1]] : [a[0], e.target.value])}/></label>)}</div><CompteurArbitre noms={cotes}/></section>
    <section className="v2-card" hidden={outil !== 'tirage'}><h2>{tr("Former les \u00E9quipes au hasard")}</h2><p>{tr("Par exemple : 21 personnes, 3 \u00E9quipes de 7. Si le nombre ne tombe pas juste, les tailles diff\u00E8rent d\u2019une personne au maximum.")}</p><div className="tourneo-tool-fields"><label>{tr("Une personne par ligne")}<textarea rows={8} maxLength={30000} value={noms} disabled={tourne} placeholder={tr('Alice\nBenoît\nCamille')} onChange={e => { setNoms(e.target.value); setEquipes([]); }}/></label><div><label>{tr("Nombre d\u2019\u00E9quipes")}<input type="number" min={2} max={32} value={nombre} disabled={tourne} onChange={e => { setNombre(Number(e.target.value)); setEquipes([]); }}/></label><div className={`tourneo-draw-wheel${tourne ? ' is-spinning' : ''}`} aria-hidden="true"><span>✦</span></div><p className="tourneo-draw-name" role="status">{tourne ? nomAnime : equipes.length ? tr('Tirage terminé') : tr('À qui le tour ?')}</p><button type="button" disabled={tourne || !pret} onClick={tirer}>{tourne ? tr('Tirage en cours…') : tr('Lancer la roulette')}</button></div></div>{!!equipes.length && <><div className="tourneo-drawn-teams">{equipes.map((e, i) => <article key={i}><input aria-label={trModele("Nom de l\u2019\u00E9quipe {0}", i + 1)} value={e.nom} maxLength={100} onChange={ev => setEquipes(a => a.map((t, j) => i === j ? { ...t, nom: ev.target.value } : t))}/><small>{e.joueurs.length}{tr(" personnes")}</small><ul>{e.joueurs.map(n => <li key={n}>{n}</li>)}</ul></article>)}</div><div className="tourneo-tool-actions"><button type="button" onClick={async () => {
                try {
                    await navigator.clipboard.writeText(texteEquipes(equipes));
                    setMessage('Équipes copiées.');
                }
                catch {
                    setMessage('Copie indisponible : utilisez l’impression.');
                }
            }}>{tr("Copier les \u00E9quipes")}</button><button type="button" onClick={() => window.print()}>{tr("Imprimer")}</button><button type="button" onClick={() => ouvrir('/tournoi/nouveau?equipes=tirage')}>{tr("Cr\u00E9er un tournoi")}</button><button type="button" onClick={() => ouvrir('/olympiades?equipes=tirage')}>{tr("Cr\u00E9er des Olympiades")}</button></div></>}</section>
    <p className="tourneo-tool-note"><a href="/guides/outils-et-olympiades">{tr("Guide des outils et des Olympiades")}</a></p>
  </div></main>;
}
