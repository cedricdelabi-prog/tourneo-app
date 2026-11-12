"use client";
import {tr,trModele,useLangue} from "@/lib/langue";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';
import TourneoNav from '@/components/TourneoNav';
import { erreurInscriptions, STATUTS_INSCRIPTION, type Inscription, type StatutInscription } from '@/lib/inscriptions';
export default function GestionInscriptions() {
    useLangue();
    const { id } = useParams<{
        id: string;
    }>();
    const [nom, setNom] = useState('');
    const [demarre, setDemarre] = useState(false);
    const [lignes, setLignes] = useState<Inscription[]>([]);
    const [ouvert, setOuvert] = useState(false);
    const [capacite, setCapacite] = useState(32);
    const [echeance, setEcheance] = useState('');
    const [validation, setValidation] = useState(true);
    const [message, setMessage] = useState('');
    const [erreur, setErreur] = useState('');
    const [occupe, setOccupe] = useState(false);
    const [lien, setLien] = useState('');
    const [filtre, setFiltre] = useState('tous');
    async function charger() {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) {
            window.location.href = '/login';
            return;
        }
        const tournoi = await supabase.from('tournois').select('nom,donnees').eq('id', id).eq('user_id', auth.user.id).single();
        if (tournoi.error) {
            setErreur('Tournoi introuvable ou accès organisateur requis.');
            return;
        }
        setNom(tournoi.data.nom);
        setDemarre(Boolean(tournoi.data.donnees?.cree));
        const [config, inscriptions] = await Promise.all([supabase.from('tourneo_inscriptions_config').select('*').eq('tournoi_id', id).maybeSingle(), supabase.from('tourneo_inscriptions').select('id,nom,statut,present,joueurs,type_participant,created_at').eq('tournoi_id', id).order('created_at')]);
        if (config.error || inscriptions.error) {
            setErreur(erreurInscriptions((config.error || inscriptions.error)!.message));
            return;
        }
        if (config.data) {
            setOuvert(config.data.ouvert);
            setCapacite(config.data.capacite);
            setValidation(config.data.validation_manuelle);
            setEcheance(config.data.echeance ? new Date(new Date(config.data.echeance).getTime() - new Date(config.data.echeance).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
        }
        setLignes(inscriptions.data || []);
        setErreur('');
    }
    useEffect(() => { setLien(`${window.location.origin}/inscriptions/${id}`); void charger(); }, [id]);
    async function enregistrer(event: React.FormEvent) {
        event.preventDefault();
        setOccupe(true);
        setMessage('');
        const { error } = await supabase.rpc('tourneo_configurer_inscriptions', { p_tournoi: id, p_ouvert: ouvert, p_capacite: capacite, p_echeance: echeance ? new Date(echeance).toISOString() : null, p_validation: validation });
        if (error)
            setErreur(erreurInscriptions(error.message));
        else {
            setMessage('Paramètres enregistrés.');
            await charger();
        }
        setOccupe(false);
    }
    async function traiter(ligne: Inscription, statut: StatutInscription, present = ligne.present) {
        setOccupe(true);
        setErreur('');
        const { error } = await supabase.rpc('tourneo_traiter_inscription', { p_tournoi: id, p_id: ligne.id, p_statut: statut, p_present: present });
        if (error)
            setErreur(erreurInscriptions(error.message));
        else
            await charger();
        setOccupe(false);
    }
    const visibles = lignes.filter(l => filtre === 'tous' || l.statut === filtre);
    return <main className="v2-page"><div className="v2-shell"><TourneoNav active="tournoi" showBack backHref={`/tournoi/${id}`} backLabel={tr("Retour au tournoi")} contextLabel={tr("Inscriptions et pointage")}/><section className="v2-card"><h1>{tr("Inscriptions \u00B7 ")}{nom}</h1>
    {tr(erreur) && <p role="alert" className="v2-alert">{tr(erreur)}</p>}{tr(message) && <p role="status">{tr(message)}</p>}
    {demarre && <p>{tr("Tournoi d\u00E9marr\u00E9 : inscriptions closes. Le pointage reste disponible.")}</p>}
    <form onSubmit={enregistrer} className="v2-form"><label className="v2-check"><input type="checkbox" checked={ouvert} disabled={demarre} onChange={e => setOuvert(e.target.checked)}/>{tr("Ouvrir les inscriptions")}</label>
      <label>{tr("Nombre de places")}<input type="number" min={2} max={256} required value={capacite} onChange={e => setCapacite(Number(e.target.value))}/></label>
      <label>{tr("\u00C9ch\u00E9ance (facultative)")}<input type="datetime-local" value={echeance} onChange={e => setEcheance(e.target.value)}/></label>
      <label className="v2-check"><input type="checkbox" checked={validation} onChange={e => setValidation(e.target.checked)}/>{tr("Valider manuellement les demandes")}</label><button disabled={occupe}>{tr("Enregistrer")}</button>
    </form>
    {lien && <div className="v2-qr"><QRCodeSVG value={lien} size={180} bgColor="#ffffff" fgColor="#000000" marginSize={4}/><p><a href={lien}>{lien}</a></p><button onClick={() => navigator.clipboard.writeText(lien).then(() => setMessage('Lien copié.')).catch(() => setMessage('Copiez le lien ci-dessus.'))}>{tr("Copier le lien")}</button><button onClick={() => window.print()}>{tr("Imprimer l\u2019affiche QR")}</button></div>}
  </section><section className="v2-card"><h2>{tr("Demandes et pointage")}</h2><div className="v2-row"><select aria-label={tr("Filtrer les inscriptions")} value={filtre} onChange={e => setFiltre(e.target.value)}><option value="tous">{tr("Toutes (")}{lignes.length})</option>{Object.entries(STATUTS_INSCRIPTION).map(([s, libelle]) => <option key={s} value={s}>{tr(libelle)} ({lignes.filter(l => l.statut === s).length})</option>)}</select><button disabled={occupe} onClick={charger}>{tr("Actualiser")}</button></div>
    <p>{tr("Les participants accept\u00E9s seront ajout\u00E9s au d\u00E9marrage. Les places lib\u00E9r\u00E9es sont attribu\u00E9es par l\u2019organisateur depuis la liste d\u2019attente.")}</p>
    {visibles.length === 0 && <p>{tr("Aucune demande dans cette cat\u00E9gorie.")}</p>}
    {visibles.map(l => <article key={l.id} className="v2-entry"><h3>{l.nom}</h3><p>{tr(STATUTS_INSCRIPTION[l.statut])} · {l.type_participant === 'equipe' ? tr('Équipe') : tr('Individuel')}</p>{!!l.joueurs?.length && <p>{l.joueurs.join(', ')}</p>}<div className="v2-row">
      {!demarre && l.statut !== 'annule' && <><button disabled={occupe || l.statut === 'accepte'} onClick={() => traiter(l, 'accepte')}>{tr("Accepter")}</button><button disabled={occupe || l.statut === 'en_attente'} onClick={() => traiter(l, 'en_attente', false)}>{tr("Liste d\u2019attente")}</button><button disabled={occupe || l.statut === 'refuse'} onClick={() => traiter(l, 'refuse', false)}>{tr("Refuser")}</button></>}
      {l.statut === 'accepte' && <label className="v2-check"><input type="checkbox" checked={l.present} disabled={occupe} onChange={e => traiter(l, l.statut, e.target.checked)}/>{tr("Pr\u00E9sent")}</label>}
    </div></article>)}
  </section></div></main>;
}
