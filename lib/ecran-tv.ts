import type {Match} from '@/types';
export type FiltreMatchsTV='tous'|'aJouer'|'aValider'|'valides';
export type ReglagesTV={secondes:number;pause:boolean;message:string;brouillonAnnonce:string;dureeAnnonce:number;annonceExpireA:number|null;appel:number|null;dureeAppel:number;appelExpireA:number|null;defilement:boolean;repriseA:number|null;afficherSponsors:boolean;pageSponsors:boolean;afficherMatchs:boolean;afficherClassement:boolean;afficherProgression:boolean;filtreMatchs:FiltreMatchsTV;pageManuelle:number;debutDefilement:number};
export const TV_DEFAUT:ReglagesTV={secondes:15,pause:false,message:'',brouillonAnnonce:'',dureeAnnonce:30,annonceExpireA:null,appel:null,dureeAppel:90,appelExpireA:null,defilement:true,repriseA:null,afficherSponsors:true,pageSponsors:false,afficherMatchs:true,afficherClassement:true,afficherProgression:false,filtreMatchs:'tous',pageManuelle:0,debutDefilement:0};
export function normaliserTV(v:unknown):ReglagesTV{
 const o=v&&typeof v==='object'?v as Partial<ReglagesTV>:{};
 return {secondes:typeof o.secondes==='number'&&Number.isFinite(o.secondes)?Math.max(8,Math.min(60,Math.round(o.secondes))):15,pause:o.pause===true,message:typeof o.message==='string'?o.message.slice(0,180):'',brouillonAnnonce:typeof o.brouillonAnnonce==='string'?o.brouillonAnnonce.slice(0,180):typeof o.message==='string'?o.message.slice(0,180):'',dureeAnnonce:[15,30,60,120].includes(o.dureeAnnonce as number)?o.dureeAnnonce as number:30,annonceExpireA:typeof o.annonceExpireA==='number'&&Number.isSafeInteger(o.annonceExpireA)&&o.annonceExpireA>0?o.annonceExpireA:null,appel:typeof o.appel==='number'&&Number.isInteger(o.appel)?o.appel:null,dureeAppel:[30,60,90,120].includes(o.dureeAppel as number)?o.dureeAppel as number:90,appelExpireA:typeof o.appelExpireA==='number'&&Number.isSafeInteger(o.appelExpireA)&&o.appelExpireA>0?o.appelExpireA:null,defilement:o.defilement!==false,repriseA:typeof o.repriseA==='number'&&Number.isFinite(o.repriseA)&&o.repriseA>0?o.repriseA:null,afficherSponsors:o.afficherSponsors!==false,pageSponsors:o.pageSponsors===true,afficherMatchs:o.afficherMatchs!==false,afficherClassement:o.afficherClassement!==false,afficherProgression:o.afficherProgression===true,filtreMatchs:o.filtreMatchs==='aJouer'||o.filtreMatchs==='aValider'||o.filtreMatchs==='valides'?o.filtreMatchs:'tous',pageManuelle:typeof o.pageManuelle==='number'&&Number.isSafeInteger(o.pageManuelle)?Math.max(0,Math.min(1000000,o.pageManuelle)):0,debutDefilement:typeof o.debutDefilement==='number'&&Number.isSafeInteger(o.debutDefilement)&&o.debutDefilement>0?o.debutDefilement:0};
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

// A live TV reports a short-lived local heartbeat; no tournament data is disclosed here.
export type SignalTV={vuA:number;donneesA:number};
export type EtatConnexionTV='connecte'|'actualisationEnRetard'|'deconnecte';
export function etatConnexionTV(signaux:readonly unknown[],maintenant:number):EtatConnexionTV{
 if(!Number.isFinite(maintenant)||maintenant<0)return 'deconnecte';
 let actif=false;
 for(const signal of signaux){
  if(!signal||typeof signal!=='object')continue;
  const s=signal as Partial<SignalTV>;
  if(typeof s.vuA!=='number'||!Number.isFinite(s.vuA)||s.vuA>maintenant+5000||maintenant-s.vuA>15000)continue;
  actif=true;
  if(typeof s.donneesA==='number'&&Number.isFinite(s.donneesA)&&s.donneesA<=maintenant+5000&&maintenant-s.donneesA<=45000)return 'connecte';
 }
 return actif?'actualisationEnRetard':'deconnecte';
}

/** Visible countdown, also valid when the organizer extends a break. */
export function compteAReboursTV(maintenant:number,repriseA:number|null):string|null{
 if(!Number.isFinite(maintenant)||maintenant<=0||repriseA===null||!Number.isFinite(repriseA)||repriseA<=0)return null;
 const secondes=Math.max(0,Math.ceil((repriseA-maintenant)/1000));
 const n=(valeur:number)=>String(valeur).padStart(2,'0');
 return `${n(Math.floor(secondes/3600))}:${n(Math.floor((secondes%3600)/60))}:${n(secondes%60)}`;
}

/** Only actual validated tournament matches count towards public progress. */
export function pourcentageProgressionTV(matchs:readonly Match[],valides:readonly number[]):number{
 if(!matchs.length)return 0;
 const validesSet=new Set(valides);
 const termines=matchs.reduce((total,m)=>total+(validesSet.has(m.id)?1:0),0);
 return Math.min(100,Math.max(0,Math.round(100*termines/matchs.length)));
}
/** The announcement slide comes before a targeted player call. */
export function indexAppelTV(message:string):number{return message?1:0;}

/** Detect expired temporary broadcast actions after background-tab suspension. */
export function actionTVExpiree(maintenant:number,expireA:number|null):boolean{return expireA!==null&&Number.isSafeInteger(expireA)&&expireA>0&&Number.isFinite(maintenant)&&maintenant>=expireA;}
