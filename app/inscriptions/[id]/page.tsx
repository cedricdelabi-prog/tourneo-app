"use client";
import {tr,trModele,useLangue,localeFormat} from "@/lib/langue";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TourneoBrand from '@/components/TourneoBrand';
import { erreurInscriptions, STATUTS_INSCRIPTION, type Inscription } from '@/lib/inscriptions';
type Infos = {
    nom: string;
    sport: string;
    ouvert: boolean;
    capacite: number;
    echeance: string | null;
    places_restantes: number;
    validation_manuelle: boolean;
};
export default function InscriptionPublique() {
    useLangue();
    const { id } = useParams<{
        id: string;
    }>();
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
        if (error) {
            setErreur(erreurInscriptions(error.message));
            return;
        }
        setInfos(data);
        const resultat = await supabase.rpc('tourneo_mon_inscription', { p_tournoi: id, p_jeton: token, p_annuler: false });
        if (resultat.error)
            setErreur(erreurInscriptions(resultat.error.message));
        else
            setInscription(resultat.data);
    }
    useEffect(() => {
        try {
            const cle = `tourneo-inscription:${id}`;
            const token = localStorage.getItem(cle) || crypto.randomUUID();
            localStorage.setItem(cle, token);
            setJeton(token);
            void charger(token);
            const intervalle = window.setInterval(() => void charger(token), 30000);
            return () => window.clearInterval(intervalle);
        }
        catch {
            setErreur('Autorisez le stockage local pour conserver votre inscription sur cet appareil.');
        }
    }, [id]);
    async function envoyer(event: React.FormEvent) {
        event.preventDefault();
        if (occupe || !jeton || !accord)
            return;
        setOccupe(true);
        setErreur('');
        try {
            const { data, error } = await supabase.rpc('tourneo_inscrire', { p_tournoi: id, p_jeton: jeton, p_nom: nom.trim(), p_type: type, p_joueurs: type === 'equipe' ? joueurs.split('\n').map(n => n.trim()).filter(Boolean) : [] });
            if (error)
                setErreur(erreurInscriptions(error.message));
            else {
                setInscription(data);
                await charger(jeton);
            }
        }
        catch {
            setErreur('Connexion interrompue. Réessayez : votre demande ne sera pas envoyée deux fois.');
        }
        finally {
            setOccupe(false);
        }
    }
    async function annuler() {
        if (!confirm('Annuler cette inscription ?'))
            return;
        setOccupe(true);
        const { data, error } = await supabase.rpc('tourneo_mon_inscription', { p_tournoi: id, p_jeton: jeton, p_annuler: true });
        if (error)
            setErreur(erreurInscriptions(error.message));
        else
            setInscription(data);
        setOccupe(false);
    }
    return <main className="v2-page"><div className="v2-shell"><TourneoBrand /><section className="v2-card">
    <p className="v2-eyebrow">{tr("Inscription au tournoi")}</p><h1>{infos?.nom || tr('Rejoindre le tournoi')}</h1>
    {tr(erreur) && <p role="alert" className="v2-alert">{tr(erreur)}</p>}
    {inscription ? <><h2>{tr(STATUTS_INSCRIPTION[inscription.statut])}</h2><p>{inscription.nom}</p><p>{inscription.statut === 'en_attente' ? tr('L’organisateur pourra vous proposer une place si elle se libère.') : inscription.statut === 'a_valider' ? tr('L’organisateur doit encore valider votre demande.') : inscription.statut === 'accepte' ? tr('Votre place est réservée. Présentez-vous à l’organisateur pour le pointage.') : tr('Contactez l’organisateur pour toute nouvelle demande.')}</p>
      {inscription.present && <p>{tr("Pr\u00E9sence confirm\u00E9e")}</p>}
      <button disabled={occupe} onClick={() => void charger(jeton)}>{tr("Actualiser le statut")}</button>
      {infos?.ouvert && !['annule', 'refuse'].includes(inscription.statut) && <button disabled={occupe} onClick={annuler}>{tr("Annuler mon inscription")}</button>}
      <p>{tr("Revenez sur cette page depuis ce m\u00EAme appareil pour consulter votre statut.")}</p>
    </> : infos?.ouvert ? <form onSubmit={envoyer} className="v2-form">
      <p>{infos.places_restantes > 0 ? trModele("{0} place(s) disponible(s)", infos.places_restantes) : tr('Complet : vous pouvez rejoindre la liste d’attente.')}</p>
      {infos.echeance && <p>{tr("Cl\u00F4ture : ")}{new Date(infos.echeance).toLocaleString(localeFormat())}</p>}
      <label>{tr("Participation")}<select value={type} onChange={e => setType(e.target.value)}><option value="individuel">{tr("Individuelle")}</option><option value="equipe">{tr("En \u00E9quipe")}</option></select></label>
      <label>{type === 'equipe' ? tr('Nom de l’équipe') : tr('Nom ou pseudo')}<input required maxLength={100} value={nom} onChange={e => setNom(e.target.value)}/></label>
      {type === 'equipe' && <label>{tr("Joueurs (un pseudo par ligne, 12 maximum)")}<textarea rows={5} value={joueurs} onChange={e => setJoueurs(e.target.value)} maxLength={1212}/></label>}
      <label className="v2-check"><input required type="checkbox" checked={accord} onChange={e => setAccord(e.target.checked)}/>{tr("J\u2019accepte que mon nom ou pseudo et ceux de mon \u00E9quipe figurent dans les participants et r\u00E9sultats publics. Je dispose de leur accord.")}</label>
      <p>{tr("Utilisez des pseudos pour les mineurs. Aucun e-mail ni num\u00E9ro de t\u00E9l\u00E9phone n\u2019est demand\u00E9.")}</p>
      <button disabled={occupe || !jeton || !accord} type="submit">{occupe ? tr('Envoi…') : infos.places_restantes ? tr('Demander mon inscription') : tr('Rejoindre la liste d’attente')}</button>
    </form> : infos && <p>{tr("Les inscriptions sont ferm\u00E9es. Contactez l\u2019organisateur.")}</p>}
    <p><a href={`/partage/${id}`}>{tr("Voir le tournoi et les r\u00E9sultats")}</a></p>
  </section></div></main>;
}
