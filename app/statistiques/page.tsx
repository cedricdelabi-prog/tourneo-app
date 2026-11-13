"use client";
import ChampDate from '@/components/ChampDate';
import {tr,trModele,useLangue} from "@/lib/langue";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { libelleSport } from "@/lib/libelles-sports";
import TourneoNav from "@/components/TourneoNav";
import { statistiquesTournois, type TournoiStat } from "@/lib/statistiques";
type Evaluation = {
    tournoi_id: string;
    note: number;
    commentaire: string;
};
const celluleCSV = (v: unknown) => `"${String(v).replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""')}"`;
export default function Statistiques() {
    useLangue();
    const [tournois, setTournois] = useState<TournoiStat[]>([]), [avis, setAvis] = useState<Evaluation[]>([]);
    const [du, setDu] = useState(""), [au, setAu] = useState(""), [sport, setSport] = useState("");
    const [erreur, setErreur] = useState(""), [pret, setPret] = useState(false);
    const [chargement, setChargement] = useState(true), [revision, setRevision] = useState(0);
    useEffect(() => {
        let actif = true;
        setChargement(true);
        setErreur("");
        void (async () => {
            try {
                const { data } = await supabase.auth.getUser();
                if (!data.user) {
                    window.location.href = '/login';
                    return;
                }
                // Paginate rather than silently truncating organizers with >1,000 tournaments.
                const ts: TournoiStat[] = [];
                for (let debut = 0;; debut += 500) {
                    const r = await supabase.from('tournois').select('id,nom,sport,created_at,donnees').eq('user_id', data.user.id).order('id').range(debut, debut + 499);
                    if (!actif)
                        return;
                    if (r.error) {
                        setErreur('Impossible de charger vos statistiques.');
                        return;
                    }
                    ts.push(...r.data);
                    if (r.data.length < 500)
                        break;
                }
                const evaluations: Evaluation[] = [];
                for (let debut = 0;; debut += 500) {
                    const r = await supabase.from('tourneo_evaluations').select('tournoi_id,note,commentaire').order('tournoi_id').order('user_id').range(debut, debut + 499);
                    if (!actif)
                        return;
                    if (r.error) {
                        setErreur('Statistiques chargées ; les évaluations sont momentanément indisponibles.');
                        break;
                    }
                    evaluations.push(...r.data);
                    if (r.data.length < 500)
                        break;
                }
                if (actif) {
                    setTournois(ts);
                    setAvis(evaluations);
                    setPret(true);
                }
            }
            catch {
                if (actif)
                    setErreur('Chargement impossible. Vérifiez votre connexion et réessayez.');
            }
            finally {
                if (actif)
                    setChargement(false);
            }
        })();
        return () => { actif = false; };
    }, [revision]);
    const periodeInvalide = Boolean(du && au && du > au);
    const retenus = useMemo(() => tournois.filter(t => !periodeInvalide && (!sport || t.sport === sport) && (!du || Date.parse(t.created_at) >= Date.parse(`${du}T00:00:00`)) && (!au || Date.parse(t.created_at) <= Date.parse(`${au}T23:59:59.999`))), [tournois, sport, du, au, periodeInvalide]);
    const stats = useMemo(() => statistiquesTournois(retenus), [retenus]);
    const evaluations = avis.filter(a => retenus.some(t => t.id === a.tournoi_id));
    const moyenne = evaluations.length ? (evaluations.reduce((s, a) => s + a.note, 0) / evaluations.length).toFixed(1) : '—';
    function exporter() {
        const lignes = [['Sport', 'Tournois', 'Participations', 'Matchs programmés', 'Matchs validés'], ...stats.sports.map(s => [libelleSport(s.sport), s.tournois, s.participations, s.matchs, s.valides])];
        const url = URL.createObjectURL(new Blob(['\uFEFF' + lignes.map(l => l.map(celluleCSV).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tourneo-statistiques.csv';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    return <main className="v2-page tournoi-statistiques"><div className="v2-shell"><TourneoNav />
    <header className="stats-page-heading"><div><span className="v2-eyebrow">{tr("Votre activit\u00E9 en chiffres")}</span><h1>{tr("Mes statistiques")}</h1><p>{tr("Un aper\u00E7u de vos tournois et des retours de vos participants.")}</p></div><div className="stats-actions"><button type="button" disabled={!pret || chargement || periodeInvalide || !retenus.length} onClick={exporter}>{tr("Exporter CSV")}</button><button type="button" disabled={!pret || chargement || periodeInvalide} onClick={() => window.print()}>{tr("Imprimer")}</button></div></header>
    <section className="v2-card stats-filter-card" aria-label={tr("Filtrer les statistiques")}><div className="stats-filters">
      <label htmlFor="stats-du">{tr("Cr\u00E9\u00E9s \u00E0 partir du")}<ChampDate id="stats-du" type="date" value={du} max={au || undefined} onChange={e => setDu(e.target.value)}/></label>
      <label htmlFor="stats-au">{tr("Jusqu\u2019au")}<ChampDate id="stats-au" type="date" min={du || undefined} value={au} onChange={e => setAu(e.target.value)}/></label>
      <label htmlFor="stats-sport">{tr("Discipline")}<select id="stats-sport" value={sport} onChange={e => setSport(e.target.value)}><option value="">{tr("Toutes les disciplines")}</option>{[...new Set(tournois.map(t => t.sport))].sort((a, b) => libelleSport(a).localeCompare(libelleSport(b))).map(s => <option key={s} value={s}>{libelleSport(s)}</option>)}</select></label>
      <button type="button" className="stats-reset" disabled={!du && !au && !sport} onClick={() => { setDu(''); setAu(''); setSport(''); }}>{tr("R\u00E9initialiser")}</button>
    </div>{periodeInvalide && <p role="alert" className="v2-alert">{tr("La date de fin doit suivre la date de d\u00E9but.")}</p>}</section>
    {tr(erreur) && <div role="alert" className="stats-error">{tr(erreur)}<button type="button" disabled={chargement} onClick={() => setRevision(v => v + 1)}>{tr("R\u00E9essayer")}</button></div>}
    {chargement && <p role="status" className="stats-loading">{tr("Chargement de vos statistiques\u2026")}</p>}
    <section className="stats-metrics" aria-label={tr("Indicateurs de vos tournois")} aria-busy={chargement}>
      {indicateurs.map(i => <article key={i.label} className={`stats-metric stats-accent-${i.accent}`}><span className="stats-metric-label">{tr(i.label)}</span><strong className="stats-metric-value">{pret ? i.valeur : '—'}</strong><span className="stats-metric-detail">{i.detail}</span>{i.label === 'Progression' && <div className="stats-progress" role="progressbar" aria-label={tr("Matchs validés")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={stats.tauxValidation}><span style={{ width: `${stats.tauxValidation}%` }}/></div>}</article>)}
    </section>
    <p className="stats-explanation">{tr("Une participation correspond \u00E0 une place dans un tournoi. Une \u00E9quipe compte pour une place.")}</p>
    <section className="v2-card stats-discipline"><div className="stats-section-heading"><div><h2>{tr("Par discipline")}</h2><p>{tr("Comparez l\u2019activit\u00E9 de vos diff\u00E9rents sports.")}</p></div><span className="stats-count">{stats.sports.length}{tr(" discipline(s)")}</span></div>
      {!stats.sports.length ? <div className="stats-empty">{pret ? tr('Aucun tournoi pour ces filtres.') : tr('Vos disciplines apparaîtront ici.')}</div> : <div className="stats-table-scroll"><table className="stats-table"><caption className="stats-sr-only">{tr("Tournois, participations et matchs valid\u00E9s par discipline")}</caption><thead><tr><th scope="col">{tr("Discipline")}</th><th scope="col">{tr("Tournois")}</th><th scope="col">{tr("Participations")}</th><th scope="col">{tr("Matchs valid\u00E9s")}</th><th scope="col">{tr("Avancement")}</th></tr></thead><tbody>{stats.sports.map(s => <tr key={s.sport}><th scope="row"><span className="stats-sport-dot"/>{libelleSport(s.sport)}</th><td>{s.tournois}</td><td>{s.participations}</td><td><strong>{s.valides}</strong><span className="stats-table-muted"> / {s.matchs}</span></td><td><div className="stats-table-progress"><span style={{ width: `${s.matchs ? Math.round(s.valides / s.matchs * 100) : 0}%` }}/></div><small>{s.matchs ? Math.round(s.valides / s.matchs * 100) : 0} %</small></td></tr>)}</tbody></table></div>}
    </section>
    <section className="v2-card"><div className="stats-section-heading"><div><h2>{tr("Retours des participants")}</h2><p>{tr("Les avis re\u00E7us sur vos tournois de la p\u00E9riode.")}</p></div>{evaluations.length > 0 && <span className="stats-rating">{moyenne}<small> / 5</small></span>}</div>
      <div className="stats-reviews">{evaluations.map((a, i) => <article className="stats-review" key={`${a.tournoi_id}:${i}`}><div><strong>{retenus.find(t => t.id === a.tournoi_id)?.nom}</strong><span className="stats-review-score">{a.note} / 5</span></div><p>{a.commentaire || tr('Sans commentaire')}</p></article>)}</div>
      {!evaluations.length && <div className="stats-empty"><strong>{tr("Pas encore de retour")}</strong><p>{tr("Les avis des participants appara\u00EEtront ici apr\u00E8s vos tournois.")}</p></div>}
    </section>
  </div></main>;
}
