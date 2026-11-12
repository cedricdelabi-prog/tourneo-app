"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { libelleSport } from "@/lib/libelles-sports";
import TourneoNav from "@/components/TourneoNav";
import { statistiquesTournois, type TournoiStat } from "@/lib/statistiques";
type Evaluation = { tournoi_id: string; note: number; commentaire: string };
const celluleCSV = (v: unknown) => `"${String(v).replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"','""')}"`;
export default function Statistiques() {
  const [tournois, setTournois] = useState<TournoiStat[]>([]), [avis, setAvis] = useState<Evaluation[]>([]);
  const [du, setDu] = useState(""), [au, setAu] = useState(""), [sport, setSport] = useState("");
  const [erreur, setErreur] = useState(""), [pret, setPret] = useState(false);
  const [chargement, setChargement] = useState(true), [revision, setRevision] = useState(0);
  useEffect(() => { let actif = true; setChargement(true); setErreur(""); void (async () => {
    try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) { window.location.href = '/login'; return; }
    // Paginate rather than silently truncating organizers with >1,000 tournaments.
    const ts: TournoiStat[] = [];
    for (let debut = 0; ; debut += 500) {
      const r = await supabase.from('tournois').select('id,nom,sport,created_at,donnees').eq('user_id', data.user.id).order('id').range(debut, debut + 499);
      if (!actif) return;
      if (r.error) { setErreur('Impossible de charger vos statistiques.'); return; }
      ts.push(...r.data); if (r.data.length < 500) break;
    }
    const evaluations: Evaluation[] = [];
    for (let debut = 0; ; debut += 500) {
      const r = await supabase.from('tourneo_evaluations').select('tournoi_id,note,commentaire').order('tournoi_id').order('user_id').range(debut,debut + 499);
      if (!actif) return;
      if (r.error) { setErreur('Statistiques chargées ; les évaluations sont momentanément indisponibles.'); break; }
      evaluations.push(...r.data); if (r.data.length < 500) break;
    }
    if (actif) { setTournois(ts); setAvis(evaluations); setPret(true); }
    } catch { if (actif) setErreur('Chargement impossible. Vérifiez votre connexion et réessayez.'); }
    finally { if (actif) setChargement(false); }
  })(); return () => { actif = false; }; }, [revision]);
  const periodeInvalide = Boolean(du && au && du > au);
  const retenus = useMemo(() => tournois.filter(t => !periodeInvalide && (!sport || t.sport === sport) && (!du || Date.parse(t.created_at) >= Date.parse(`${du}T00:00:00`)) && (!au || Date.parse(t.created_at) <= Date.parse(`${au}T23:59:59.999`))), [tournois, sport, du, au, periodeInvalide]);
  const stats = useMemo(() => statistiquesTournois(retenus), [retenus]);
  const evaluations = avis.filter(a => retenus.some(t => t.id === a.tournoi_id));
  const moyenne = evaluations.length ? (evaluations.reduce((s,a) => s+a.note,0) / evaluations.length).toFixed(1) : '—';
  function exporter() {
    const lignes = [['Sport','Tournois','Participations','Matchs programmés','Matchs validés'],...stats.sports.map(s => [libelleSport(s.sport),s.tournois,s.participations,s.matchs,s.valides])];
    const url = URL.createObjectURL(new Blob(['\uFEFF'+lignes.map(l => l.map(celluleCSV).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
    const a = document.createElement('a'); a.href=url; a.download='tourneo-statistiques.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
  }
  const indicateurs = [
    { label: 'Tournois', valeur: stats.tournois, detail: 'sur la période', accent: 'blue' },
    { label: 'Terminés', valeur: stats.termines, detail: 'résultats validés', accent: 'teal' },
    { label: 'Brouillons', valeur: stats.brouillons, detail: 'à préparer', accent: 'purple' },
    { label: 'Participations', valeur: stats.participations, detail: 'places dans vos tournois', accent: 'blue' },
    { label: 'Matchs validés', valeur: `${stats.valides} / ${stats.matchs}`, detail: 'rencontres programmées', accent: 'teal' },
    { label: 'Progression', valeur: `${stats.tauxValidation} %`, detail: 'de matchs validés', accent: 'purple' },
    { label: 'Avis participants', valeur: evaluations.length ? `${moyenne} / 5` : '—', detail: evaluations.length ? `${evaluations.length} avis reçu(s)` : 'Pas encore d’avis', accent: 'amber' },
  ];
  return <main className="v2-page tournoi-statistiques"><div className="v2-shell"><TourneoNav/>
    <header className="stats-page-heading"><div><span className="v2-eyebrow">Votre activité en chiffres</span><h1>Mes statistiques</h1><p>Un aperçu de vos tournois et des retours de vos participants.</p></div><div className="stats-actions"><button type="button" disabled={!pret || chargement || periodeInvalide || !retenus.length} onClick={exporter}>Exporter CSV</button><button type="button" disabled={!pret || chargement || periodeInvalide} onClick={() => window.print()}>Imprimer</button></div></header>
    <section className="v2-card stats-filter-card" aria-label="Filtrer les statistiques"><div className="stats-filters">
      <label htmlFor="stats-du">Créés à partir du<input id="stats-du" type="date" value={du} max={au || undefined} onChange={e => setDu(e.target.value)}/></label>
      <label htmlFor="stats-au">Jusqu’au<input id="stats-au" type="date" min={du || undefined} value={au} onChange={e => setAu(e.target.value)}/></label>
      <label htmlFor="stats-sport">Discipline<select id="stats-sport" value={sport} onChange={e => setSport(e.target.value)}><option value="">Toutes les disciplines</option>{[...new Set(tournois.map(t => t.sport))].sort((a,b) => libelleSport(a).localeCompare(libelleSport(b))).map(s => <option key={s} value={s}>{libelleSport(s)}</option>)}</select></label>
      <button type="button" className="stats-reset" disabled={!du && !au && !sport} onClick={() => { setDu(''); setAu(''); setSport(''); }}>Réinitialiser</button>
    </div>{periodeInvalide && <p role="alert" className="v2-alert">La date de fin doit suivre la date de début.</p>}</section>
    {erreur && <div role="alert" className="stats-error">{erreur}<button type="button" disabled={chargement} onClick={() => setRevision(v => v + 1)}>Réessayer</button></div>}
    {chargement && <p role="status" className="stats-loading">Chargement de vos statistiques…</p>}
    <section className="stats-metrics" aria-label="Indicateurs de vos tournois" aria-busy={chargement}>
      {indicateurs.map(i => <article key={i.label} className={`stats-metric stats-accent-${i.accent}`}><span className="stats-metric-label">{i.label}</span><strong className="stats-metric-value">{pret ? i.valeur : '—'}</strong><span className="stats-metric-detail">{i.detail}</span>{i.label === 'Progression' && <div className="stats-progress" role="progressbar" aria-label="Matchs validés" aria-valuemin={0} aria-valuemax={100} aria-valuenow={stats.tauxValidation}><span style={{ width: `${stats.tauxValidation}%` }}/></div>}</article>)}
    </section>
    <p className="stats-explanation">Une participation correspond à une place dans un tournoi. Une équipe compte pour une place.</p>
    <section className="v2-card stats-discipline"><div className="stats-section-heading"><div><h2>Par discipline</h2><p>Comparez l’activité de vos différents sports.</p></div><span className="stats-count">{stats.sports.length} discipline(s)</span></div>
      {!stats.sports.length ? <div className="stats-empty">{pret ? 'Aucun tournoi pour ces filtres.' : 'Vos disciplines apparaîtront ici.'}</div> : <div className="stats-table-scroll"><table className="stats-table"><caption className="stats-sr-only">Tournois, participations et matchs validés par discipline</caption><thead><tr><th scope="col">Discipline</th><th scope="col">Tournois</th><th scope="col">Participations</th><th scope="col">Matchs validés</th><th scope="col">Avancement</th></tr></thead><tbody>{stats.sports.map(s => <tr key={s.sport}><th scope="row"><span className="stats-sport-dot"/>{libelleSport(s.sport)}</th><td>{s.tournois}</td><td>{s.participations}</td><td><strong>{s.valides}</strong><span className="stats-table-muted"> / {s.matchs}</span></td><td><div className="stats-table-progress"><span style={{ width: `${s.matchs ? Math.round(s.valides / s.matchs * 100) : 0}%` }}/></div><small>{s.matchs ? Math.round(s.valides / s.matchs * 100) : 0} %</small></td></tr>)}</tbody></table></div>}
    </section>
    <section className="v2-card"><div className="stats-section-heading"><div><h2>Retours des participants</h2><p>Les avis reçus sur vos tournois de la période.</p></div>{evaluations.length > 0 && <span className="stats-rating">{moyenne}<small> / 5</small></span>}</div>
      <div className="stats-reviews">{evaluations.map((a,i) => <article className="stats-review" key={`${a.tournoi_id}:${i}`}><div><strong>{retenus.find(t => t.id === a.tournoi_id)?.nom}</strong><span className="stats-review-score">{a.note} / 5</span></div><p>{a.commentaire || 'Sans commentaire'}</p></article>)}</div>
      {!evaluations.length && <div className="stats-empty"><strong>Pas encore de retour</strong><p>Les avis des participants apparaîtront ici après vos tournois.</p></div>}
    </section>
  </div></main>;
}
