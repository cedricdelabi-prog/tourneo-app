"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import TourneoNav from '@/components/TourneoNav';
import ClassementOlympiade from '@/components/ClassementOlympiade';
import { avecDelai } from '@/lib/delai';
import { supabase } from '@/lib/supabase';
import { classementEpreuve, exporterOlympiade, lireOlympiade, type Olympiade, type EpreuveOlympiade } from '@/lib/olympiades';
import { nomsPourTirage, type EquipeTiree } from '@/lib/outils-arbitre';
const CLE = 'tourneo-olympiade-locale:v1';
const vide = (): Olympiade => ({ version: 1, nom: 'Mes Olympiades', equipes: [], epreuves: [] });
export default function Olympiades() {
    const [d, setD] = useState<Olympiade>(vide), [pret, setPret] = useState(false), [message, setMessage] = useState(''), [occupe, setOccupe] = useState(false), [id, setId] = useState(''), [revision, setRevision] = useState<number | null>(null), [partage, setPartage] = useState(false);
    const [equipe, setEquipe] = useState(''), [epreuve, setEpreuve] = useState(''), [sens, setSens] = useState<'plus' | 'moins'>('plus'), [unite, setUnite] = useState('points'), [liste, setListe] = useState<{
        id: string;
        nom: string;
    }[]>([]), [conflit, setConflit] = useState(false), [sauve, setSauve] = useState('');
    const verrou = useRef(false), versionLocale = useRef('');
    const signature = useMemo(() => JSON.stringify(d), [d]);
    useEffect(() => { versionLocale.current = signature; }, [signature]);
    useEffect(() => {
        let actif = true;
        void (async () => {
            let identifiant = '';
            try {
                const q = new URLSearchParams(window.location.search);
                identifiant = q.get('id') || '';
                if (identifiant && !/^[0-9a-f-]{36}$/i.test(identifiant))
                    throw new Error('Identifiant invalide.');
                const brut = localStorage.getItem(identifiant ? `${CLE}:${identifiant}` : CLE);
                let local: null | {
                    donnees: Olympiade;
                    revision: number | null;
                    partage: boolean;
                    signature: string;
                } = null;
                if (brut) {
                    const v = JSON.parse(brut);
                    local = { ...v, donnees: lireOlympiade(JSON.stringify(v.donnees)) };
                    if (actif && local) {
                        setD(local.donnees);
                        setRevision(local.revision);
                        setPartage(local.partage);
                        setSauve(local.signature || '');
                    }
                }
                if (q.get('equipes') === 'tirage' && !identifiant) {
                    const tirage = JSON.parse(localStorage.getItem('tourneo-tirage-equipes:v1') || 'null');
                    if (tirage?.version !== 1 || !Number.isFinite(tirage.date) || Date.now() - tirage.date > 86400000 || !Array.isArray(tirage.equipes) || tirage.equipes.length < 2 || tirage.equipes.length > 32)
                        throw new Error('Tirage absent ou expiré.');
                    const noms = nomsPourTirage(tirage.equipes.map((e: EquipeTiree) => e.nom).join('\n'));
                    const equipes = tirage.equipes.map((e: EquipeTiree, i: number) => ({ id: crypto.randomUUID(), nom: noms[i], joueurs: e.joueurs }));
                    const copie = lireOlympiade(JSON.stringify({ ...vide(), equipes }));
                    if (actif) {
                        if (brut)
                            localStorage.setItem(`${CLE}:precedent`, brut);
                        setD(copie);
                        setSauve('');
                        setMessage('Équipes du tirage ajoutées. Créez vos épreuves. Le brouillon précédent reste récupérable dans les options.');
                    }
                }
                if (identifiant && actif)
                    setId(identifiant);
                if (navigator.onLine === false) { setMessage('Hors connexion · copie conservée sur cet appareil. Exportez une sauvegarde avant de quitter.'); return; }
                if (!identifiant && actif) setPret(true);
                const auth = await avecDelai(supabase.auth.getUser(),2500);
                if (!auth) { if(actif)setMessage('Connexion au compte trop lente · travail possible sur cet appareil.'); return; }
                if (!actif)
                    return;
                if (auth.data.user) {
                    void Promise.resolve(supabase.from('tourneo_olympiades').select('id,nom').eq('user_id', auth.data.user.id).order('created_at', { ascending: false })).then(ls=>{if(actif&&!ls.error)setListe(ls.data||[]);}).catch(()=>{});
                    if (identifiant) {
                        const r = await avecDelai(supabase.from('tourneo_olympiades').select('donnees,revision,partage').eq('id', identifiant).eq('user_id', auth.data.user.id).maybeSingle(),4000);
                        if (!r) throw new Error('Chargement en ligne trop lent. Votre copie locale reste disponible.');
                        if (r.error || !r.data)
                            throw new Error('Olympiade inaccessible. La copie locale reste conservée.');
                        if (!actif)
                            return;
                        if (local && JSON.stringify(local.donnees) !== local.signature) {
                            if (local.revision !== r.data.revision) {
                                setConflit(true);
                                setMessage('Une autre version existe en ligne. Exportez votre copie locale avant de recharger.');
                            }
                        }
                        else {
                            const donnees = lireOlympiade(JSON.stringify(r.data.donnees));
                            setD(donnees);
                            setSauve(JSON.stringify(donnees));
                            setRevision(r.data.revision);
                            setPartage(r.data.partage);
                        }
                    }
                }
                else if (identifiant && actif)
                    setMessage('Copie locale ouverte. Connectez-vous pour retrouver la version enregistrée dans votre compte.');
            }
            catch (e) {
                if (actif)
                    setMessage(e instanceof Error ? e.message : 'Chargement impossible.');
            }
            finally {
                if (actif)
                    setPret(true);
            }
        })();
        return () => { actif = false; };
    }, []);
    useEffect(() => { if (!pret)
        return; let actif = true; void (async () => { await Promise.resolve(); if (!actif)
        return; try {
        localStorage.setItem(id ? `${CLE}:${id}` : CLE, JSON.stringify({ donnees: d, revision, partage, signature: sauve }));
    }
    catch {
        setMessage('Mémoire locale indisponible : exportez votre sauvegarde avant de quitter.');
    } })(); return () => { actif = false; }; }, [pret, d, id, revision, partage, sauve]);
    async function enregistrer(activerPartage = partage) {
        if (verrou.current || !pret || conflit)
            return;
        if(navigator.onLine===false){setMessage('Hors connexion · exportez votre sauvegarde ou enregistrez dans votre compte après le retour du réseau.');return;}
        verrou.current = true;
        setOccupe(true);
        const capture = signature;
        try {
            const copie = lireOlympiade(capture);
            const auth = await supabase.auth.getUser();
            if (!auth.data.user) {
                setMessage('Votre travail reste sur cet appareil. Connectez-vous, puis revenez ici pour l’enregistrer dans votre compte.');
                return;
            }
            const requete = supabase.from('tourneo_olympiades');
            const payload = { nom: copie.nom, donnees: copie, partage: activerPartage };
            const r = id ? await requete.update(payload).eq('id', id).eq('user_id', auth.data.user.id).eq('revision', revision ?? -1).select('id,revision').maybeSingle() : await requete.insert({ ...payload, user_id: auth.data.user.id }).select('id,revision').single();
            if (r.error)
                throw r.error;
            if (!r.data) {
                setConflit(true);
                setMessage('Une autre version a été enregistrée. Exportez votre copie avant de recharger.');
                return;
            }
            const version = r.data;
            setId(version.id);
            setRevision(version.revision);
            setPartage(activerPartage);
            setSauve(capture);
            window.history.replaceState({}, '', `/olympiades?id=${r.data.id}`);
            setListe(ls => [{ id: version.id, nom: copie.nom }, ...ls.filter(e => e.id !== version.id)]);
            setMessage(versionLocale.current === capture ? 'Olympiade enregistrée dans votre compte.' : 'Version enregistrée ; vos dernières modifications restent à enregistrer.');
        }
        catch {
            setMessage('Enregistrement impossible. Votre copie reste sur cet appareil.');
        }
        finally {
            verrou.current = false;
            setOccupe(false);
        }
    }
    function changerEpreuve(id: string, modifier: (e: EpreuveOlympiade) => EpreuveOlympiade) { setD(a => ({ ...a, epreuves: a.epreuves.map(e => e.id === id ? modifier(e) : e) })); }
    function ajouterEquipe() { if (structureVerrouillee)
        return; try {
        if (d.equipes.length >= 32)
            throw new Error('32 équipes maximum.');
        if (!equipe.trim() || equipe.trim().length > 100 || d.equipes.some(e => e.nom.toLocaleLowerCase('fr') === equipe.trim().toLocaleLowerCase('fr')))
            throw new Error('Ajoutez un nom d’équipe unique.');
        setD(a => ({ ...a, equipes: [...a.equipes, { id: crypto.randomUUID(), nom: equipe.trim(), joueurs: [] }] }));
        setEquipe('');
    }
    catch (e) {
        setMessage(e instanceof Error ? e.message : 'Nom invalide.');
    } }
    const structureVerrouillee = d.epreuves.some(e => e.validee);
    if (!pret)
        return <main className="v2-page"><div className="v2-shell"><TourneoNav /><p role="status">Ouverture des Olympiades…</p></div></main>;
    return <main className="v2-page"><div className="v2-shell"><TourneoNav showBack contextLabel="Olympiades"/><h1 className="tourneo-olympic-print-title">{d.nom}</h1>
 <section className="v2-card tourneo-olympic-editor"><span className="v2-eyebrow">Plusieurs activités · les mêmes équipes</span><h1>Olympiades</h1><p>Ajoutez vos équipes, vos épreuves, puis notez chaque performance. Le classement se construit avec les épreuves validées.</p><a href="/guides/outils-et-olympiades">Comment organiser mes Olympiades ?</a>{message && <p role="status">{message}</p>}{conflit && <div className="tourneo-sync-conflict"><p>Deux versions existent. Cette copie reste disponible à l’export.</p><button type="button" onClick={() => exporterOlympiade(d)}>Exporter cette copie</button><button type="button" onClick={() => { if (window.confirm('Recharger la version en ligne ? Votre copie locale sera téléchargée.')) {
        exporterOlympiade(d);
        localStorage.removeItem(`${CLE}:${id}`);
        window.location.reload();
    } }}>Charger la version en ligne</button></div>}
 <label>Nom de la journée<input maxLength={100} value={d.nom} disabled={!pret || occupe} onChange={e => setD(a => ({ ...a, nom: e.target.value }))}/></label>
 <div className="tourneo-tool-actions"><button type="button" disabled={!pret || occupe || conflit} onClick={() => void enregistrer()}>{occupe ? 'Enregistrement…' : 'Enregistrer dans mon compte'}</button><button type="button" disabled={!pret} onClick={() => exporterOlympiade(d)}>Exporter une sauvegarde</button><button type="button" onClick={() => window.print()}>Imprimer</button></div><p className="tourneo-tool-note">{signature === sauve && id ? 'Version enregistrée dans votre compte.' : 'Modifications conservées sur cet appareil ; utilisez Enregistrer pour les retrouver ailleurs.'}</p>
 <details className="tourneo-tool-settings"><summary>Retrouver, importer ou partager</summary><button type="button" onClick={() => { try {
        const brut = localStorage.getItem(`${CLE}:precedent`);
        if (!brut)
            throw new Error('Aucun ancien brouillon à récupérer.');
        exporterOlympiade(lireOlympiade(JSON.stringify(JSON.parse(brut).donnees)));
    }
    catch (e) {
        setMessage(e instanceof Error ? e.message : 'Récupération impossible.');
    } }}>Récupérer le brouillon précédent</button><label>Mes Olympiades<select value={id} disabled={occupe} onChange={e => { if (!e.target.value)
        return; if (signature !== sauve && !window.confirm('Changer d’Olympiade ? La copie actuelle restera sur cet appareil.'))
        return; window.location.href = `/olympiades?id=${e.target.value}`; }}><option value="">Choisir…</option>{liste.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}</select></label><label>Importer une sauvegarde<input type="file" accept=".json,application/json" disabled={occupe} onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f)
        return; try {
        if (f.size > 1000000)
            throw new Error('Fichier trop volumineux.');
        const copie = lireOlympiade(await f.text());
        if (!window.confirm('Ouvrir cette sauvegarde comme une nouvelle Olympiade ? La copie actuelle sera téléchargée avant le remplacement.'))
            return;
        exporterOlympiade(d);
        setD(copie);
        setId('');
        setRevision(null);
        setPartage(false);
        setSauve('');
        setConflit(false);
        window.history.replaceState({}, '', '/olympiades');
    }
    catch (err) {
        setMessage(err instanceof Error ? err.message : 'Fichier invalide.');
    } }}/></label><div className="tourneo-tool-actions"><button type="button" disabled={occupe || conflit} onClick={() => void enregistrer(!partage)}>{partage ? 'Fermer le partage public' : 'Activer le partage public'}</button>{id && partage && <a href={`/olympiades/partage/${id}`}>Ouvrir le classement public</a>}<button type="button" disabled={occupe} onClick={() => { if (window.confirm('Préparer une nouvelle Olympiade ? Exportez votre copie actuelle si nécessaire.')) {
        exporterOlympiade(d);
        setD(vide());
        setId('');
        setRevision(null);
        setSauve('');
        setPartage(false);
        setConflit(false);
        window.history.replaceState({}, '', '/olympiades');
    } }}>Nouvelle Olympiade</button></div><p className="tourneo-tool-note">Le partage affiche les noms d’équipes et les résultats validés. La liste des membres reste privée.</p></details></section>
 <section className="v2-card tourneo-olympic-editor"><h2>1. Les équipes</h2>{!d.equipes.length && <p>Ajoutez vos équipes ou utilisez <a href="/outils">la roulette pour répartir les participants</a>.</p>}<div className="tourneo-tool-actions"><label>Nouvelle équipe<input maxLength={100} value={equipe} disabled={!pret || structureVerrouillee} onChange={e => setEquipe(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') {
        e.preventDefault();
        ajouterEquipe();
    } }}/></label><button type="button" disabled={!pret || structureVerrouillee || !equipe.trim()} onClick={ajouterEquipe}>Ajouter</button></div><div className="tourneo-drawn-teams">{d.equipes.map(e => <article key={e.id}><strong>{e.nom}</strong>{e.joueurs.length > 0 && <p>{e.joueurs.join(', ')}</p>}<button type="button" disabled={structureVerrouillee} onClick={() => setD(a => ({ ...a, equipes: a.equipes.filter(t => t.id !== e.id) }))}>Retirer</button></article>)}</div>{structureVerrouillee && <p className="tourneo-tool-note">La composition est protégée après la première validation. Rouvrez les résultats des épreuves pour la modifier.</p>}</section>
 <section className="v2-card tourneo-olympic-editor"><h2>2. Les épreuves</h2><div className="tourneo-tool-fields"><label>Activité<input maxLength={100} value={epreuve} disabled={!pret || occupe} placeholder="Relais, lancer de précision, quiz…" onChange={e => setEpreuve(e.target.value)}/></label><label>Performance mesurée<select value={unite} onChange={e => { setUnite(e.target.value); setSens(e.target.value === 'secondes' ? 'moins' : 'plus'); }}><option>points</option><option>secondes</option><option>centimètres</option><option>réussites</option></select></label><label>Meilleure performance<select value={sens} onChange={e => setSens(e.target.value as 'plus' | 'moins')}><option value="plus">La plus grande valeur gagne</option><option value="moins">La plus petite valeur gagne</option></select></label></div><button type="button" disabled={!pret || occupe || !epreuve.trim() || d.epreuves.length >= 32} onClick={() => { setD(a => ({ ...a, epreuves: [...a.epreuves, { id: crypto.randomUUID(), nom: epreuve.trim(), unite, sens, validee: false, mesures: {} }] })); setEpreuve(''); }}>Ajouter l’épreuve</button></section>
 {d.epreuves.map(e => <section className="v2-card" key={e.id}><h2>{e.nom}</h2><p>{e.sens === 'moins' ? 'La plus petite valeur gagne' : 'La plus grande valeur gagne'} · {e.unite}{e.validee ? ' · Résultats validés' : ' · Épreuve en cours'}</p><div className="tourneo-olympic-measures">{d.equipes.map(t => <label key={t.id}>{t.nom}<input inputMode="decimal" aria-label={`${e.nom} — ${t.nom} (${e.unite})`} value={e.mesures[t.id] || ''} disabled={e.validee || occupe} maxLength={13} placeholder={e.unite} onChange={ev => { if (/^\d{0,9}(?:[.,]\d{0,3})?$/.test(ev.target.value))
        changerEpreuve(e.id, a => ({ ...a, mesures: { ...a.mesures, [t.id]: ev.target.value } })); }}/></label>)}</div><div className="tourneo-tool-actions tourneo-olympic-editor"><button type="button" disabled={occupe || (!e.validee && classementEpreuve(e, d.equipes).length !== d.equipes.length) || d.equipes.length < 2} onClick={() => changerEpreuve(e.id, a => ({ ...a, validee: !a.validee }))}>{e.validee ? 'Corriger les résultats' : 'Valider cette épreuve'}</button>{!e.validee && <button type="button" disabled={occupe} onClick={() => { if (window.confirm('Supprimer cette épreuve ?'))
        setD(a => ({ ...a, epreuves: a.epreuves.filter(x => x.id !== e.id) })); }}>Supprimer</button>}</div></section>)}
 <ClassementOlympiade donnees={d}/>
 </div></main>;
}
