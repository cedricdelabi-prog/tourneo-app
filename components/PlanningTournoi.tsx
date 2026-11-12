"use client";
import { Fragment, useEffect, useRef, useState } from 'react';
import type { Equipe, Match } from '@/types';
import type { OptionsV2 } from '@/lib/options-v2';
import { nomParticipant } from '@/lib/rotation';
import { planifierMatchs, heureCreneau } from '@/lib/planning';
import { reperesAppel } from '@/lib/reperes-appel';
import { supabase } from '@/lib/supabase';
export default function PlanningTournoi({ equipes, matchs, options, onChange }: { equipes: Equipe[]; matchs: Match[]; options: OptionsV2; onChange: (m: Match[]) => void }) {
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
    if (!a || !b || a.journee !== b.journee || id === cible) return;
    const tour = matchs.filter(m => m.journee === a.journee).sort((a, b) => (a.ordre ?? a.id) - (b.ordre ?? b.id));
    tour.splice(tour.findIndex(m => m.id === id), 1); tour.splice(tour.findIndex(m => m.id === cible), 0, a);
    const ordre = new Map(tour.map((m, i) => [m.id, i]));
    onChange(matchs.map(m => ordre.has(m.id) ? { ...m, ordre: ordre.get(m.id) } : m));
  }
  return <section className="v2-planning"><h2>Planning des terrains</h2><p>Estimation : {planning.reduce((fin,c) => Math.max(fin,c.fin),0)} minutes · {options.terrains} terrain(s). Déplacez les lignes au sein d’une même ronde, ou utilisez les flèches. Les temps de repos sont conservés.</p>
    <div className="tourneo-call-info"><strong>Appels et notifications</strong><p>Le bouton « Annonce sur place » prépare un texte à annoncer aux joueurs. Il n’envoie aucune notification sur leur téléphone.</p><p>Un profil lié ne garantit ni l’installation de l’application, ni l’activation des alertes, ni leur réception. Les joueurs peuvent activer leur suivi depuis le lien public.</p><button type="button" disabled={verificationEnCours} onClick={() => setRevisionProfils(v => v + 1)}>{verificationEnCours ? 'Vérification…' : 'Vérifier les profils liés'}</button></div>
    <div style={{ overflowX: 'auto' }}><table><thead><tr><th>Tour</th><th>Début estimé</th><th>Terrain</th><th>Rencontre / repères joueurs</th><th className="v2-no-print">Ordre / annonce</th></tr></thead><tbody>{planning.map((c, i) => {
      const m = parId.get(c.matchId)!; const avant = planning[i - 1], apres = planning[i + 1];
      const reperes = reperesAppel(m, equipes, profils);
      const texte = `Match sur le terrain ${c.terrain} : ${nom(m.equipe1Id)} contre ${nom(m.equipe2Id)}.`;
      return <Fragment key={m.id}><tr draggable onDragStart={() => setGlisse(m.id)} onDragEnd={() => setGlisse(null)} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (glisse !== null) deplacer(glisse, m.id); setGlisse(null); }}>
        <td>{m.journee}</td><td>{heureCreneau(c.debut, options.depart)}</td><td>{c.terrain}</td><td><strong>{nom(m.equipe1Id)} — {nom(m.equipe2Id)}</strong><div className="tourneo-player-markers">{reperes.map(r => <span key={r.id} className={`tourneo-player-marker is-${r.statut}`}>{r.nom} · {r.statut === 'profil' ? 'Profil lié' : r.statut === 'sur_place' ? 'Sans profil lié' : 'Profil non vérifié'}</span>)}</div><small className="tourneo-receipt-note">Réception d’alerte non vérifiée · prévenir sur place</small></td>
        <td className="v2-no-print"><div className="tourneo-planning-actions"><button type="button" aria-label="Avancer le match" disabled={!avant || avant.journee !== m.journee} onClick={() => deplacer(m.id, avant.matchId)}>↑</button><button type="button" aria-label="Reculer le match" disabled={!apres || apres.journee !== m.journee} onClick={() => deplacer(apres.matchId, m.id)}>↓</button><button type="button" aria-expanded={annonceId === m.id} aria-controls={annonceId === m.id ? `annonce-${m.id}` : undefined} onClick={e => { boutonAnnonce.current = e.currentTarget; setAnnonceId(annonceId === m.id ? null : m.id); setCopie(''); }}>Annonce sur place</button></div></td>
      </tr>{annonceId === m.id && <tr className="v2-no-print"><td colSpan={5}><div id={`annonce-${m.id}`} ref={panneau} tabIndex={-1} className="tourneo-announcement"><strong>Annonce à faire sur place</strong><p>{texte}</p><p className="tourneo-announcement-warning">Aucune notification envoyée. Prévenez les participants sur place, y compris ceux qui ont un profil lié.</p><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(texte); setCopie('Texte copié. Aucune notification envoyée.'); } catch { setCopie('Copie indisponible : sélectionnez le texte pour le copier.'); } }}>Copier l’annonce</button><button type="button" onClick={() => { setAnnonceId(null); boutonAnnonce.current?.focus(); }}>Fermer</button>{copie && <p role="status">{copie}</p>}</div></td></tr>}</Fragment>;
    })}</tbody></table></div>
    <p>Les horaires réels dépendent de la durée des rencontres. Les repères de profil ne sont pas des confirmations de réception.</p></section>;
}
