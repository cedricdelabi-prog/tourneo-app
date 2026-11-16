"use client";
import {useRef,useState} from 'react';
import {supabase} from '@/lib/supabase';
import {tr} from '@/lib/langue';
export const RAISONS_SIGNALEMENT:Record<string,string>={haine:'Haine ou discrimination',harcelement:'Harcèlement ou propos agressifs',menace:'Menace ou danger',donnees_privees:'Divulgation de données privées',autre:'Autre problème'};
export default function SignalerMessage({messageId}:{messageId:string}){
 const[raison,setRaison]=useState('harcelement'),[precision,setPrecision]=useState(''),[occupe,setOccupe]=useState(false),[envoye,setEnvoye]=useState(false),[erreur,setErreur]=useState('');
 const verrou=useRef(false),tentative=useRef<{id:string;signature:string}|null>(null);
 async function envoyer(e:React.FormEvent){
  e.preventDefault();if(verrou.current||envoye)return;verrou.current=true;setOccupe(true);setErreur('');
  try{
   const signature=JSON.stringify([messageId,raison,precision.trim()]);
   if(tentative.current?.signature!==signature)tentative.current={id:crypto.randomUUID(),signature};
   const r=await supabase.rpc('tourneo_discussion_signaler',{p_id:tentative.current.id,p_message:messageId,p_raison:raison,p_precision:precision.trim()});
   if(r.error)throw r.error;
   setEnvoye(true);
  }catch{setErreur('Signalement non confirmé. Votre saisie est conservée ; réessayez.');}
  finally{verrou.current=false;setOccupe(false);}
 }
 return <details className="tourneo-report-form"><summary>{tr('Signaler ce message')}</summary>
  {envoye?<p role="status">{tr('Signalement transmis à la modération. Merci.')}</p>:<form className="v2-form" onSubmit={envoyer}>
   <p>{tr('Le message et quelques échanges visibles autour seront transmis au super administrateur pour examen.')}</p>
   <label>{tr('Motif du signalement')}<select aria-label={tr('Motif du signalement')} value={raison} disabled={occupe} onChange={e=>setRaison(e.target.value)}>{Object.entries(RAISONS_SIGNALEMENT).map(([id,label])=><option key={id} value={id}>{tr(label)}</option>)}</select></label>
   <label>{tr('Précisions (facultatives)')}<textarea aria-label={tr('Précisions (facultatives)')} rows={3} maxLength={1000} disabled={occupe} value={precision} onChange={e=>setPrecision(e.target.value)}/></label>
   {erreur&&<p role="alert">{tr(erreur)}</p>}
   <button type="submit" disabled={occupe}>{tr(occupe?'Envoi…':'Transmettre le signalement')}</button>
  </form>}
 </details>;
}
