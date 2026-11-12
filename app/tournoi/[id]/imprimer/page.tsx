"use client";
import TourneoRetour from '@/components/TourneoRetour';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';
import { nomParticipant } from '@/lib/rotation';
import { calculerClassement } from '@/lib/tournoi';
import { classementTournoi } from '@/lib/resultats';
import { normaliserOptionsV2 } from '@/lib/options-v2';
import { planifierMatchs, heureCreneau } from '@/lib/planning';
import type { Equipe, Match } from '@/types';

type Contenu = { nomTournoi: string; equipes: Equipe[]; matchs: Match[]; formatTournoi: string; poules?: { id: string; nom: string; equipes: Equipe[] }[]; optionsV2?: Parameters<typeof normaliserOptionsV2>[0] };
const rubriques = [['participants', 'Participants et pointage'], ['planning', 'Planning et feuilles de scores'], ['classement', 'Classement'], ['poules', 'Poules et classements par poule'], ['tableaux', 'Tableaux par tour et branche']] as const;
export default function FeuilleTournoi() {
  const { id } = useParams<{ id: string }>();
  const [contenu, setContenu] = useState<Contenu | null>(null);
  const [vierge, setVierge] = useState(false), [erreur, setErreur] = useState(''), [lien, setLien] = useState('');
  const [papier, setPapier] = useState<'A4' | 'A3'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [couleur, setCouleur] = useState(false), [grandesCases, setGrandesCases] = useState(false);
  const [logo, setLogo] = useState(true), [qr, setQr] = useState(true);
  const [sections, setSections] = useState({ participants: false, planning: true, classement: true, poules: false, tableaux: false });
  const [tour, setTour] = useState("tous"), [qrMatchs, setQrMatchs] = useState(false);
  const auMoinsUneSection = Object.values(sections).some(Boolean);
  useEffect(() => {
    let actif = true;
    setContenu(null); setErreur('');
    setLien(`${window.location.origin}/partage/${id}`);
    async function charger() {
      try {
        try {
          const brut = localStorage.getItem(`tourneo-v04:${id}`);
          if (brut) {
            const d = JSON.parse(brut);
            if (d.tournoiId === id && Array.isArray(d.equipes) && Array.isArray(d.matchs)) {
              if (actif) setContenu(d);
              return;
            }
          }
        } catch { /* A damaged/unavailable cache must not prevent the cloud fallback. */ }
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) throw new Error('Ouvrez le tournoi depuis votre compte avant d’imprimer.');
        const { data, error } = await supabase.from('tournois').select('nom,donnees').eq('id', id).eq('user_id', auth.user.id).single();
        if (error || !data) throw new Error('Impossible de charger le tournoi. Vérifiez votre connexion et réessayez.');
        if (actif) setContenu({ ...data.donnees, nomTournoi: data.nom });
      } catch (error) {
        if (actif) setErreur(error instanceof Error ? error.message : 'Chargement impossible. Réessayez.');
      }
    }
    void charger();
    return () => { actif = false; };
  }, [id]);
  const options = normaliserOptionsV2(contenu?.optionsV2);
  const equipes = contenu?.equipes || [], matchs = contenu?.matchs || [];
  const planning = planifierMatchs(matchs, options);
  const classement = classementTournoi(contenu?.formatTournoi || 'complet', equipes, matchs, options);
  const planningRetenu = planning.filter(c => tour === "tous" || String(c.journee) === tour);
  const qrsActifs = qrMatchs && planningRetenu.length <= 128;
  const matchsParId = new Map(matchs.map(m => [m.id, m]));
  const nom = (participant: string) => nomParticipant(participant, equipes);
  return <main className={`v2-paper${couleur ? ' v2-paper-color' : ''}${grandesCases ? ' v2-paper-large' : ''}`}>
    <div className="v2-paper-actions"><TourneoRetour href={`/tournoi/${id}`}>Retour au tournoi</TourneoRetour>
      <button type="button" onClick={() => window.print()} disabled={!contenu || !auMoinsUneSection}>Imprimer / Enregistrer en PDF</button>
    </div>
    <fieldset className="v2-print-settings"><legend>Personnaliser l’impression</legend>
      <label>Format<select value={papier} onChange={e => setPapier(e.target.value === 'A3' ? 'A3' : 'A4')}><option>A4</option><option>A3</option></select></label>
      <label>Orientation<select value={orientation} onChange={e => setOrientation(e.target.value === 'landscape' ? 'landscape' : 'portrait')}><option value="portrait">Portrait</option><option value="landscape">Paysage</option></select></label>
      <label>Tour à imprimer<select value={tour} onChange={e => setTour(e.target.value)}><option value="tous">Tous les tours</option>{[...new Set(matchs.map(m => m.journee))].sort((a,b) => a-b).map(j => <option key={j} value={j}>Tour {j}</option>)}</select></label>
      {rubriques.map(([cle, libelle]) => <label key={cle}><input type="checkbox" checked={sections[cle]} onChange={e => setSections(s => ({ ...s, [cle]: e.target.checked }))}/>{libelle}</label>)}
      <label><input type="checkbox" checked={vierge} onChange={e => setVierge(e.target.checked)}/>Scores vierges pour la saisie papier</label>
      <label><input type="checkbox" checked={grandesCases} onChange={e => setGrandesCases(e.target.checked)}/>Grandes cases pour écrire</label>
      <label><input type="checkbox" checked={couleur} onChange={e => setCouleur(e.target.checked)}/>Couleur</label>
      <label><input type="checkbox" checked={logo} onChange={e => setLogo(e.target.checked)}/>Logo Tourneo</label>
      <label><input type="checkbox" checked={qr} onChange={e => setQr(e.target.checked)}/>QR des résultats en direct</label>
      <label><input type="checkbox" checked={qrMatchs} onChange={e => setQrMatchs(e.target.checked)}/>QR par match (128 rencontres maximum par impression)</label>
      {qrMatchs && !qrsActifs && <p role="status">Choisissez un tour pour imprimer les QR de 128 rencontres maximum.</p>}
      <p>Vérifiez aussi le format et l’orientation dans la fenêtre d’impression de votre appareil.</p>
      {!auMoinsUneSection && <p role="status">Sélectionnez au moins une rubrique à imprimer.</p>}
    </fieldset>
    <header className="v2-paper-heading">{logo && <img src="/tourneo-officiel.png" alt="Tourneo" width={72} height={72}/>}<h1>{contenu?.nomTournoi || 'Tourneo'}</h1></header>
    {erreur && <p role="alert">{erreur}</p>}
    {!contenu && !erreur && <p role="status">Préparation des feuilles…</p>}
    {contenu && <>
      <p>{equipes.length} participants · {matchs.length} matchs · {options.terrains} terrain(s)</p>
      {qr && lien && <div className="v2-paper-qr"><QRCodeSVG value={lien} size={100} marginSize={4}/><small>Résultats en direct : {lien}</small></div>}
      {sections.participants && <section><h2>Participants et pointage</h2><div className="v2-paper-scroll"><table><thead><tr><th>#</th><th>Participant</th><th>Présence</th><th>Notes</th></tr></thead><tbody>{equipes.map((e, i) => <tr key={e.id}><td>{i + 1}</td><td>{e.nom}</td><td>☐</td><td>________________</td></tr>)}</tbody></table></div></section>}
      {sections.planning && <section><h2>Planning et feuilles de match</h2>{!matchs.length ? <p>Les rencontres ne sont pas encore générées.</p> : <div className="v2-paper-scroll"><table><thead><tr><th>Tour</th><th>Heure estimée</th><th>Terrain</th><th>Participant 1</th><th>Score</th><th>Participant 2</th><th>Visa</th>{qrsActifs && <th>QR match</th>}</tr></thead><tbody>{planningRetenu.map(c => {
        const m = matchsParId.get(c.matchId)!;
        return <tr key={m.id}><td>{m.journee}</td><td>{heureCreneau(c.debut, options.depart)}</td><td>{c.terrain}</td><td>{nom(m.equipe1Id)}</td><td>{vierge ? '___ – ___' : `${m.score1 || '___'} – ${m.score2 || '___'}`}</td><td>{nom(m.equipe2Id)}</td><td>________</td>{qrsActifs && <td><QRCodeSVG value={`${lien}#match-${m.id}`} size={64} marginSize={2}/><small>Match {m.id}</small></td>}</tr>;
      })}</tbody></table></div>}</section>}
      {sections.poules && <section><h2>Poules et classements par poule</h2>{!(contenu.poules?.length) && <p>Aucune poule n’est définie pour ce tournoi.</p>}{contenu.poules?.map(poule => {
        const ids = new Set(poule.equipes.map(e => e.id));
        const lignes = calculerClassement(poule.equipes, matchs.filter(m => ids.has(m.equipe1Id) && ids.has(m.equipe2Id)), options);
        return <div key={poule.id}><h3>{poule.nom}</h3><div className="v2-paper-scroll"><table><thead><tr><th>#</th><th>Participant</th><th>Matchs</th><th>Points</th></tr></thead><tbody>{lignes.map((l,i) => <tr key={l.equipe.id}><td>{i+1}</td><td>{l.equipe.nom}</td><td>{l.mj}</td><td>{l.pts}</td></tr>)}</tbody></table></div></div>;
      })}</section>}
      {sections.tableaux && <section><h2>Tableaux par tour et branche</h2>{[...new Set(planningRetenu.map(c => c.journee))].map(journee => <div key={journee}><h3>Tour {journee}</h3><div className="v2-paper-scroll"><table><thead><tr><th>Branche</th><th>Participant 1</th><th>Score</th><th>Participant 2</th></tr></thead><tbody>{planningRetenu.filter(c => c.journee === journee).map(c => {
        const m = matchsParId.get(c.matchId)!;
        const branche = m.branche === 'repechage' ? 'Repêchage' : m.branche === 'consolante' ? 'Consolante' : m.branche === 'finale' ? 'Finale' : 'Principale';
        return <tr key={m.id}><td>{branche}</td><td>{nom(m.equipe1Id)}</td><td>{vierge ? '___ – ___' : `${m.score1 || '___'} – ${m.score2 || '___'}`}</td><td>{nom(m.equipe2Id)}</td></tr>;
      })}</tbody></table></div></div>)}</section>}
      {sections.classement && <section><h2>Classement provisoire / final selon l’avancement</h2><div className="v2-paper-scroll"><table><thead><tr><th>#</th><th>Participant</th><th>Matchs</th><th>Points</th></tr></thead><tbody>{classement.map((l, i) => <tr key={l.equipe.id}><td>{i + 1}</td><td>{l.equipe.nom}</td><td>{l.mj}</td><td>{l.pts}</td></tr>)}</tbody></table></div></section>}
      <p>Les décisions de l’organisateur et de l’arbitre prévalent. Reportez les résultats papier dans Tourneo au retour de la connexion.</p>
    </>}
    <style>{`
      @page { size: ${papier} ${orientation}; margin: 12mm; }
      .v2-print-settings { display:flex; flex-wrap:wrap; gap:16px; align-items:center; padding:18px; border:1px solid #94a3b8; border-radius:12px; margin:20px 0; }
      .v2-print-settings legend { font-weight:700; padding:0 8px; }
      .v2-print-settings label { display:flex; gap:8px; align-items:center; }
      .v2-print-settings select { border:1px solid #64748b; border-radius:6px; padding:6px; }
      .v2-print-settings p { flex-basis:100%; margin:0; }
      .v2-paper-heading { display:flex; align-items:center; gap:18px; }
      .v2-paper-heading h1 { overflow-wrap:anywhere; }
      .v2-paper-scroll { overflow-x:auto; }
      .v2-paper h3 { font-size:16px; font-weight:700; margin:18px 0 8px; }
      .v2-paper td svg { display:block; margin:auto; max-width:100%; height:auto; }
      .v2-paper td { overflow-wrap:anywhere; }
      .v2-paper-large td { padding:18px 10px; min-height:40px; }
      .v2-paper-color th { color:#075985; background:#e0f2fe; }
      @media print {
        .v2-print-settings { display:none!important; }
        .v2-paper-scroll { overflow:visible; }
        .v2-paper table { table-layout:fixed; }
        .v2-paper:not(.v2-paper-color) { filter:grayscale(1); }
        .v2-paper-color { print-color-adjust:exact; -webkit-print-color-adjust:exact; }
        .v2-paper h2,.v2-paper-heading { break-after:avoid; }
        .v2-paper-qr { break-inside:avoid; }
        .v2-paper-large td { padding:18px 6px; }
      }
    `}</style>
  </main>;
}
