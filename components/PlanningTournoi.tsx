"use client";
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
  tournoiId?: string; equipes: Equipe[]; matchs: Match[]; options: OptionsV2; onChange: (m: Match[]) => void;
  renderMatch?: (match: Match, reperes: RepereAppel[]) => ReactNode;
  titreTour?: (tour: number) => string; detailsTour?: (tour: number) => ReactNode; valides?: readonly number[];
}) {
  const [glisse, setGlisse] = useState<number | null>(null);
  const [annonceId, setAnnonceId] = useState<number | null>(null), [copie, setCopie] = useState('');
  const [verification, setVerification] = useState<{ cle: string; ids: string[] | null }>({ cle: '', ids: null });
  const [revisionProfils, setRevisionProfils] = useState(0);
  const [verificationEnCours, setVerificationEnCours] = useState(false);
  const panneau = useRef<HTMLDivElement>(null);
  const boutonAnnonce = useRef<HTMLButtonElement>(null);
  const cleProfils = [...new Set(equipes.map(e => e.profilId || e.id).filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)))].sort().join(',');
  useEffect(() => {
    let actif = true;
    if (!cleProfils) { setVerification({ cle: cleProfils, ids: [] }); setVerificationEnCours(false); return; }
    setVerificationEnCours(true);
    setVerification({ cle: cleProfils, ids: null });
    void (async () => {
      try {
        const r = await supabase.rpc('tourneo_profils_publics', { p_ids: cleProfils.split(',') }).select('id');
        if (actif) setVerification({ cle: cleProfils, ids: r.error || !Array.isArray(r.data) ? null : r.data.map((p: { id: string }) => p.id) });
      } catch { if (actif) setVerification({ cle: cleProfils, ids: null }); }
      finally { if (actif) setVerificationEnCours(false); }
    })();
    return () => { actif = false; };
  }, [cleProfils, revisionProfils]);
  useEffect(() => {
    if (annonceId !== null) panneau.current?.focus();
  }, [annonceId]);
  const profils = verification.cle === cleProfils && verification.ids !== null ? new Set(verification.ids) : null;
  const planning = planifierMatchs(matchs, options);
  const parId = new Map(matchs.map(m => [m.id, m]));
  const nom = (id: string) => nomParticipant(id, equipes);
  function deplacer(id: number, cible: number) {
    const a = parId.get(id), b = parId.get(cible);
    if (!a || !b || a.journee !== b.journee || id === cible || valides.includes(id) || valides.includes(cible)) return;
    const tour = matchs.filter(m => m.journee === a.journee).sort((a, b) => (a.ordre ?? a.id) - (b.ordre ?? b.id));
    const destination = tour.findIndex(m => m.id === cible);
    tour.splice(tour.findIndex(m => m.id === id), 1); tour.splice(destination, 0, a);
    const ordre = new Map(tour.map((m, i) => [m.id, i]));
    onChange(matchs.map(m => ordre.has(m.id) ? { ...m, ordre: ordre.get(m.id) } : m));
  }
  function choisirTerrain(id: number, terrain?: number) {
    if (valides.includes(id)) return;
    onChange(affecterTerrain(matchs,id,terrain));
  }
  const indexParId = new Map(planning.map((c,i) => [c.matchId,i]));
  const parTour = new Map<number, typeof planning>();
  for (const c of planning) { if (!parTour.has(c.journee)) parTour.set(c.journee,[]); parTour.get(c.journee)!.push(c); }
  const tours = [...parTour.keys()];
  return <section className="v2-planning tourneo-match-workspace">
    <header className="tourneo-match-summary"><div><span className="v2-eyebrow">Vue complète</span><h2>Matchs et planning</h2><p>Scores, terrains et appels réunis au même endroit.</p></div><div className="tourneo-workspace-totals"><span>{matchs.length} rencontres</span><span>{options.terrains} terrain(s)</span><span>{planning.reduce((fin,c) => Math.max(fin,c.fin),0)} min estimées</span></div></header>
    <details className="tourneo-workspace-help"><summary>Repères joueurs et fonctionnement des appels</summary><p>Un profil lié ne garantit pas l’installation de l’application ni la réception d’une alerte. « Annonce sur place » prépare un texte et permet un envoi distinct dans l’activité Tourneo des profils éligibles.</p><p>Déplacez les rencontres dans un même tour avec les flèches ou la poignée. Les temps de repos sont conservés. Le terrain se choisit dans la fiche ou en déposant la poignée sur une zone de terrain. Les matchs validés sont protégés.</p><button type="button" disabled={verificationEnCours} onClick={() => setRevisionProfils(v => v + 1)}>{verificationEnCours ? 'Vérification…' : 'Vérifier les profils liés'}</button></details>
    <AttenteParticipants equipes={equipes} matchs={matchs} options={options} valides={valides}/>
    {!matchs.length && <p>Aucune rencontre générée pour le moment.</p>}
    {tours.map(tour => <section className="tourneo-unified-round" key={tour}><header className="tourneo-unified-round-heading"><div><span className="v2-eyebrow">Calendrier</span><h2>{titreTour?.(tour) || `Tour ${tour}`}</h2>{detailsTour?.(tour)}</div><span>{parTour.get(tour)!.length} match(s)</span></header>
      {options.terrains > 1 && <div className={`tourneo-court-lanes${glisse !== null ? ' is-active' : ''}`} role="group" aria-label="Affecter un terrain par glisser-déposer">{Array.from({length:options.terrains},(_,i) => i+1).map(terrain => <div key={terrain} onDragOver={e => { if (glisse !== null) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } }} onDrop={e => { e.preventDefault(); e.stopPropagation(); if (glisse !== null) choisirTerrain(glisse,terrain); setGlisse(null); }}><strong>Terrain {terrain}</strong><small>Déposer un match</small></div>)}</div>}
      <div className="tourneo-unified-match-list">{parTour.get(tour)!.map(c => {
        const m = parId.get(c.matchId)!; const index = indexParId.get(m.id)!;
        const avant = planning[index - 1], apres = planning[index + 1];
        const reperes = reperesAppel(m, equipes, profils);
        const texte = `Match sur le terrain ${c.terrain} : ${nom(m.equipe1Id)} contre ${nom(m.equipe2Id)}.`;
        return <article id={`organisateur-match-${m.id}`} className={`tourneo-unified-match${valides.includes(m.id) ? ' is-validated' : ''}${glisse === m.id ? ' is-dragging' : ''}`} key={m.id} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (glisse !== null) deplacer(glisse,m.id); setGlisse(null); }}>
          <div className="tourneo-unified-match-toolbar"><div className="tourneo-match-schedule"><label className="tourneo-terrain-select"><span>Terrain</span><select aria-label={`Terrain du match ${m.id}`} value={terrainDisponible(m.terrain,options.terrains) ? String(m.terrain) : 'auto'} disabled={valides.includes(m.id)} onChange={e => choisirTerrain(m.id,e.target.value === 'auto' ? undefined : Number(e.target.value))}><option value="auto">Auto · {c.terrain}</option>{Array.from({length:options.terrains},(_,i) => i+1).map(n => <option key={n} value={n}>Terrain {n}</option>)}</select></label>{m.terrain !== undefined && !terrainDisponible(m.terrain,options.terrains) && <small>Ancien terrain indisponible · calcul automatique</small>}<span>{heureCreneau(c.debut,options.depart)} <small>estimé</small></span></div><div className="tourneo-unified-match-controls">
            <span className="tourneo-drag-handle" draggable={!valides.includes(m.id)} onDragStart={e => { if (valides.includes(m.id)) e.preventDefault(); else setGlisse(m.id); }} onDragEnd={() => setGlisse(null)} title="Glisser pour réorganiser les matchs du tour"><svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor" aria-hidden="true">{[4,10,16].flatMap(y => [4,10].map(x => <circle key={`${x}:${y}`} cx={x} cy={y} r="1.3"/>))}</svg></span>
            <button type="button" aria-label="Avancer le match" disabled={valides.includes(m.id) || !avant || avant.journee !== m.journee || valides.includes(avant.matchId)} onClick={() => deplacer(m.id,avant.matchId)}>↑</button><button type="button" aria-label="Reculer le match" disabled={valides.includes(m.id) || !apres || apres.journee !== m.journee || valides.includes(apres.matchId)} onClick={() => deplacer(m.id,apres.matchId)}>↓</button>
            <button type="button" className="tourneo-open-call" aria-expanded={annonceId === m.id} aria-controls={annonceId === m.id ? `annonce-${m.id}` : undefined} onClick={e => { boutonAnnonce.current = e.currentTarget; setAnnonceId(annonceId === m.id ? null : m.id); setCopie(''); }}>Annonce sur place</button>
          </div></div>
          <div className="tourneo-unified-match-content">{renderMatch ? renderMatch(m,reperes) : <><h3>{nom(m.equipe1Id)} — {nom(m.equipe2Id)}</h3><div className="tourneo-player-markers">{reperes.map(r => <span key={r.id} className={`tourneo-player-marker is-${r.statut}`}>{r.nom} · {r.statut === 'profil' ? 'Profil lié' : r.statut === 'sur_place' ? 'Sans profil lié' : 'Profil non vérifié'}</span>)}</div></>}</div>
          {annonceId === m.id && <div id={`annonce-${m.id}`} ref={panneau} tabIndex={-1} className="tourneo-announcement v2-no-print"><strong>Annonce à faire sur place</strong><p>{texte}</p><p className="tourneo-announcement-warning">Cette annonce et sa copie n’envoient aucune notification. L’envoi dans Tourneo se fait séparément ci-dessous.</p><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(texte); setCopie('Texte copié uniquement : cette copie n’a envoyé aucune notification.'); } catch { setCopie('Copie indisponible : sélectionnez le texte pour le copier.'); } }}>Copier l’annonce</button><button type="button" onClick={() => { setAnnonceId(null); boutonAnnonce.current?.focus(); }}>Fermer</button>{copie && <p role="status">{copie}</p>}{tournoiId && <AppelTournoi key={`${tournoiId}:${m.id}`} tournoiId={tournoiId} matchId={m.id}/>}</div>}
        </article>;
      })}</div>
    </section>)}
    <p className="tourneo-planning-footnote">Horaires estimés : attendez l’appel de l’organisateur pour rejoindre le terrain.</p>
  </section>;
}
