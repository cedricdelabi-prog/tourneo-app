"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import TourneoNav from '@/components/TourneoNav';
import { supabase } from '@/lib/supabase';
import { erreurInscriptions } from '@/lib/inscriptions';
import { classementTournoi, tournoiEstTermine, pointsPalmares } from '@/lib/resultats';
import { normaliserOptionsV2 } from '@/lib/options-v2';
import { planifierMatchs } from '@/lib/planning';
import type { Equipe, Match } from '@/types';
import type { OptionsV2 } from '@/lib/options-v2';
type Tournoi = { id: string; nom: string; sport: string; donnees: { equipes?: Equipe[]; matchs?: Match[]; formatTournoi?: string; optionsV2?: OptionsV2; matchsValides?: number[] } };
type Evenement = { id: string; nom: string };
export default function Evenements() {
  const [evenements, setEvenements] = useState<Evenement[]>([]), [tournois, setTournois] = useState<Tournoi[]>([]), [liens, setLiens] = useState<{ evenement_id: string; tournoi_id: string }[]>([]);
  const [selection, setSelection] = useState(''), [nom, setNom] = useState(''), [user, setUser] = useState(''), [erreur, setErreur] = useState(''), [occupe, setOccupe] = useState(false);
  const [chargement, setChargement] = useState(true), [message, setMessage] = useState('');
  const operation = useRef(false);
  async function charger() {
    setChargement(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { window.location.href = '/login'; return; }
      setUser(data.user.id);
      const [ev, ts, ls] = await Promise.all([
        supabase.from('tourneo_evenements').select('id,nom').eq('user_id', data.user.id).order('created_at', { ascending: false }),
        supabase.from('tournois').select('id,nom,sport,donnees').eq('user_id', data.user.id),
        supabase.from('tourneo_evenement_tournois').select('evenement_id,tournoi_id'),
      ]);
      if (ev.error || ts.error || ls.error) throw ev.error || ts.error || ls.error;
      setEvenements(ev.data || []); setTournois(ts.data || []); setLiens(ls.data || []);
      setSelection(v => ev.data?.some(e => e.id === v) ? v : ev.data?.[0]?.id || ''); setErreur('');
    } catch (error) { setErreur(erreurInscriptions(error instanceof Error ? error.message : 'Chargement impossible. Vérifiez votre connexion et réessayez.')); }
    finally { setChargement(false); }
  }
  useEffect(() => { void charger(); }, []);
  async function creer(e: React.FormEvent) {
    e.preventDefault();
    if (operation.current || !user || !nom.trim()) return;
    operation.current = true; setOccupe(true); setMessage('Création de l’événement…');
    try {
      const r = await supabase.from('tourneo_evenements').insert({ nom: nom.trim(), user_id: user }).select('id').single();
      if (r.error || !r.data) throw r.error || new Error('Création impossible.');
      setNom(''); await charger(); setSelection(r.data.id); setMessage('Événement créé. Ajoutez ses tournois au programme.');
    } catch { setErreur('Création impossible. Vérifiez votre connexion avant de réessayer.'); setMessage(''); }
    finally { operation.current = false; setOccupe(false); }
  }
  async function lier(tournoi: string, actif: boolean) {
    if (operation.current || !selection) return;
    operation.current = true; setOccupe(true); setMessage('Mise à jour du programme…');
    try {
      const r = actif ? await supabase.from('tourneo_evenement_tournois').insert({ evenement_id: selection, tournoi_id: tournoi }) : await supabase.from('tourneo_evenement_tournois').delete().eq('evenement_id', selection).eq('tournoi_id', tournoi);
      if (r.error) throw r.error;
      await charger(); setMessage('Programme enregistré.');
    } catch { setErreur('Programme non modifié. Vérifiez votre connexion et réessayez.'); setMessage(''); }
    finally { operation.current = false; setOccupe(false); }
  }
  const retenus = useMemo(() => tournois.filter(t => liens.some(l => l.evenement_id === selection && l.tournoi_id === t.id)), [tournois, liens, selection]);
  const programme = useMemo(() => retenus.map(t => {
    const d = t.donnees || {}, options = normaliserOptionsV2(d.optionsV2);
    const planning = planifierMatchs(d.matchs || [], options);
    return { ...t, depart: options.depart, terrains: options.terrains, duree: planning.reduce((fin, c) => Math.max(fin, c.fin), 0), participants: d.equipes?.length || 0, matchs: d.matchs?.length || 0, termine: tournoiEstTermine(d.formatTournoi || 'complet', d.equipes || [], d.matchs || [], options, d.matchsValides) };
  }).sort((a, b) => (a.depart ? Date.parse(a.depart) : Infinity) - (b.depart ? Date.parse(b.depart) : Infinity) || a.nom.localeCompare(b.nom)), [retenus]);
  const classement = useMemo(() => {
    const scores = new Map<string, { nom: string; points: number; participations: number; victoires: number }>();
    for (const t of retenus) {
      const d = t.donnees || {}, equipes = d.equipes || [], matchs = d.matchs || [], format = d.formatTournoi || 'complet';
      if (!tournoiEstTermine(format, equipes, matchs, d.optionsV2, d.matchsValides)) continue;
      classementTournoi(format, equipes, matchs, d.optionsV2).forEach((l, i) => {
        const cle = l.equipe.profilId ?? l.equipe.id;
        const ligne = scores.get(cle) || { nom: l.equipe.nom, points: 0, participations: 0, victoires: 0 };
        ligne.points += pointsPalmares(i + 1); ligne.participations++; if (i === 0) ligne.victoires++; scores.set(cle, ligne);
      });
    }
    return [...scores].map(([id, l]) => ({ id, ...l })).sort((a, b) => b.points - a.points || b.victoires - a.victoires || a.nom.localeCompare(b.nom));
  }, [retenus]);
  const evenement = evenements.find(e => e.id === selection);
  return <main className="v2-page"><div className="v2-shell"><TourneoNav/>
    <section className="v2-card v2-event-editor"><h1>Événements et animations</h1><p>Regroupez plusieurs tournois pour suivre un programme de camping, une journée de club ou une compétition sur plusieurs disciplines.</p>
      {erreur && <p role="alert" className="v2-alert">{erreur}<button type="button" disabled={occupe || chargement} onClick={() => void charger()}>Réessayer le chargement</button></p>}
      <form className="v2-form" onSubmit={creer}><label>Nouvel événement<input maxLength={100} required value={nom} disabled={occupe || chargement} onChange={e => setNom(e.target.value)}/></label><button disabled={occupe || chargement || !user || !nom.trim()}>{occupe ? 'Enregistrement…' : 'Créer l’événement'}</button></form>
      <label>Événement<select value={selection} disabled={occupe || chargement} onChange={e => { setSelection(e.target.value); setMessage(''); }}><option value="">Choisir…</option>{evenements.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}</select></label>
      {(chargement || message) && <p role="status">{chargement ? 'Chargement du programme…' : message}</p>}
    </section>
    {selection && <>
      <section className="v2-card v2-event-editor"><h2>Tournois de l’événement</h2>{tournois.map(t => <label key={t.id} className="v2-check"><input type="checkbox" disabled={occupe || chargement} checked={retenus.some(r => r.id === t.id)} onChange={e => void lier(t.id, e.target.checked)}/>{t.nom} · {t.sport}<a href={`/tournoi/${t.id}`}>Ouvrir</a></label>)}<p><a href="/tournoi/nouveau">Ajouter un nouveau tournoi au programme</a></p></section>
      <section className="v2-card"><h1>{evenement?.nom || 'Programme'}</h1><h2>Programme des animations</h2><p>Horaires et durées estimés selon le planning de chaque tournoi. Les horaires définitifs sont confirmés par l’organisateur.</p>
        <button type="button" disabled={!programme.length} onClick={() => window.print()}>Imprimer le programme et le classement</button>
        {!programme.length && <p>Ajoutez un tournoi pour composer le programme.</p>}
        {programme.map(t => <article key={t.id} className="v2-entry"><h3>{t.nom} · {t.sport}</h3><p>{t.depart ? new Date(t.depart).toLocaleString('fr-FR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'Horaire à définir dans les réglages du tournoi'} · {t.duree ? `${t.duree} min estimées` : 'Durée à définir'} · {t.terrains} terrain(s)</p><p>{t.participants} participants · {t.matchs} rencontres · {t.termine ? 'Terminé' : t.matchs ? 'Rencontres générées' : 'En préparation'}</p></article>)}
      </section>
      <section className="v2-card"><h2>Classement cumulé</h2><p>Seuls les tournois terminés comptent. Les profils Tourneo conservent leur identité entre tournois. Barème : 100 points au premier, 70 au deuxième, 50 du troisième au quatrième, 30 du cinquième au huitième, puis 10.</p>{classement.map((l, i) => <p key={l.id}><strong>{i + 1}. {l.nom}</strong> · {l.points} points · {l.participations} tournoi(s) · {l.victoires} victoire(s)</p>)}{!classement.length && <p>Le classement apparaîtra après un premier tournoi terminé.</p>}</section>
    </>}
    <style>{`@media print { .v2-event-editor { display:none!important; } .v2-entry { break-inside:avoid; } }`}</style>
  </div></main>;
}
