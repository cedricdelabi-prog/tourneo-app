import type {Match} from '@/types';
export type FiltreMatchsTV='tous'|'aJouer'|'aValider'|'valides';
export type ReglagesTV={secondes:number;pause:boolean;message:string;appel:number|null;defilement:boolean;repriseA:number|null;afficherSponsors:boolean;pageSponsors:boolean;afficherMatchs:boolean;afficherClassement:boolean;filtreMatchs:FiltreMatchsTV;pageManuelle:number;debutDefilement:number};
export const TV_DEFAUT:ReglagesTV={secondes:15,pause:false,message:'',appel:null,defilement:true,repriseA:null,afficherSponsors:true,pageSponsors:false,afficherMatchs:true,afficherClassement:true,filtreMatchs:'tous',pageManuelle:0,debutDefilement:0};
export function normaliserTV(v:unknown):ReglagesTV{
 const o=v&&typeof v==='object'?v as Partial<ReglagesTV>:{};
 return {secondes:typeof o.secondes==='number'&&Number.isFinite(o.secondes)?Math.max(8,Math.min(60,Math.round(o.secondes))):15,pause:o.pause===true,message:typeof o.message==='string'?o.message.slice(0,180):'',appel:typeof o.appel==='number'&&Number.isInteger(o.appel)?o.appel:null,defilement:o.defilement!==false,repriseA:typeof o.repriseA==='number'&&Number.isFinite(o.repriseA)&&o.repriseA>0?o.repriseA:null,afficherSponsors:o.afficherSponsors!==false,pageSponsors:o.pageSponsors===true,afficherMatchs:o.afficherMatchs!==false,afficherClassement:o.afficherClassement!==false,filtreMatchs:o.filtreMatchs==='aJouer'||o.filtreMatchs==='aValider'||o.filtreMatchs==='valides'?o.filtreMatchs:'tous',pageManuelle:typeof o.pageManuelle==='number'&&Number.isSafeInteger(o.pageManuelle)?Math.max(0,Math.min(1000000,o.pageManuelle)):0,debutDefilement:typeof o.debutDefilement==='number'&&Number.isSafeInteger(o.debutDefilement)&&o.debutDefilement>0?o.debutDefilement:0};
}
export function pagesTV<T>(lignes:readonly T[],taille=6):T[][]{const n=Math.max(1,Math.floor(taille)||6);return Array.from({length:Math.ceil(lignes.length/n)},(_,i)=>lignes.slice(i*n,(i+1)*n));}
export function statutMatchTV(m:Match,valides:readonly number[]){return valides.includes(m.id)?'Validé':m.score1!==''&&m.score2!==''?'À valider':'À jouer';}
export function appelTV(matchs:Match[],valides:readonly number[],id:number|null){return matchs.find(m=>m.id===id&&statutMatchTV(m,valides)==='À jouer');}

/** A delayed/reopened TV must not sound a stale pause alert. */
export function repriseSonoreDansDelai(maintenant:number,repriseA:number|null):boolean{return repriseA!==null&&Number.isFinite(maintenant)&&Number.isFinite(repriseA)&&maintenant>=repriseA&&maintenant-repriseA<=10000;}

/** Both organizer and TV compute the same slide from one shared clock origin. */
export function pageCouranteTV(reglages:ReglagesTV,maintenant:number):number{
 if(reglages.pause||!reglages.defilement||!reglages.debutDefilement||!Number.isFinite(maintenant))return reglages.pageManuelle;
 const ecoulees=Math.max(0,maintenant-reglages.debutDefilement);
 return reglages.pageManuelle+Math.floor(ecoulees/(reglages.secondes*1000));
}

// Tournament control-room totals (no effect on the scores stored in the tournament).
export function statistiquesTV(matchs:readonly Match[],valides:readonly number[]){
 const stats={total:matchs.length,aJouer:0,aValider:0,valides:0};
 for(const m of matchs){const statut=statutMatchTV(m,valides);
  if(statut==='À jouer')stats.aJouer++;
  else if(statut==='À valider')stats.aValider++;
  else stats.valides++;
 }
 return stats;
}

/** Filter the broadcast only: never modifies the original tournament results. */
export function filtrerMatchsTV(matchs:readonly Match[],valides:readonly number[],filtre:FiltreMatchsTV):Match[]{
 if(filtre==='tous')return [...matchs];
 const attendu=filtre==='aJouer'?'À jouer':filtre==='aValider'?'À valider':'Validé';
 return matchs.filter(m=>statutMatchTV(m,valides)===attendu);
}
