import {capitaineEquipe} from '@/lib/equipe-capitaine';
import type { Equipe,Match } from '@/types';
import { normaliserOptionsV2,type OptionsV2 } from '@/lib/options-v2';
export type PouleSauvegarde={id:string;nom:string;terrain:string;equipes:Equipe[]};
export type SauvegardeTournoi={version:2;nomTournoi:string;sport:string;formatTournoi:string;equipes:Equipe[];matchs:Match[];matchsValides:number[];optionsV2:OptionsV2;poules?:PouleSauvegarde[]};
const FORMATS=['complet','allerRetour','poules','poulesFinale','elimination','doubleElimination','consolante','suisse','rotation'];
export function lireSauvegarde(texte:string):SauvegardeTournoi{
 if(texte.length>5_000_000)throw new Error('Sauvegarde trop volumineuse (5 Mo maximum).');
 const d=JSON.parse(texte);
 if(!d||d.version!==2||typeof d.nomTournoi!=='string'||!d.nomTournoi.trim()||d.nomTournoi.length>150||!FORMATS.includes(d.formatTournoi)||typeof d.sport!=='string'||d.sport.length>50)throw new Error('Format de sauvegarde invalide.');
 if(!Array.isArray(d.equipes)||d.equipes.length<2||d.equipes.length>256||!Array.isArray(d.matchs)||d.matchs.length>70000)throw new Error('Liste de participants ou de matchs invalide.');
 const equipes:Equipe[]=d.equipes.map((e:Equipe)=>{if(!e||typeof e.id!=='string'||e.id.length>150||typeof e.nom!=='string'||!e.nom.trim()||e.nom.length>100)throw new Error('Participant invalide.');return{capitaine:capitaineEquipe(e.capitaine,Array.isArray(e.joueurs)?e.joueurs.filter(j=>typeof j==='string').map(j=>j.slice(0,100)).slice(0,12):[]),historique:Array.isArray(e.historique)?e.historique.slice(-20).filter(h=>h&&typeof h.date==='string'&&Number.isFinite(Date.parse(h.date))&&typeof h.nom==='string'&&Array.isArray(h.joueurs)).map(h=>({date:h.date,nom:h.nom.slice(0,100),capitaine:typeof h.capitaine==='string'?h.capitaine.slice(0,100):undefined,joueurs:h.joueurs.filter(j=>typeof j==='string').map(j=>j.slice(0,100)).slice(0,12)})):undefined,id:e.id,profilId:typeof e.profilId==='string'&&/^[0-9a-f-]{36}$/i.test(e.profilId)?e.profilId:undefined,nom:e.nom,emoji:typeof e.emoji==='string'?e.emoji.slice(0,12):'🏅',couleur:/^#[0-9a-fA-F]{6}$/.test(e.couleur)?e.couleur:'#3B82F6',niveau:Number.isInteger(e.niveau)?e.niveau:1,joueurs:Array.isArray(e.joueurs)?e.joueurs.filter(j=>typeof j==='string').map(j=>j.slice(0,100)).slice(0,12):[]};});
 const ids=new Set(equipes.map(e=>e.id));if(ids.size!==equipes.length)throw new Error('Identifiants de participants dupliqués.');
 const score=(v:unknown)=>typeof v==='string'&&(v===''||/^(0|[1-9]\d*)$/.test(v)&&Number.isSafeInteger(Number(v)));
 const matchs:Match[]=d.matchs.map((m:Match)=>{
  if(!m||typeof m.equipe1Id!=='string'||typeof m.equipe2Id!=='string'||m.equipe1Id.length>350||m.equipe2Id.length>350||!Number.isInteger(m.id)||m.id<1||!Number.isInteger(m.journee)||m.journee<1||!score(m.score1)||!score(m.score2))throw new Error('Match invalide.');
  if(m.terrain!==undefined&&(!Number.isInteger(m.terrain)||m.terrain<1||m.terrain>32))throw new Error('Terrain de match invalide.');
  if(m.ordre!==undefined&&(!Number.isInteger(m.ordre)||m.ordre<0||m.ordre>70000))throw new Error('Ordre de match invalide.');
  const a=m.joueurs1Ids??[m.equipe1Id],b=m.joueurs2Ids??[m.equipe2Id];if(!Array.isArray(a)||!Array.isArray(b)||a.length<1||b.length<1||a.length>2||b.length>2||new Set([...a,...b]).size!==a.length+b.length||[...a,...b].some(id=>!ids.has(id)))throw new Error('Participant de match inconnu.');
  return{id:m.id,journee:m.journee,terrain:m.terrain,ordre:m.ordre,equipe1Id:m.equipe1Id,equipe2Id:m.equipe2Id,score1:m.score1,score2:m.score2,joueurs1Ids:m.joueurs1Ids? a:undefined,joueurs2Ids:m.joueurs2Ids?b:undefined,branche:['principale','repechage','consolante','finale'].includes(m.branche??'')?m.branche:undefined,manches:Array.isArray(m.manches)?m.manches.slice(0,9).map(s=>{if(!score(s.score1)||!score(s.score2))throw new Error('Manche invalide.');return{score1:s.score1,score2:s.score2};}):undefined};
 });
 if(new Set(matchs.map(m=>m.id)).size!==matchs.length)throw new Error('Identifiants de matchs dupliqués.');
 let poules:PouleSauvegarde[]=[];
 if(d.formatTournoi==='poules'||d.formatTournoi==='poulesFinale'){
   if(!Array.isArray(d.poules)||d.poules.length<2||d.poules.length>128)throw new Error('Répartition des poules absente ou invalide.');
   poules=d.poules.map((p:PouleSauvegarde)=>{if(!p||typeof p.id!=='string'||typeof p.nom!=='string'||!Array.isArray(p.equipes)||p.equipes.some(e=>!ids.has(e.id)))throw new Error('Poule invalide.');return{id:p.id.slice(0,100),nom:p.nom.slice(0,100),terrain:typeof p.terrain==='string'?p.terrain.slice(0,100):'',equipes:p.equipes.map(e=>equipes.find(a=>a.id===e.id)!)};});
   const repartis=poules.flatMap(p=>p.equipes.map(e=>e.id));if(repartis.length!==equipes.length||new Set(repartis).size!==equipes.length)throw new Error('Chaque participant doit appartenir à une seule poule.');
 }
 return{poules,version:2,nomTournoi:d.nomTournoi,sport:d.sport,formatTournoi:d.formatTournoi,equipes,matchs,matchsValides:Array.isArray(d.matchsValides)?d.matchsValides.filter((id:number)=>matchs.some(m=>m.id===id&&m.score1!==''&&m.score2!=='')):[],optionsV2:normaliserOptionsV2(d.optionsV2)};
}
export function telechargerSauvegarde(donnees:SauvegardeTournoi){
 const url=URL.createObjectURL(new Blob([JSON.stringify(donnees,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`tourneo-sauvegarde-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
