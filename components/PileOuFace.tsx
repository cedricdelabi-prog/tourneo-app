"use client";
import {useEffect,useRef,useState}from'react';
import {tr,useLangue}from'@/lib/langue';
export default function PileOuFace({noms=['Côté 1','Côté 2']}:{noms?:[string,string]}){
 useLangue();const[resultat,setResultat]=useState<number|null>(null),[lance,setLance]=useState(false),[erreur,setErreur]=useState(''),timer=useRef<ReturnType<typeof setTimeout>|null>(null),verrou=useRef(false);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 function tirer(){if(verrou.current)return;try{const bit=crypto.getRandomValues(new Uint8Array(1))[0]&1;verrou.current=true;setErreur('');setLance(true);setResultat(null);timer.current=setTimeout(()=>{setResultat(bit);setLance(false);verrou.current=false;},750);}catch{setErreur('Tirage indisponible. Réessayez.');}}
 return <section className="tourneo-coin"><h2>{tr('Pile ou face')}</h2><p>{tr('Attribuez un côté à chaque participant avant de lancer la pièce.')}</p><div className="tourneo-coin-sides"><span>{tr('Pile')} · {noms[0]}</span><span>{tr('Face')} · {noms[1]}</span></div><div className={`tourneo-coin-disc${lance?' is-tossing':''}`} aria-hidden="true">{lance?'↻':resultat===null?'?':tr(resultat===0?'Pile':'Face')}</div><p role="status" aria-live="polite">{lance?tr('La pièce tourne…'):resultat===null?tr('Qui commence ?'):tr(resultat===0?'Pile':'Face')+' · '+noms[resultat]+' · '+tr('commence')}</p><button type="button" disabled={lance} onClick={tirer}>{tr(lance?'Tirage en cours…':'Lancer la pièce')}</button>{erreur&&<p role="alert">{tr(erreur)}</p>}<p className="tourneo-tool-note">{tr('Tirage gratuit, sans mise d’argent. Convenez du choix du service ou du terrain selon les règles de votre sport.')}</p></section>;
}
