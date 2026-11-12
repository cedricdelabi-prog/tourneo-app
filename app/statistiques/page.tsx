"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import TourneoNav from "@/components/TourneoNav";
import { statistiquesTournois, type TournoiStat } from "@/lib/statistiques";
type Evaluation = { tournoi_id: string; note: number; commentaire: string };
const celluleCSV = (v: unknown) => `"${String(v).replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"','""')}"`;
export default function Statistiques() {
  const [tournois, setTournois] = useState<TournoiStat[]>([]), [avis, setAvis] = useState<Evaluation[]>([]);
  const [du, setDu] = useState(""), [au, setAu] = useState(""), [sport, setSport] = useState("");
  const [erreur, setErreur] = useState(""), [pret, setPret] = useState(false);
  useEffect(() => { let actif = true; void (async () => {
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
    setTournois(ts); setAvis(evaluations); setPret(true);
  })(); return () => { actif = false; }; }, []);
  const retenus = useMemo(() => tournois.filter(t => (!sport || t.sport === sport) && (!du || Date.parse(t.created_at) >= Date.parse(`${du}T00:00:00`)) && (!au || Date.parse(t.created_at) <= Date.parse(`${au}T23:59:59.999`))), [tournois, sport, du, au]);
  const stats = useMemo(() => statistiquesTournois(retenus), [retenus]);
  const evaluations = avis.filter(a => retenus.some(t => t.id === a.tournoi_id));
  const moyenne = evaluations.length ? (evaluations.reduce((s,a) => s+a.note,0) / evaluations.length).toFixed(1) : '—';
  function exporter() {
    const lignes = [['Sport','Tournois','Participations','Matchs programmés','Matchs validés'],...stats.sports.map(s => [s.sport,s.tournois,s.participations,s.matchs,s.valides])];
    const url = URL.createObjectURL(new Blob(['\uFEFF'+lignes.map(l => l.map(celluleCSV).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
    const a = document.createElement('a'); a.href=url; a.download='tourneo-statistiques.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
  }
  return <main className="v2-page"><div className="v2-shell"><TourneoNav/><section className="v2-card"><h1>Mes statistiques organisateur</h1><p>Ces chiffres concernent vos tournois. Une participation correspond à une place dans un tournoi ; une équipe compte pour une place.</p>{erreur && <p role="alert">{erreur}</p>}{!pret && !erreur && <p>Chargement…</p>}<div className="v2-row"><label>Créés du<input type="date" value={du} onChange={e => setDu(e.target.value)}/></label><label>Au<input type="date" min={du} value={au} onChange={e => setAu(e.target.value)}/></label><label>Sport<select value={sport} onChange={e => setSport(e.target.value)}><option value="">Tous</option>{[...new Set(tournois.map(t => t.sport))].sort().map(s => <option key={s}>{s}</option>)}</select></label></div><div className="v2-row">{[['Tournois',stats.tournois],['Terminés',stats.termines],['Brouillons',stats.brouillons],['Participations',stats.participations],['Matchs validés',`${stats.valides} / ${stats.matchs}`],['Progression',`${stats.tauxValidation} %`],['Avis',`${moyenne} / 5 (${evaluations.length})`]].map(([label,n]) => <p key={label}><strong>{n}</strong><br/>{label}</p>)}</div><button disabled={!pret} onClick={exporter}>Exporter le bilan CSV</button> <button onClick={() => window.print()}>Imprimer</button></section><section className="v2-card"><h2>Par discipline</h2><div style={{overflowX:'auto'}}><table><thead><tr><th>Sport</th><th>Tournois</th><th>Participations</th><th>Matchs validés</th></tr></thead><tbody>{stats.sports.map(s => <tr key={s.sport}><td>{s.sport}</td><td>{s.tournois}</td><td>{s.participations}</td><td>{s.valides} / {s.matchs}</td></tr>)}</tbody></table></div></section><section className="v2-card"><h2>Retours des participants</h2>{evaluations.map((a,i) => <article className="v2-entry" key={`${a.tournoi_id}:${i}`}><strong>{retenus.find(t => t.id===a.tournoi_id)?.nom} · {a.note}/5</strong><p>{a.commentaire || 'Sans commentaire'}</p></article>)}{!evaluations.length && <p>Aucun avis sur la période sélectionnée.</p>}</section></div></main>;
}
