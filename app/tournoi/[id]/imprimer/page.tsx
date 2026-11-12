"use client";
import {tr,trModele,useLangue} from "@/lib/langue";
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
type Contenu = {
    nomTournoi: string;
    equipes: Equipe[];
    matchs: Match[];
    formatTournoi: string;
    poules?: {
        id: string;
        nom: string;
        equipes: Equipe[];
    }[];
    optionsV2?: Parameters<typeof normaliserOptionsV2>[0];
};
const rubriques = [['participants', 'Participants et pointage'], ['planning', 'Planning et feuilles de scores'], ['classement', 'Classement'], ['poules', 'Poules et classements par poule'], ['tableaux', 'Tableaux par tour et branche']] as const;
export default function FeuilleTournoi() {
    useLangue();
    const { id } = useParams<{
        id: string;
    }>();
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
        setContenu(null);
        setErreur('');
        setLien(`${window.location.origin}/partage/${id}`);
        async function charger() {
            try {
                try {
                    const brut = localStorage.getItem(`tourneo-v04:${id}`);
                    if (brut) {
                        const d = JSON.parse(brut);
                        if (d.tournoiId === id && Array.isArray(d.equipes) && Array.isArray(d.matchs)) {
                            if (actif)
                                setContenu(d);
                            return;
                        }
                    }
                }
                catch { /* A damaged/unavailable cache must not prevent the cloud fallback. */ }
                const { data: auth } = await supabase.auth.getUser();
                if (!auth.user)
                    throw new Error('Ouvrez le tournoi depuis votre compte avant d’imprimer.');
                const { data, error } = await supabase.from('tournois').select('nom,donnees').eq('id', id).eq('user_id', auth.user.id).single();
                if (error || !data)
                    throw new Error('Impossible de charger le tournoi. Vérifiez votre connexion et réessayez.');
                if (actif)
                    setContenu({ ...data.donnees, nomTournoi: data.nom });
            }
            catch (error) {
                if (actif)
                    setErreur(error instanceof Error ? error.message : 'Chargement impossible. Réessayez.');
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
    <div className="v2-paper-actions"><TourneoRetour href={`/tournoi/${id}`}>{tr("Retour au tournoi")}</TourneoRetour>
      <button type="button" onClick={() => window.print()} disabled={!contenu || !auMoinsUneSection}>{tr("Imprimer / Enregistrer en PDF")}</button>
    </div>
    <fieldset className="v2-print-settings"><legend>{tr("Personnaliser l\u2019impression")}</legend>
      <label>{tr("Format")}<select value={papier} onChange={e => setPapier(e.target.value === 'A3' ? 'A3' : 'A4')}><option>A4</option><option>A3</option></select></label>
      <label>{tr("Orientation")}<select value={orientation} onChange={e => setOrientation(e.target.value === 'landscape' ? 'landscape' : 'portrait')}><option value="portrait">{tr("Portrait")}</option><option value="landscape">{tr("Paysage")}</option></select></label>
      <label>{tr("Tour \u00E0 imprimer")}<select value={tour} onChange={e => setTour(e.target.value)}><option value="tous">{tr("Tous les tours")}</option>{[...new Set(matchs.map(m => m.journee))].sort((a, b) => a - b).map(j => <option key={j} value={j}>{tr("Tour ")}{j}</option>)}</select></label>
      {rubriques.map(([cle, libelle]) => <label key={cle}><input type="checkbox" checked={sections[cle]} onChange={e => setSections(s => ({ ...s, [cle]: e.target.checked }))}/>{tr(libelle)}</label>)}
      <label><input type="checkbox" checked={vierge} onChange={e => setVierge(e.target.checked)}/>{tr("Scores vierges pour la saisie papier")}</label>
      <label><input type="checkbox" checked={grandesCases} onChange={e => setGrandesCases(e.target.checked)}/>{tr("Grandes cases pour \u00E9crire")}</label>
      <label><input type="checkbox" checked={couleur} onChange={e => setCouleur(e.target.checked)}/>{tr("Couleur")}</label>
      <label><input type="checkbox" checked={logo} onChange={e => setLogo(e.target.checked)}/>{tr("Logo Tourneo")}</label>
      <label><input type="checkbox" checked={qr} onChange={e => setQr(e.target.checked)}/>{tr("QR des r\u00E9sultats en direct")}</label>
      <label><input type="checkbox" checked={qrMatchs} onChange={e => setQrMatchs(e.target.checked)}/>{tr("QR par match (128 rencontres maximum par impression)")}</label>
      {qrMatchs && !qrsActifs && <p role="status">{tr("Choisissez un tour pour imprimer les QR de 128 rencontres maximum.")}</p>}
      <p>{tr("V\u00E9rifiez aussi le format et l\u2019orientation dans la fen\u00EAtre d\u2019impression de votre appareil.")}</p>
      {!auMoinsUneSection && <p role="status">{tr("S\u00E9lectionnez au moins une rubrique \u00E0 imprimer.")}</p>}
    </fieldset>
    <header className="v2-paper-heading">{logo && <img src="/tourneo-officiel.png" alt={tr("Tourneo")} width={72} height={72}/>}<h1>{contenu?.nomTournoi || tr('Tourneo')}</h1></header>
    {tr(erreur) && <p role="alert">{tr(erreur)}</p>}
    {!contenu && !erreur && <p role="status">{tr("Pr\u00E9paration des feuilles\u2026")}</p>}
    {contenu && <>
      <p>{equipes.length}{tr(" participants \u00B7 ")}{matchs.length}{tr(" matchs \u00B7 ")}{options.terrains}{tr(" terrain(s)")}</p>
      {qr && lien && <div className="v2-paper-qr"><QRCodeSVG value={lien} size={100} marginSize={4}/><small>{tr("R\u00E9sultats en direct : ")}{lien}</small></div>}
      {sections.participants && <section><h2>{tr("Participants et pointage")}</h2><div className="v2-paper-scroll"><table><thead><tr><th>#</th><th>{tr("Participant")}</th><th>{tr("Pr\u00E9sence")}</th><th>{tr("Notes")}</th></tr></thead><tbody>{equipes.map((e, i) => <tr key={e.id}><td>{i + 1}</td><td>{e.nom}</td><td>☐</td><td>________________</td></tr>)}</tbody></table></div></section>}
      {sections.planning && <section><h2>{tr("Planning et feuilles de match")}</h2>{!matchs.length ? <p>{tr("Les rencontres ne sont pas encore g\u00E9n\u00E9r\u00E9es.")}</p> : <div className="v2-paper-scroll"><table><thead><tr><th>{tr("Tour")}</th><th>{tr("Heure estim\u00E9e")}</th><th>{tr("Terrain")}</th><th>{tr("Participant 1")}</th><th>{tr("Score")}</th><th>{tr("Participant 2")}</th><th>{tr("Visa")}</th>{qrsActifs && <th>{tr("QR match")}</th>}</tr></thead><tbody>{planningRetenu.map(c => {
                        const m = matchsParId.get(c.matchId)!;
                        return <tr key={m.id}><td>{m.journee}</td><td>{heureCreneau(c.debut, options.depart)}</td><td>{c.terrain}</td><td>{nom(m.equipe1Id)}</td><td>{vierge ? '___ – ___' : trModele("{0} \u2013 {1}", m.score1 || '___', m.score2 || '___')}</td><td>{nom(m.equipe2Id)}</td><td>________</td>{qrsActifs && <td><QRCodeSVG value={`${lien}#match-${m.id}`} size={64} marginSize={2}/><small>{tr("Match ")}{m.id}</small></td>}</tr>;
                    })}</tbody></table></div>}</section>}
      {sections.poules && <section><h2>{tr("Poules et classements par poule")}</h2>{!(contenu.poules?.length) && <p>{tr("Aucune poule n\u2019est d\u00E9finie pour ce tournoi.")}</p>}{contenu.poules?.map(poule => {
                    const ids = new Set(poule.equipes.map(e => e.id));
                    const lignes = calculerClassement(poule.equipes, matchs.filter(m => ids.has(m.equipe1Id) && ids.has(m.equipe2Id)), options);
                    return <div key={poule.id}><h3>{poule.nom}</h3><div className="v2-paper-scroll"><table><thead><tr><th>#</th><th>{tr("Participant")}</th><th>{tr("Matchs")}</th><th>{tr("Points")}</th></tr></thead><tbody>{lignes.map((l, i) => <tr key={l.equipe.id}><td>{i + 1}</td><td>{l.equipe.nom}</td><td>{l.mj}</td><td>{l.pts}</td></tr>)}</tbody></table></div></div>;
                })}</section>}
      {sections.tableaux && <section><h2>{tr("Tableaux par tour et branche")}</h2>{[...new Set(planningRetenu.map(c => c.journee))].map(journee => <div key={journee}><h3>{tr("Tour ")}{journee}</h3><div className="v2-paper-scroll"><table><thead><tr><th>{tr("Branche")}</th><th>{tr("Participant 1")}</th><th>{tr("Score")}</th><th>{tr("Participant 2")}</th></tr></thead><tbody>{planningRetenu.filter(c => c.journee === journee).map(c => {
                        const m = matchsParId.get(c.matchId)!;
                        const branche = m.branche === 'repechage' ? 'Repêchage' : m.branche === 'consolante' ? 'Consolante' : m.branche === 'finale' ? 'Finale' : 'Principale';
                        return <tr key={m.id}><td>{branche}</td><td>{nom(m.equipe1Id)}</td><td>{vierge ? '___ – ___' : trModele("{0} \u2013 {1}", m.score1 || '___', m.score2 || '___')}</td><td>{nom(m.equipe2Id)}</td></tr>;
                    })}</tbody></table></div></div>)}</section>}
      {sections.classement && <section><h2>{tr("Classement provisoire / final selon l\u2019avancement")}</h2><div className="v2-paper-scroll"><table><thead><tr><th>#</th><th>{tr("Participant")}</th><th>{tr("Matchs")}</th><th>{tr("Points")}</th></tr></thead><tbody>{classement.map((l, i) => <tr key={l.equipe.id}><td>{i + 1}</td><td>{l.equipe.nom}</td><td>{l.mj}</td><td>{l.pts}</td></tr>)}</tbody></table></div></section>}
      <p>{tr("Les d\u00E9cisions de l\u2019organisateur et de l\u2019arbitre pr\u00E9valent. Reportez les r\u00E9sultats papier dans Tourneo au retour de la connexion.")}</p>
    </>}
    <style>{trModele("\n      @page { size: {0} {1}; margin: 12mm; }\n      .v2-print-settings { display:flex; flex-wrap:wrap; gap:16px; align-items:center; padding:18px; border:1px solid #94a3b8; border-radius:12px; margin:20px 0; }\n      .v2-print-settings legend { font-weight:700; padding:0 8px; }\n      .v2-print-settings label { display:flex; gap:8px; align-items:center; }\n      .v2-print-settings select { border:1px solid #64748b; border-radius:6px; padding:6px; }\n      .v2-print-settings p { flex-basis:100%; margin:0; }\n      .v2-paper-heading { display:flex; align-items:center; gap:18px; }\n      .v2-paper-heading h1 { overflow-wrap:anywhere; }\n      .v2-paper-scroll { overflow-x:auto; }\n      .v2-paper h3 { font-size:16px; font-weight:700; margin:18px 0 8px; }\n      .v2-paper td svg { display:block; margin:auto; max-width:100%; height:auto; }\n      .v2-paper td { overflow-wrap:anywhere; }\n      .v2-paper-large td { padding:18px 10px; min-height:40px; }\n      .v2-paper-color th { color:#075985; background:#e0f2fe; }\n      @media print {\n        .v2-print-settings { display:none!important; }\n        .v2-paper-scroll { overflow:visible; }\n        .v2-paper table { table-layout:fixed; }\n        .v2-paper:not(.v2-paper-color) { filter:grayscale(1); }\n        .v2-paper-color { print-color-adjust:exact; -webkit-print-color-adjust:exact; }\n        .v2-paper h2,.v2-paper-heading { break-after:avoid; }\n        .v2-paper-qr { break-inside:avoid; }\n        .v2-paper-large td { padding:18px 6px; }\n      }\n    ", papier, orientation)}</style>
  </main>;
}
