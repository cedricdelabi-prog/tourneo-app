"use client";
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
const CLE='tourneo-demande-avis-v2';
type Etat={premiere:number;visites:number;prochaine:number;termine?:boolean};
export default function DemandeAvisTourneo(){
 const chemin=usePathname();const [visible,setVisible]=useState(false),[note,setNote]=useState(0);
 useEffect(()=>{
  if(!chemin||/\/tv(?:\/|$)|\/affiche|\/login|\/contact|\/avis\//.test(chemin))return;
  try{
   const maintenant=Date.now();const ancien=JSON.parse(localStorage.getItem(CLE)||'null') as Etat|null;
   const etat:Etat=ancien&&typeof ancien.premiere==='number'&&typeof ancien.visites==='number'?ancien:{premiere:maintenant,visites:0,prochaine:maintenant+7*86400000};
   if(etat.termine)return;
   const jour='tourneo-avis-jour-v2',aujourdhui=new Date().toISOString().slice(0,10);
   if(localStorage.getItem(jour)!==aujourdhui){etat.visites++;localStorage.setItem(jour,aujourdhui);}
   localStorage.setItem(CLE,JSON.stringify(etat));
   if(etat.visites>=3&&maintenant>=etat.prochaine){const timer=setTimeout(()=>setVisible(true),8000);return()=>clearTimeout(timer);}
  }catch{/* Local storage can be unavailable. */}
 },[chemin]);
 function fermer(termine=false){setVisible(false);try{const ancien=JSON.parse(localStorage.getItem(CLE)||'null') as Etat|null;if(ancien)localStorage.setItem(CLE,JSON.stringify({...ancien,prochaine:Date.now()+90*86400000,termine}));}catch{}}
 if(!visible)return null;
 return <aside className="tourneo-avis-invite" role="dialog" aria-label="Votre avis sur Tourneo" aria-modal="false"><button type="button" className="tourneo-avis-fermer" onClick={()=>fermer()} aria-label="Fermer">×</button><strong>Votre avis compte !</strong><p>Comment trouvez-vous Tourneo ?</p><div role="group" aria-label="Note de 1 à 5 étoiles">{[1,2,3,4,5].map(n=><button key={n} type="button" onClick={()=>setNote(n)} aria-label={n+' étoile'+(n>1?'s':'')} aria-pressed={note===n}>{n<=note?'★':'☆'}</button>)}</div>{note>0&&<><p>Merci pour votre note de {note}/5. Vous pouvez nous envoyer vos suggestions.</p><a href={'/contact?objet='+encodeURIComponent('Avis Tourneo '+note+'/5')} onClick={()=>fermer(true)}>Envoyer mon avis</a></>}<button type="button" className="tourneo-avis-plus-tard" onClick={()=>fermer()}>Plus tard</button></aside>;
}