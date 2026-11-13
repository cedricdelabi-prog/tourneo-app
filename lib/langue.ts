import {useSyncExternalStore} from "react";
import { traductions as base } from '@/lib/traductions';
import { traductionsAlertes } from '@/lib/traductions-alertes';
import {traductionsAffiches} from '@/lib/traductions-affiches';
import {traductionsEspaces} from '@/lib/traductions-espaces';
const traductions = {...base, ...traductionsAlertes, ...traductionsEspaces, ...traductionsAffiches};
export type Langue='fr'|'en'|'nl';
let langue:Langue='fr';
const ecouteurs=new Set<()=>void>();
export function useLangue(){return useSyncExternalStore(ecouterLangue,lireLangue,()=> "fr" as const);}
export function lireLangue(){return langue;}
export function ecouterLangue(fn:()=>void){ecouteurs.add(fn);return()=>{ecouteurs.delete(fn);};}
export function changerLangue(v:unknown){const suivante=v==='en'||v==='nl'?v:'fr';if(langue===suivante)return;langue=suivante;if(typeof document!=='undefined')document.documentElement.lang=suivante;try{localStorage.setItem('tourneo-langue',suivante);}catch{}ecouteurs.forEach(fn=>fn());}
export function localeFormat(){return langue==='en'?'en-GB':langue==='nl'?'nl-BE':'fr-FR';}
export function tr<T>(valeur:T):T{
 if(langue==='fr'||typeof valeur!=='string')return valeur;
 const texte=valeur.trim();const trouve=traductions[texte]?.[langue];
 if(!trouve){
  if(texte.length>2048)return valeur;
  for(const [cle,versions] of Object.entries(traductions)){
   if(!/\{\d+\}/.test(cle)||cle.replace(/\{\d+\}/g,'').length<6||(cle.match(/\{\d+\}/g)||[]).length>6)continue;const debut=cle.split('{')[0],fin=cle.split('}').pop()||'';if(!texte.startsWith(debut)||!texte.endsWith(fin))continue;
   const groupes:number[]=[];let motif='';let pos=0;
   for(const m of cle.matchAll(/\{(\d+)\}/g)){motif+=cle.slice(pos,m.index).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(.+?)';groupes.push(Number(m[1]));pos=m.index!+m[0].length;}
   motif+=cle.slice(pos).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
   const capture=new RegExp('^'+motif+'$','s').exec(texte);if(!capture)continue;
   let rendu=versions[langue];groupes.forEach((n,i)=>{rendu=rendu.replaceAll('{'+n+'}',capture[i+1]);});
   return valeur.replace(texte,rendu) as T;
  }
  return valeur;
 }
 return valeur.replace(texte,trouve) as T;
}
export function trModele(texte:string,...valeurs:unknown[]){let resultat=tr(texte);valeurs.forEach((v,i)=>{resultat=resultat.replaceAll(`{${i}}`,String(v));});return resultat;}
