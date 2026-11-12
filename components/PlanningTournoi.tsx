"use client";
import {tr,trModele,useLangue} from "@/lib/langue";
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Equipe, Match } from '@/types';
import type { OptionsV2 } from '@/lib/options-v2';
import { nomParticipant } from '@/lib/rotation';
import { planifierMatchs, heureCreneau, affecterTerrain, terrainDisponible } from '@/lib/planning';
import { reperesAppel, type RepereAppel } from '@/lib/reperes-appel';
import AttenteParticipants from "@/components/AttenteParticipants";
import AppelTournoi from "@/components/AppelTournoi";
import { supabase } from '@/lib/supabase';
export default function PlanningTournoi({ equipes, matchs, options, onChange, tournoiId, renderMatch, titreTour, detailsTour, valides = [] }: {
    tournoiId?: string;
    equipes: Equipe[];
    matchs: Match[];
    options: OptionsV2;
    onChange: (m: Match[]) => void;
    renderMatch?: (match: Match, reperes: RepereAppel[]) => ReactNode;
    titreTour?: (tour: number) => string;
    detailsTour?: (tour: number) => ReactNode;
    valides?: readonly number[];
}) {
    useLangue();
    const [glisse, setGlisse] = useState<number | null>(null);
    const [annonceId, setAnnonceId] = useState<number | null>(null), [copie, setCopie] = useState('');
    const [verification, setVerification] = useState<{
        cle: string;
        ids: string[] | null;
    }>({ cle: '', ids: null });
    const [revisionProfils, setRevisionProfils] = useState(0);
    const [verificationEnCours, setVerificationEnCours] = useState(false);
    const panneau = useRef<HTMLDivElement>(null);
    const boutonAnnonce = useRef<HTMLButtonElement>(null);
    const cleProfils = [...new Set(equipes.map(e => e.profilId || e.id).filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)))].sort().join(',');
    useEffect(() => {
        let actif = true;
        if (!cleProfils) {
            setVerification({ cle: cleProfils, ids: [] });
            setVerificationEnCours(false);
            return;
        }
        setVerificationEnCours(true);
        setVerification({ cle: cleProfils, ids: null });
        void (async () => {
            try {
                const r = await supabase.rpc('tourneo_profils_publics', { p_ids: cleProfils.split(',') }).select('id');
                if (actif)
                    setVerification({ cle: cleProfils, ids: r.error || !Array.isArray(r.data) ? null : r.data.map((p: {
                            id: string;
                        }) => p.id) });
            }
            catch {
                if (actif)
                    setVerification({ cle: cleProfils, ids: null });
            }
            finally {
                if (actif)
                    setVerificationEnCours(false);
            }
        })();
        return () => { actif = false; };
    }, [cleProfils, revisionProfils]);
    useEffect(() => {
        if (annonceId !== null)
            panneau.current?.focus();
    }, [annonceId]);
    const profils = verification.cle === cleProfils && verification.ids !== null ? new Set(verification.ids) : null;
    const planning = planifierMatchs(matchs, options);
    const parId = new Map(matchs.map(m => [m.id, m]));
    const nom = (id: string) => nomParticipant(id, equipes);
    function deplacer(id: number, cible: number) {
        const a = parId.get(id), b = parId.get(cible);
        if (!a || !b || a.journee !== b.journee || id === cible || valides.includes(id) || valides.includes(cible))
            return;
        const tour = matchs.filter(m => m.journee === a.journee).sort((a, b) => (a.ordre ?? a.id) - (b.ordre ?? b.id));
        const destination = tour.findIndex(m => m.id === cible);
        tour.splice(tour.findIndex(m => m.id === id), 1);
        tour.splice(destination, 0, a);
        const ordre = new Map(tour.map((m, i) => [m.id, i]));
        onChange(matchs.map(m => ordre.has(m.id) ? { ...m, ordre: ordre.get(m.id) } : m));
    }
    function choisirTerrain(id: number, terrain?: number) {
        if (valides.includes(id))
            return;
        onChange(affecterTerrain(matchs, id, terrain));
    }
    const indexParId = new Map(planning.map((c, i) => [c.matchId, i]));
    const parTour = new Map<number, typeof planning>();
    for (const c of planning) {
        if (!parTour.has(c.journee))
            parTour.set(c.journee, []);
        parTour.get(c.journee)!.push(c);
    }
    const tours = [...parTour.keys()];
    return <section className="v2-planning tourneo-match-workspace">
    <header className="tourneo-match-summary"><div><span className="v2-eyebrow">{tr("Vue compl\u00E8te")}</span><h2>{tr("Matchs et planning")}</h2><p>{tr("Scores, terrains et appels r\u00E9unis au m\u00EAme endroit.")}</p></div><div className="tourneo-workspace-totals"><span>{matchs.length}{tr(" rencontres")}</span><span>{options.terrains}{tr(" terrain(s)")}</span><span>{planning.reduce((fin, c) => Math.max(fin, c.fin), 0)}{tr(" min estim\u00E9es")}</span></div></header>
    <details className="tourneo-workspace-help"><summary>{tr("Rep\u00E8res joueurs et fonctionnement des appels")}</summary><p>{tr("Un profil li\u00E9 ne garantit pas l\u2019installation de l\u2019application ni la r\u00E9ception d\u2019une alerte. \u00AB Annonce sur place \u00BB pr\u00E9pare un texte et permet un envoi distinct dans l\u2019activit\u00E9 Tourneo des profils \u00E9ligibles.")}</p><p>{tr("D\u00E9placez les rencontres dans un m\u00EAme tour avec les fl\u00E8ches ou la poign\u00E9e. Les temps de repos sont conserv\u00E9s. Le terrain se choisit dans la fiche ou en d\u00E9posant la poign\u00E9e sur une zone de terrain. Les matchs valid\u00E9s sont prot\u00E9g\u00E9s.")}</p><button type="button" disabled={verificationEnCours} onClick={() => setRevisionProfils(v => v + 1)}>{verificationEnCours ? tr('Vérification…') : tr('Vérifier les profils liés')}</button></details>
    <AttenteParticipants equipes={equipes} matchs={matchs} options={options} valides={valides}/>
    {!matchs.length && <p>{tr("Aucune rencontre g\u00E9n\u00E9r\u00E9e pour le moment.")}</p>}
    {tours.map(tour => <section className="tourneo-unified-round" key={tour}><header className="tourneo-unified-round-heading"><div><span className="v2-eyebrow">{tr("Calendrier")}</span><h2>{titreTour?.(tour) || trModele("Tour {0}", tour)}</h2>{detailsTour?.(tour)}</div><span>{parTour.get(tour)!.length}{tr(" match(s)")}</span></header>
      {options.terrains > 1 && <div className={`tourneo-court-lanes${glisse !== null ? ' is-active' : ''}`} role="group" aria-label={tr("Affecter un terrain par glisser-déposer")}>{Array.from({ length: options.terrains }, (_, i) => i + 1).map(terrain => <div key={terrain} onDragOver={e => { if (glisse !== null) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        } }} onDrop={e => { e.preventDefault(); e.stopPropagation(); if (glisse !== null)
            choisirTerrain(glisse, terrain); setGlisse(null); }}><strong>{tr("Terrain ")}{terrain}</strong><small>{tr("D\u00E9poser un match")}</small></div>)}</div>}
      <div className="tourneo-unified-match-list">{parTour.get(tour)!.map(c => {
                const m = parId.get(c.matchId)!;
                const index = indexParId.get(m.id)!;
                const avant = planning[index - 1], apres = planning[index + 1];
                const reperes = reperesAppel(m, equipes, profils);
                const texte = `Match sur le terrain ${c.terrain} : ${nom(m.equipe1Id)} contre ${nom(m.equipe2Id)}.`;
                return <article id={`organisateur-match-${m.id}`} className={`tourneo-unified-match${valides.includes(m.id) ? ' is-validated' : ''}${glisse === m.id ? ' is-dragging' : ''}`} key={m.id} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (glisse !== null)
                    deplacer(glisse, m.id); setGlisse(null); }}>
          <div className="tourneo-unified-match-toolbar"><div className="tourneo-match-schedule"><label className="tourneo-terrain-select"><span>{tr("Terrain")}</span><select aria-label={trModele("Terrain du match {0}", m.id)} value={terrainDisponible(m.terrain, options.terrains) ? String(m.terrain) : 'auto'} disabled={valides.includes(m.id)} onChange={e => choisirTerrain(m.id, e.target.value === 'auto' ? undefined : Number(e.target.value))}><option value="auto">{tr("Auto \u00B7 ")}{c.terrain}</option>{Array.from({ length: options.terrains }, (_, i) => i + 1).map(n => <option key={n} value={n}>{tr("Terrain ")}{n}</option>)}</select></label>{m.terrain !== undefined && !terrainDisponible(m.terrain, options.terrains) && <small>{tr("Ancien terrain indisponible \u00B7 calcul automatique")}</small>}<span>{heureCreneau(c.debut, options.depart)} <small>{tr("estim\u00E9")}</small></span></div><div className="tourneo-unified-match-controls">
            <span className="tourneo-drag-handle" draggable={!valides.includes(m.id)} onDragStart={e => { if (valides.includes(m.id))
                    e.preventDefault();
                else
                    setGlisse(m.id); }} onDragEnd={() => setGlisse(null)} title={tr("Glisser pour réorganiser les matchs du tour")}><svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor" aria-hidden="true">{[4, 10, 16].flatMap(y => [4, 10].map(x => <circle key={`${x}:${y}`} cx={x} cy={y} r="1.3"/>))}</svg></span>
            <button type="button" aria-label={tr("Avancer le match")} disabled={valides.includes(m.id) || !avant || avant.journee !== m.journee || valides.includes(avant.matchId)} onClick={() => deplacer(m.id, avant.matchId)}>↑</button><button type="button" aria-label={tr("Reculer le match")} disabled={valides.includes(m.id) || !apres || apres.journee !== m.journee || valides.includes(apres.matchId)} onClick={() => deplacer(m.id, apres.matchId)}>↓</button>
            <button type="button" className="tourneo-open-call" aria-expanded={annonceId === m.id} aria-controls={annonceId === m.id ? `annonce-${m.id}` : undefined} onClick={e => { boutonAnnonce.current = e.currentTarget; setAnnonceId(annonceId === m.id ? null : m.id); setCopie(''); }}>{tr("Annonce sur place")}</button>
          </div></div>
          <div className="tourneo-unified-match-content">{renderMatch ? renderMatch(m, reperes) : <><h3>{nom(m.equipe1Id)} — {nom(m.equipe2Id)}</h3><div className="tourneo-player-markers">{reperes.map(r => <span key={r.id} className={`tourneo-player-marker is-${r.statut}`}>{r.nom} · {r.statut === 'profil' ? tr('Profil lié') : r.statut === 'sur_place' ? tr('Sans profil lié') : tr('Profil non vérifié')}</span>)}</div></>}</div>
          {annonceId === m.id && <div id={`annonce-${m.id}`} ref={panneau} tabIndex={-1} className="tourneo-announcement v2-no-print"><strong>{tr("Annonce \u00E0 faire sur place")}</strong><p>{tr(texte)}</p><p className="tourneo-announcement-warning">{tr("Cette annonce et sa copie n\u2019envoient aucune notification. L\u2019envoi dans Tourneo se fait s\u00E9par\u00E9ment ci-dessous.")}</p><button type="button" onClick={async () => { try {
                    await navigator.clipboard.writeText(texte);
                    setCopie('Texte copié uniquement : cette copie n’a envoyé aucune notification.');
                }
                catch {
                    setCopie('Copie indisponible : sélectionnez le texte pour le copier.');
                } }}>{tr("Copier l\u2019annonce")}</button><button type="button" onClick={() => { setAnnonceId(null); boutonAnnonce.current?.focus(); }}>{tr("Fermer")}</button>{copie && <p role="status">{copie}</p>}{tournoiId && <AppelTournoi key={`${tournoiId}:${m.id}`} tournoiId={tournoiId} matchId={m.id}/>}</div>}
        </article>;
            })}</div>
    </section>)}
    <p className="tourneo-planning-footnote">{tr("Horaires estim\u00E9s : attendez l\u2019appel de l\u2019organisateur pour rejoindre le terrain.")}</p>
  </section>;
}
