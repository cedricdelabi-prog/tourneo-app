"use client";
import {useEffect,useState} from 'react';
import {afficherDuree,tempsChrono,type Chrono} from '@/lib/outils-arbitre';
import {tr} from '@/lib/langue';
export default function ChronoMatch({cle}:{cle:string}){
 const [chrono,setChrono]=useState<Chrono>({ecoule:0,depuis:null,limite:0}),[maintenant,setMaintenant]=useState(0),[pret,setPret]=useState(false);
 useEffect(()=>{setPret(false);try{const c=JSON.parse(localStorage.getItem(cle)||'null');if(c&&Number.isFinite(c.ecoule)&&c.ecoule>=0&&(c.depuis===null||Number.isFinite(c.depuis)))setChrono({ecoule:c.ecoule,depuis:c.depuis,limite:0});}catch{}setMaintenant(Date.now());setPret(true);const t=setInterval(()=>setMaintenant(Date.now()),500);return()=>clearInterval(t);},[cle]);
 useEffect(()=>{if(pret)try{localStorage.setItem(cle,JSON.stringify(chrono));}catch{}},[cle,chrono,pret]);
 return <section className="tourneo-match-clock"><output role="timer">{afficherDuree(tempsChrono(chrono,maintenant))}</output><div className="tourneo-tool-actions"><button type="button" disabled={!pret} onClick={()=>{const t=Date.now();setMaintenant(t);setChrono(c=>c.depuis===null?{...c,depuis:t}:{...c,ecoule:tempsChrono(c,t),depuis:null});}}>{tr(chrono.depuis===null?'Démarrer / reprendre':'Pause')}</button><button type="button" disabled={!pret} onClick={()=>{if(confirm(tr('Remettre le chrono à zéro ?')))setChrono({ecoule:0,depuis:null,limite:0});}}>{tr('Remettre à zéro')}</button></div></section>;
}
