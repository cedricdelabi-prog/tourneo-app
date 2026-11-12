"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';
import TourneoNav from '@/components/TourneoNav';
import { erreurInscriptions, STATUTS_INSCRIPTION, type Inscription, type StatutInscription } from '@/lib/inscriptions';
export default function GestionInscriptions() {
  const { id } = useParams<{id:string}>();
  const [nom,setNom]=useState(''); const [demarre,setDemarre]=useState(false);
  const [lignes,setLignes]=useState<Inscription[]>([]); const [ouvert,setOuvert]=useState(false);
  const [capacite,setCapacite]=useState(32); const [echeance,setEcheance]=useState(''); const [validation,setValidation]=useState(true);
  const [message,setMessage]=useState(''); const [erreur,setErreur]=useState(''); const [occupe,setOccupe]=useState(false);
  const [lien,setLien]=useState(''); const [filtre,setFiltre]=useState('tous');
  async function charger() {
    const { data: auth }=await supabase.auth.getUser();
    if (!auth.user) { window.location.href='/login'; return; }
    const tournoi=await supabase.from('tournois').select('nom,donnees').eq('id',id).eq('user_id',auth.user.id).single();
    if(tournoi.error) { setErreur('Tournoi introuvable ou accès organisateur requis.'); return; }
    setNom(tournoi.data.nom);setDemarre(Boolean(tournoi.data.donnees?.cree));
    const [config, inscriptions]=await Promise.all([supabase.from('tourneo_inscriptions_config').select('*').eq('tournoi_id',id).maybeSingle(),supabase.from('tourneo_inscriptions').select('id,nom,statut,present,joueurs,type_participant,created_at').eq('tournoi_id',id).order('created_at')]);
    if(config.error || inscriptions.error) { setErreur(erreurInscriptions((config.error || inscriptions.error)!.message));return; }
    if(config.data) { setOuvert(config.data.ouvert);setCapacite(config.data.capacite);setValidation(config.data.validation_manuelle);setEcheance(config.data.echeance ? new Date(new Date(config.data.echeance).getTime()-new Date(config.data.echeance).getTimezoneOffset()*60000).toISOString().slice(0,16):''); }
    setLignes(inscriptions.data || []);setErreur('');
  }
  useEffect(()=>{setLien(`${window.location.origin}/inscriptions/${id}`);void charger();},[id]);
  async function enregistrer(event:React.FormEvent) {
    event.preventDefault(); setOccupe(true);setMessage('');
    const { error }=await supabase.rpc('tourneo_configurer_inscriptions',{p_tournoi:id,p_ouvert:ouvert,p_capacite:capacite,p_echeance:echeance?new Date(echeance).toISOString():null,p_validation:validation});
    if(error)setErreur(erreurInscriptions(error.message));else {setMessage('Paramètres enregistrés.');await charger();}setOccupe(false);
  }
  async function traiter(ligne:Inscription, statut:StatutInscription, present=ligne.present) {
    setOccupe(true);setErreur('');
    const { error }=await supabase.rpc('tourneo_traiter_inscription',{p_tournoi:id,p_id:ligne.id,p_statut:statut,p_present:present});
    if(error)setErreur(erreurInscriptions(error.message));else await charger();setOccupe(false);
  }
  const visibles=lignes.filter(l=>filtre==='tous'||l.statut===filtre);
  return <main className="v2-page"><div className="v2-shell"><TourneoNav active="tournoi" showBack backHref={`/tournoi/${id}`} backLabel="Retour au tournoi" contextLabel="Inscriptions et pointage"/><section className="v2-card"><h1>Inscriptions · {nom}</h1>
    {erreur&&<p role="alert" className="v2-alert">{erreur}</p>}{message&&<p role="status">{message}</p>}
    {demarre&&<p>Tournoi démarré : inscriptions closes. Le pointage reste disponible.</p>}
    <form onSubmit={enregistrer} className="v2-form"><label className="v2-check"><input type="checkbox" checked={ouvert} disabled={demarre} onChange={e=>setOuvert(e.target.checked)}/>Ouvrir les inscriptions</label>
      <label>Nombre de places<input type="number" min={2} max={256} required value={capacite} onChange={e=>setCapacite(Number(e.target.value))}/></label>
      <label>Échéance (facultative)<input type="datetime-local" value={echeance} onChange={e=>setEcheance(e.target.value)}/></label>
      <label className="v2-check"><input type="checkbox" checked={validation} onChange={e=>setValidation(e.target.checked)}/>Valider manuellement les demandes</label><button disabled={occupe}>Enregistrer</button>
    </form>
    {lien&&<div className="v2-qr"><QRCodeSVG value={lien} size={180} bgColor="#ffffff" fgColor="#000000" marginSize={4}/><p><a href={lien}>{lien}</a></p><button onClick={()=>navigator.clipboard.writeText(lien).then(()=>setMessage('Lien copié.')).catch(()=>setMessage('Copiez le lien ci-dessus.'))}>Copier le lien</button><button onClick={()=>window.print()}>Imprimer l’affiche QR</button></div>}
  </section><section className="v2-card"><h2>Demandes et pointage</h2><div className="v2-row"><select aria-label="Filtrer les inscriptions" value={filtre} onChange={e=>setFiltre(e.target.value)}><option value="tous">Toutes ({lignes.length})</option>{Object.entries(STATUTS_INSCRIPTION).map(([s,libelle])=><option key={s} value={s}>{libelle} ({lignes.filter(l=>l.statut===s).length})</option>)}</select><button disabled={occupe} onClick={charger}>Actualiser</button></div>
    <p>Les participants acceptés seront ajoutés au démarrage. Les places libérées sont attribuées par l’organisateur depuis la liste d’attente.</p>
    {visibles.length===0&&<p>Aucune demande dans cette catégorie.</p>}
    {visibles.map(l=><article key={l.id} className="v2-entry"><h3>{l.nom}</h3><p>{STATUTS_INSCRIPTION[l.statut]} · {l.type_participant==='equipe'?'Équipe':'Individuel'}</p>{!!l.joueurs?.length&&<p>{l.joueurs.join(', ')}</p>}<div className="v2-row">
      {!demarre&&l.statut!=='annule'&&<><button disabled={occupe||l.statut==='accepte'} onClick={()=>traiter(l,'accepte')}>Accepter</button><button disabled={occupe||l.statut==='en_attente'} onClick={()=>traiter(l,'en_attente',false)}>Liste d’attente</button><button disabled={occupe||l.statut==='refuse'} onClick={()=>traiter(l,'refuse',false)}>Refuser</button></>}
      {l.statut==='accepte'&&<label className="v2-check"><input type="checkbox" checked={l.present} disabled={occupe} onChange={e=>traiter(l,l.statut,e.target.checked)}/>Présent</label>}
    </div></article>)}
  </section></div></main>;
}
