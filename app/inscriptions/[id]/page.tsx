"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TourneoBrand from '@/components/TourneoBrand';
import { erreurInscriptions, STATUTS_INSCRIPTION, type Inscription } from '@/lib/inscriptions';
type Infos = { nom: string; sport: string; ouvert: boolean; capacite: number; echeance: string | null; places_restantes: number; validation_manuelle: boolean };
export default function InscriptionPublique() {
  const { id } = useParams<{ id: string }>();
  const [infos, setInfos] = useState<Infos | null>(null);
  const [inscription, setInscription] = useState<Inscription | null>(null);
  const [nom, setNom] = useState('');
  const [type, setType] = useState('individuel');
  const [joueurs, setJoueurs] = useState('');
  const [accord, setAccord] = useState(false);
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [jeton, setJeton] = useState('');
  async function charger(token: string) {
    const { data, error } = await supabase.rpc('tourneo_infos_inscriptions', { p_tournoi: id });
    if (error) { setErreur(erreurInscriptions(error.message)); return; }
    setInfos(data);
    const resultat = await supabase.rpc('tourneo_mon_inscription', { p_tournoi: id, p_jeton: token, p_annuler: false });
    if (resultat.error) setErreur(erreurInscriptions(resultat.error.message));
    else setInscription(resultat.data);
  }
  useEffect(() => {
    try {
      const cle = `tourneo-inscription:${id}`;
      const token = localStorage.getItem(cle) || crypto.randomUUID();
      localStorage.setItem(cle, token); setJeton(token); void charger(token);
      const intervalle = window.setInterval(() => void charger(token), 30000);
      return () => window.clearInterval(intervalle);
    } catch { setErreur('Autorisez le stockage local pour conserver votre inscription sur cet appareil.'); }
  }, [id]);
  async function envoyer(event: React.FormEvent) {
    event.preventDefault(); if (occupe || !jeton || !accord) return;
    setOccupe(true); setErreur('');
    try {
      const { data, error } = await supabase.rpc('tourneo_inscrire', { p_tournoi: id, p_jeton: jeton, p_nom: nom.trim(), p_type: type, p_joueurs: type === 'equipe' ? joueurs.split('\n').map(n => n.trim()).filter(Boolean) : [] });
      if (error) setErreur(erreurInscriptions(error.message)); else { setInscription(data); await charger(jeton); }
    } catch { setErreur('Connexion interrompue. Réessayez : votre demande ne sera pas envoyée deux fois.'); }
    finally { setOccupe(false); }
  }
  async function annuler() {
    if (!confirm('Annuler cette inscription ?')) return;
    setOccupe(true);
    const { data, error } = await supabase.rpc('tourneo_mon_inscription', { p_tournoi: id, p_jeton: jeton, p_annuler: true });
    if (error) setErreur(erreurInscriptions(error.message)); else setInscription(data);
    setOccupe(false);
  }
  return <main className="v2-page"><div className="v2-shell"><TourneoBrand /><section className="v2-card">
    <p className="v2-eyebrow">Inscription au tournoi</p><h1>{infos?.nom || 'Rejoindre le tournoi'}</h1>
    {erreur && <p role="alert" className="v2-alert">{erreur}</p>}
    {inscription ? <><h2>{STATUTS_INSCRIPTION[inscription.statut]}</h2><p>{inscription.nom}</p><p>{inscription.statut === 'en_attente' ? 'L’organisateur pourra vous proposer une place si elle se libère.' : inscription.statut === 'a_valider' ? 'L’organisateur doit encore valider votre demande.' : inscription.statut === 'accepte' ? 'Votre place est réservée. Présentez-vous à l’organisateur pour le pointage.' : 'Contactez l’organisateur pour toute nouvelle demande.'}</p>
      {inscription.present && <p>Présence confirmée</p>}
      <button disabled={occupe} onClick={() => void charger(jeton)}>Actualiser le statut</button>
      {infos?.ouvert && !['annule','refuse'].includes(inscription.statut) && <button disabled={occupe} onClick={annuler}>Annuler mon inscription</button>}
      <p>Revenez sur cette page depuis ce même appareil pour consulter votre statut.</p>
    </> : infos?.ouvert ? <form onSubmit={envoyer} className="v2-form">
      <p>{infos.places_restantes > 0 ? `${infos.places_restantes} place(s) disponible(s)` : 'Complet : vous pouvez rejoindre la liste d’attente.'}</p>
      {infos.echeance && <p>Clôture : {new Date(infos.echeance).toLocaleString('fr-FR')}</p>}
      <label>Participation<select value={type} onChange={e=>setType(e.target.value)}><option value="individuel">Individuelle</option><option value="equipe">En équipe</option></select></label>
      <label>{type === 'equipe' ? 'Nom de l’équipe' : 'Nom ou pseudo'}<input required maxLength={100} value={nom} onChange={e=>setNom(e.target.value)} /></label>
      {type === 'equipe' && <label>Joueurs (un pseudo par ligne, 12 maximum)<textarea rows={5} value={joueurs} onChange={e=>setJoueurs(e.target.value)} maxLength={1212}/></label>}
      <label className="v2-check"><input required type="checkbox" checked={accord} onChange={e=>setAccord(e.target.checked)}/>J’accepte que mon nom ou pseudo et ceux de mon équipe figurent dans les participants et résultats publics. Je dispose de leur accord.</label>
      <p>Utilisez des pseudos pour les mineurs. Aucun e-mail ni numéro de téléphone n’est demandé.</p>
      <button disabled={occupe || !jeton || !accord} type="submit">{occupe ? 'Envoi…' : infos.places_restantes ? 'Demander mon inscription' : 'Rejoindre la liste d’attente'}</button>
    </form> : infos && <p>Les inscriptions sont fermées. Contactez l’organisateur.</p>}
    <p><a href={`/partage/${id}`}>Voir le tournoi et les résultats</a></p>
  </section></div></main>;
}
