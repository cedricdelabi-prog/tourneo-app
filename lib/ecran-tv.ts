import type {Match} from '@/types';
export type ReglagesTV={secondes:number;pause:boolean;message:string;appel:number|null;defilement:boolean;repriseA:number|null;afficherSponsors:boolean;pageManuelle:number};
export const TV_DEFAUT:ReglagesTV={secondes:15,pause:false,message:'',appel:null,defilement:true,repriseA:null,afficherSponsors:true,pageManuelle:0};
export function normaliserTV(v:unknown):ReglagesTV{
 const o=v&&typeof v==='object'?v as Partial<ReglagesTV>:{};
 return {secondes:typeof o.secondes==='number'&&Number.isFinite(o.secondes)?Math.max(8,Math.min(60,Math.round(o.secondes))):15,pause:o.pause===true,message:typeof o.message==='string'?o.message.slice(0,180):'',appel:typeof o.appel==='number'&&Number.isInteger(o.appel)?o.appel:null,defilement:o.defilement!==false,repriseA:typeof o.repriseA==='number'&&Number.isFinite(o.repriseA)&&o.repriseA>0?o.repriseA:null,afficherSponsors:o.afficherSponsors!==false,pageManuelle:typeof o.pageManuelle==='number'&&Number.isSafeInteger(o.pageManuelle)?Math.max(0,Math.min(1000000,o.pageManuelle)):0};
}
export function pagesTV<T>(lignes:readonly T[],taille=6):T[][]{const n=Math.max(1,Math.floor(taille)||6);return Array.from({length:Math.ceil(lignes.length/n)},(_,i)=>lignes.slice(i*n,(i+1)*n));}
export function statutMatchTV(m:Match,valides:readonly number[]){return valides.includes(m.id)?'Validé':m.score1!==''&&m.score2!==''?'À valider':'À jouer';}
export function appelTV(matchs:Match[],valides:readonly number[],id:number|null){return matchs.find(m=>m.id===id&&statutMatchTV(m,valides)==='À jouer');}

/** A delayed/reopened TV must not sound a stale pause alert. */
export function repriseSonoreDansDelai(maintenant:number,repriseA:number|null):boolean{return repriseA!==null&&Number.isFinite(maintenant)&&Number.isFinite(repriseA)&&maintenant>=repriseA&&maintenant-repriseA<=10000;}
