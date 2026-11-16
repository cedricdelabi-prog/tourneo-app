"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import {supabase} from '@/lib/supabase';
import {tr,localeFormat} from '@/lib/langue';
import {RAISONS_SIGNALEMENT} from './SignalerMessage';
type Contexte={id:string;auteur_nom:string;audience:string;contenu:string;created_at:string};
type Signalement={id:string;message_id:string;tournoi_nom:string;raison:string;precision:string;contexte:Contexte[];statut:string;decision:string|null;motif_decision:string|null;created_at:string;suspension_active:boolean;jusquau:string|null};
const ACTIONS:Record<string,string>={examiner:'Prendre en charge',masquer:'Masquer le message',suspendre_24h:'Suspendre la messagerie 24 heures',suspendre_7j:'Suspendre la messagerie 7 jours',bannir:'Bannir de la messagerie',retablir:'Rétablir la messagerie',classer:'Classer sans suite',traiter:'Marquer comme traité'};
export default function ModerationDiscussions({surChangement}:{surChangement:()=>void}){
 const[liste,setListe]=useState<Signalement[]>([]),[filtre,setFiltre]=useState('ouverts'),[page,setPage]=useState(0),[erreur,setErreur]=useState(''),[message,setMessage]=useState(''),[charge,setCharge]=useState(true),[occupe,setOccupe]=useState(false),[selection,setSelection]=useState<Signalement|null>(null),[action,setAction]=useState('examiner'),[motif,setMotif]=useState('');
 const verrou=useRef(false),generation=useRef(0);
 const charger=useCallback(async()=>{const g=++generation.current;try{const r=await supabase.rpc('tourneo_moderation_liste',{p_statut:filtre,p_page:page});if(g!==generation.current)return;if(r.error)throw r.error;setListe(r.data||[]);setErreur('');}catch{if(g===generation.current)setErreur('Chargement des signalements impossible. Réessayez.');}finally{if(g===generation.current)setCharge(false);}},[filtre,page]);
 const invalider=useCallback(()=>{generation.current++;},[]);
 // State changes occur after the remote query resolves; this effect subscribes to filter changes.
 // eslint-disable-next-line react-hooks/set-state-in-effect
 useEffect(()=>{void charger();return invalider;},[charger,invalider]);
 async function appliquer(e:React.FormEvent){
  e.preventDefault();if(verrou.current||!selection||motif.trim().length<3)return;
  if(!confirm(tr('Confirmer cette décision de modération ?')))return;
  verrou.current=true;setOccupe(true);setMessage('');setErreur('');
  try{const r=await supabase.rpc('tourneo_moderation_decider',{p_id:selection.id,p_action:action,p_motif:motif.trim()});if(r.error)throw r.error;setSelection(null);setMotif('');setMessage('Décision enregistrée dans l’historique.');await charger();surChangement();window.dispatchEvent(new Event('tourneo-moderation-changee'));}
  catch{setErreur('Décision non confirmée. Actualisez avant de réessayer.');}
  finally{verrou.current=false;setOccupe(false);}
 }
 return <section className="v2-card"><h2>{tr('Sécurité · signalements')}</h2>
  <p>{tr('Examinez le message signalé et le contexte transmis. Aucun accès général aux conversations privées n’est ouvert.')}</p>
  <p className="tourneo-tool-note">{tr('Les suspensions et le bannissement concernent uniquement l’envoi de messages dans Tourneo. Les tournois et les scores sont conservés.')}</p>
  <div className="v2-row"><label>{tr('Afficher les signalements')}<select aria-label={tr('Afficher les signalements')} value={filtre} disabled={occupe} onChange={e=>{setCharge(true);setFiltre(e.target.value);setPage(0);setListe([]);}}>{[['ouverts','À examiner'],['tous','Tous'],['traite','Traités'],['classe','Classés sans suite']].map(([v,l])=><option key={v} value={v}>{tr(l)}</option>)}</select></label><button type="button" disabled={occupe||charge} onClick={()=>{setCharge(true);void charger();}}>{tr('Actualiser')}</button></div>
  {erreur&&<p role="alert">{tr(erreur)}</p>}{message&&<p role="status">{tr(message)}</p>}{charge&&<p role="status">{tr('Chargement…')}</p>}
  {!charge&&!erreur&&!liste.length&&<p>{tr('Aucun signalement dans cette catégorie.')}</p>}
  {liste.map(s=><article className="v2-entry tournoi-report" key={s.id}><h3>{s.tournoi_nom}</h3><strong>{tr(RAISONS_SIGNALEMENT[s.raison]||s.raison)}</strong><p>{new Date(s.created_at).toLocaleString(localeFormat())} · {tr(s.statut)}</p>{s.precision&&<p className="tourneo-message-body">{s.precision}</p>}
   <details><summary>{tr('Voir le message et son contexte')}</summary><ol className="tourneo-moderation-context">{s.contexte.map(m=><li key={m.id} className={m.id===s.message_id?'is-reported':''}><strong>{m.auteur_nom}{m.id===s.message_id?' · '+tr('Message signalé'):''}</strong><small>{new Date(m.created_at).toLocaleString(localeFormat())}</small><p className="tourneo-message-body">{m.contenu}</p></li>)}</ol></details>
   {s.suspension_active&&<p>{tr(s.jusquau?'Suspension de la messagerie en cours':'Bannissement de la messagerie en cours')}{s.jusquau?' · '+new Date(s.jusquau).toLocaleString(localeFormat()):''}</p>}
   {s.decision&&<p>{tr(ACTIONS[s.decision]||s.decision)} · {s.motif_decision}</p>}
   <button type="button" disabled={occupe} onClick={()=>{setSelection(s);setAction('examiner');setMotif('');setErreur('');}}>{tr('Intervenir')}</button>
  </article>)}
  <div className="v2-row"><button type="button" disabled={occupe||charge||page===0} onClick={()=>{setCharge(true);setPage(p=>p-1);}}>{tr('Précédent')}</button><span>{page+1}</span><button type="button" disabled={occupe||charge||liste.length<25} onClick={()=>{setCharge(true);setPage(p=>p+1);}}>{tr('Suivant')}</button></div>
  {selection&&<form className="v2-form tourneo-moderation-decision" onSubmit={appliquer}><h3>{tr('Décision de modération')} · {selection.tournoi_nom}</h3><label>{tr('Action')}<select aria-label={tr('Action')} value={action} disabled={occupe} onChange={e=>setAction(e.target.value)}>{Object.entries(ACTIONS).map(([v,l])=><option key={v} value={v}>{tr(l)}</option>)}</select></label><label>{tr('Motif obligatoire')}<textarea aria-label={tr('Motif obligatoire')} rows={3} required minLength={3} maxLength={300} disabled={occupe} value={motif} onChange={e=>setMotif(e.target.value)}/></label><div className="v2-row"><button type="submit" disabled={occupe||motif.trim().length<3}>{tr('Confirmer la décision')}</button><button type="button" disabled={occupe} onClick={()=>setSelection(null)}>{tr('Annuler')}</button></div></form>}
 </section>;
}
